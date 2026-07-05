import React, { useState, useEffect, useRef } from 'react';
import { saveOrder, useVoucher as applyVoucherToDb } from '../services/db';
import { toast } from '../utils/toast';
import { parseLocationQuery } from '../utils/locationParser';
import { MapPin, Calendar, Clock, ChevronLeft, Search } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MapsGuide from './MapsGuide';

// ─── Haversine distance (km) ──────────────────────────────
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
};

// ─── Compute shipping cost using area and zone rules ───────────────
const computeShipping = (distance, addressString, baseFee, defaultRatePerKm, zones, areas, freeEnabled, freeAreas) => {
  // 0. Check Free Shipping Areas
  if (freeEnabled && freeAreas && freeAreas.length > 0 && addressString) {
    const addrLower = addressString.toLowerCase();
    const matchedFreeArea = freeAreas.find(a => addrLower.includes(a.toLowerCase()));
    if (matchedFreeArea) return 0;
  }

  // 1. Check Area (Kecamatan/Kabupaten) first
  if (areas && areas.length > 0 && addressString) {
    const addrLower = addressString.toLowerCase();
    const matchedArea = areas.find(a => addrLower.includes(a.keyword.toLowerCase()));
    if (matchedArea) return matchedArea.flatRate;
  }

  if (distance === 0) return 0;
  
  // 2. Check Distance Zones
  const sortedZones = [...(zones || [])].sort((a, b) => a.radiusStart - b.radiusStart);
  const matchedZone = sortedZones.find(z => distance >= z.radiusStart && distance < z.radiusEnd);
  
  if (matchedZone) {
    if (matchedZone.type === 'flat') {
      return matchedZone.rate;
    } else {
      const rate = matchedZone.rate || matchedZone.ratePerKm || defaultRatePerKm;
      return Math.round(baseFee + distance * rate);
    }
  }

  // 3. Default Calculation
  return Math.round(baseFee + distance * defaultRatePerKm);
};

const BookingForm = ({ catalog, shops, shippingBaseFee, shippingRatePerKm, shippingZones, shippingAreas, freeShippingEnabled, freeShippingAreas, vouchers, waNumber, shopName, tomtomApiKey, returnTime }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = catalog.find(p => p.id === id);

  const query = window.location.search || location.search || '';
  const parsedQuery = parseLocationQuery(query);
  const selectedVid = parsedQuery.vid;

  const prodVariants = product ? (product.variants && product.variants.length > 0 
    ? product.variants 
    : [{ id: 'default', size: product.size, price: product.price, discountPrice: product.discountPrice, stock: product.stock }]) : [];

  const currentVariant = prodVariants.find(v => v.id === selectedVid) || prodVariants[0] || {};

  const [rentalDate, setRentalDate] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [distance, setDistance] = useState(0);
  const [nearestShop, setNearestShop] = useState(shops?.[0] || null);
  const [customerCoords, setCustomerCoords] = useState(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0, show: false });

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');



  const basePrice = currentVariant.discountPrice || currentVariant.price;
  const shippingFee = computeShipping(distance, address, shippingBaseFee, shippingRatePerKm, shippingZones, shippingAreas, freeShippingEnabled, freeShippingAreas);
  
  let discountAmount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.type === 'nominal') {
      discountAmount = appliedVoucher.value;
    } else if (appliedVoucher.type === 'percent') {
      discountAmount = (basePrice * appliedVoucher.value) / 100;
    }
  }

  const subTotal = basePrice + shippingFee;
  const totalAmount = Math.max(0, subTotal - discountAmount);

  const formatPrice = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const getMinDate = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().slice(0, 16);
  };

  // ─── Find nearest shop from customer coords ─────────────
  const findNearestShop = (lat, lng) => {
    if (!shops || shops.length === 0) return shops?.[0] || null;
    let nearest = shops[0];
    let minDist = haversine(lat, lng, shops[0].lat, shops[0].lng);
    shops.forEach(shop => {
      const d = haversine(lat, lng, shop.lat, shop.lng);
      if (d < minDist) { minDist = d; nearest = shop; }
    });
    return nearest;
  };

  // ─── Fetch driving distance from OSRM ─────────────────────
  const getDrivingDistance = async (lat1, lon1, lat2, lon2) => {
    try {
      // OSRM Public API for driving distance (coordinates are lon,lat)
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        // Return distance in km
        return Number((data.routes[0].distance / 1000).toFixed(2));
      }
    } catch (e) {
      console.error('OSRM API Error:', e);
    }
    // Fallback to haversine if OSRM fails
    return haversine(lat1, lon1, lat2, lon2);
  };

  const updateLocationFromCoords = async (lat, lng, displayAddr) => {
    setIsSearching(true);
    const nearest = findNearestShop(lat, lng);
    setNearestShop(nearest);
    
    // Fetch driving distance
    const dist = await getDrivingDistance(nearest.lat, nearest.lng, lat, lng);
    setDistance(dist);
    setCustomerCoords({ lat, lng });
    if (displayAddr) setAddress(displayAddr);
    setIsSearching(false);
  };

  // ─── Init Leaflet map ───────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !window.L) return;
    const shopLat = shops?.[0]?.lat || -7.797068;
    const shopLng = shops?.[0]?.lng || 110.370529;

    const map = window.L.map(mapRef.current).setView([shopLat, shopLng], 13);
    const TOMTOM_KEY = tomtomApiKey || 'ZGivQglmFeXV1B9a4ZcWOrkcikjY3HqD';
    window.L.tileLayer(`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`, {
      attribution: '© TomTom',
      tileSize: 256
    }).addTo(map);

    // Add shop markers
    (shops || []).forEach(shop => {
      window.L.marker([shop.lat, shop.lng], {
        icon: window.L.divIcon({ className: 'shop-marker-icon', html: '<i class="fa-solid fa-store" style="font-size:20px;color:#e11d48"></i>' })
      }).addTo(map).bindPopup(`<b>${shop.name}</b><br>${shop.address}`);
    });

    const marker = window.L.marker([shopLat, shopLng], { draggable: true }).addTo(map);
    markerRef.current = marker;
    mapInstanceRef.current = map;

    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      try {
        const TOMTOM_KEY = tomtomApiKey || 'ZGivQglmFeXV1B9a4ZcWOrkcikjY3HqD';
        const res = await fetch(`https://api.tomtom.com/search/2/reverseGeocode/${pos.lat},${pos.lng}.json?key=${TOMTOM_KEY}`);
        const data = await res.json();
        const addr = data?.addresses?.[0]?.address?.freeformAddress || `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
        await updateLocationFromCoords(pos.lat, pos.lng, addr);
      } catch {
        await updateLocationFromCoords(pos.lat, pos.lng, `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
      }
    });

    map.on('click', async (e) => {
      marker.setLatLng(e.latlng);
      try {
        const TOMTOM_KEY = tomtomApiKey || 'ZGivQglmFeXV1B9a4ZcWOrkcikjY3HqD';
        const res = await fetch(`https://api.tomtom.com/search/2/reverseGeocode/${e.latlng.lat},${e.latlng.lng}.json?key=${TOMTOM_KEY}`);
        const data = await res.json();
        const addr = data?.addresses?.[0]?.address?.freeformAddress || `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
        await updateLocationFromCoords(e.latlng.lat, e.latlng.lng, addr);
      } catch {
        await updateLocationFromCoords(e.latlng.lat, e.latlng.lng, `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`);
      }
    });

    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  if (!product) {
    return (
      <div className="booking-page animate-fade-in" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <h2>Produk tidak ditemukan</h2>
        <Link to="/" className="btn-secondary mt-3">Kembali ke Katalog</Link>
      </div>
    );
  }

  // ─── Search location & Autocomplete ─────────────────────
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Google Maps Short URL Check
    if (val.includes('maps.app.goo.gl') || val.includes('goo.gl/maps')) {
      toast.warning('Sistem mendeteksi URL pendek Google Maps. Mohon copy-paste Titik Koordinat (Angka) dari Google Maps untuk akurasi terbaik.');
      setShowSuggestions(false);
      return;
    }

    // Google Maps Long URL Check
    const gmapsLongRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    if (val.match(gmapsLongRegex)) {
      setShowSuggestions(false);
      return;
    }

    // Check if it's a coordinate
    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(val.trim())) {
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const TOMTOM_KEY = tomtomApiKey || 'ZGivQglmFeXV1B9a4ZcWOrkcikjY3HqD';
        const res = await fetch(`https://api.tomtom.com/search/2/search/${encodeURIComponent(val)}.json?key=${TOMTOM_KEY}&countrySet=ID&limit=5`);
        const data = await res.json();
        if (data?.results) {
          setSuggestions(data.results);
          setShowSuggestions(true);
        }
      } catch (e) {
        console.error(e);
      }
    }, 500);
  };

  const handleSelectSuggestion = async (result) => {
    const newLat = result.position.lat;
    const newLng = result.position.lon;
    const display_name = result.address.freeformAddress;
    
    setSearchQuery(display_name);
    setShowSuggestions(false);
    
    mapInstanceRef.current?.setView([newLat, newLng], 15);
    markerRef.current?.setLatLng([newLat, newLng]);
    await updateLocationFromCoords(newLat, newLng, display_name);
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setShowSuggestions(false);
    setIsSearching(true);
    const val = searchQuery.trim();
    const TOMTOM_KEY = tomtomApiKey || 'ZGivQglmFeXV1B9a4ZcWOrkcikjY3HqD';

    try {
      const { lat, lng, address } = await parseLocationQuery(val, TOMTOM_KEY);
      mapInstanceRef.current?.setView([lat, lng], 15);
      markerRef.current?.setLatLng([lat, lng]);
      await updateLocationFromCoords(lat, lng, address);
      setIsSearching(false);
      return;
    } catch (err) {
      if (err.message.includes('pendek Google Maps')) {
        toast.warning(err.message);
        setIsSearching(false);
        return;
      }
      // If parsing fails for other reasons, fall through to text search
    }

    try {
      const res = await fetch(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(val)}.json?key=${TOMTOM_KEY}&limit=1&countrySet=ID`);
      const data = await res.json();
      if (data?.results?.length > 0) {
        await handleSelectSuggestion(data.results[0]);
      } else toast.error('Lokasi tidak ditemukan. Coba nama yang lebih spesifik.');
    } catch { toast.error('Gagal mencari lokasi.'); }
    finally { setIsSearching(false); }
  };

  // ─── Get Current Location ─────────────────────────────────
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('Browser Anda tidak mendukung fitur lokasi.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        mapInstanceRef.current?.setView([lat, lng], 16);
        markerRef.current?.setLatLng([lat, lng]);
        try {
          const TOMTOM_KEY = tomtomApiKey || 'ZGivQglmFeXV1B9a4ZcWOrkcikjY3HqD';
          const res = await fetch(`https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_KEY}`);
          const data = await res.json();
          const addr = data?.addresses?.[0]?.address?.freeformAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          await updateLocationFromCoords(lat, lng, addr);
        } catch {
          await updateLocationFromCoords(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        toast.error('Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan.');
      },
      { enableHighAccuracy: true }
    );
  };

  // ─── Image Zoom Hover Effect ──────────────────────────────
  const handleMouseMove = (e) => {
    // Only apply hover zoom on desktop to avoid weird behavior on mobile touch
    if (window.innerWidth < 768) return; 
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y, show: true });
  };

  const handleMouseLeave = () => {
    setZoomPos({ ...zoomPos, show: false });
  };

  // ─── Generate order code ────────────────────────────────
  const generateOrderCode = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = Math.random().toString(36).toUpperCase().slice(2, 6);
    return `AGR-${datePart}-${randPart}`;
  };

  // ─── Build WA message ───────────────────────────────────
  const buildWaMessage = (orderCode) => {
    let formattedDate = rentalDate;
    if (rentalDate) {
      const d = new Date(rentalDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':') + ' WIB';
      }
    }

    const storeName = shopName || 'AcrilyGrad';
    const matLabel = product.materialLabel || 'Papan Akrilik Premium';
    const matQuality = product.materialQuality || 'Akrilik premium berkualitas tinggi.';
    const retTime = returnTime || '16.00';

    const lines = [
      `🧾 *PESANAN BARU - ${storeName}*`,
      `📋 Kode Pesanan: #${orderCode}`,
      ``,
      `🖼 *DETAIL PRODUK*`,
      `• Nama Produk    : ${product.name}`,
      `• Label Material : ${matLabel}`,
      `• Kualitas       : ${matQuality}`,
      `• Ukuran         : ${currentVariant.size}`,
      `• Harga Sewa     : ${currentVariant.discountPrice ? `${formatPrice(currentVariant.discountPrice)} (Promo)` : formatPrice(currentVariant.price)}`,
      ``,
      `✍ *DETAIL TULISAN*`,
      `• Nama & Gelar  : ${recipientName}`,
      `• Ucapan        : ${message || '-'}`,
      `• Dari          : ${senderName || '-'}`,
      ``,
      `📅 *TANGGAL ACARA*`,
      `• ${formattedDate}`,
      ``,
      `🚚 *PENGIRIMAN*`,
      `• Alamat  : ${address}`,
      `• Jarak   : ${distance} km`,
      `• Ongkir  : ${distance === 0 ? 'Gratis (Ambil di Toko)' : formatPrice(shippingFee)}`,
      ``,
      `💰 *TOTAL PEMBAYARAN*`,
      `• Sewa    : ${currentVariant.discountPrice ? `${formatPrice(currentVariant.discountPrice)} (Promo)` : formatPrice(currentVariant.price)}`,
      `• Ongkir  : ${distance === 0 ? 'Rp 0 (Ambil)' : formatPrice(shippingFee)}`,
      ...(appliedVoucher ? [`• Diskon (${appliedVoucher.code}) : -${formatPrice(discountAmount)}`] : []),
      `• ──────────────────────`,
      `• TOTAL   : ${formatPrice(totalAmount)}`,
      ``,
      `⏰ *Pengembalian maksimal pukul ${retTime} WIB di hari yang sama.*`,
      ``,
      `Mohon konfirmasi & lakukan pembayaran.`,
      `Terima kasih sudah memesan di ${storeName}! 🎓`
    ];
    return encodeURIComponent(lines.join('\n'));
  };

  // ─── Handle apply voucher ────────────────────────────────
  const handleApplyVoucher = () => {
    setVoucherError('');
    if (!voucherCode.trim()) return;
    
    const v = (vouchers || []).find(x => x.code === voucherCode.trim().toUpperCase());
    if (!v) {
      setVoucherError('Kode voucher tidak valid atau tidak ditemukan.');
      setAppliedVoucher(null);
      return;
    }
    if (!v.active) {
      setVoucherError('Voucher sudah tidak aktif.');
      setAppliedVoucher(null);
      return;
    }
    if (v.quota <= 0) {
      setVoucherError('Kuota voucher sudah habis.');
      setAppliedVoucher(null);
      return;
    }
    if (v.expiryDate && new Date(v.expiryDate) < new Date()) {
      setVoucherError('Voucher sudah kedaluwarsa.');
      setAppliedVoucher(null);
      return;
    }
    
    setAppliedVoucher(v);
    toast.success('Voucher berhasil digunakan!');
  };

  // ─── Handle checkout ────────────────────────────────────
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!rentalDate) { toast.warning('Pilih tanggal acara terlebih dahulu.'); return; }
    if (!recipientName.trim()) { toast.warning('Masukkan nama penerima & gelar.'); return; }
    if (!address) { toast.warning('Pilih lokasi pengiriman di peta.'); return; }

    if (appliedVoucher) {
      await applyVoucherToDb(appliedVoucher.code);
    }

    const orderCode = generateOrderCode();

    // Save to DB so admin can see it
    try {
      await saveOrder({
        id: orderCode,
        productId: product.id,
        variantId: currentVariant.id,
        boardName: product.name,
        variantSize: currentVariant.size,
        recipientName,
        message,
        senderName,
        rentalDate,
        address,
        distance,
        shippingFee,
        discountCode: appliedVoucher?.code || null,
        discountAmount,
        totalAmount,
        status: 'Pending',
        stockDeducted: false,
        stockRestored: false,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to save order:', err);
    }

    const wa = waNumber || '6281234567890';
    const msg = buildWaMessage(orderCode);
    window.open(`https://wa.me/${wa}?text=${msg}`, '_blank');
  };

  return (
    <div className="booking-page animate-fade-in">
      <button className="booking-back-btn" onClick={() => navigate(-1)}>
        <ChevronLeft size={16} /> Kembali ke Detail Produk
      </button>

      <div className="booking-layout">
        {/* Product mini-card */}
        <div className="booking-product-summary">
          <div 
            className="bps-img" 
            onClick={() => setIsImageZoomed(true)} 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: 'zoom-in', position: 'relative' }}
          >
            {(product.images?.[product.mainImageIndex || 0] || product.image)
              ? (
                <>
                  <img 
                    src={product.images?.[product.mainImageIndex || 0] || product.image} 
                    alt={product.name} 
                    style={{ opacity: zoomPos.show ? 0 : 1 }}
                  />
                  {zoomPos.show && (
                    <div 
                      style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundImage: `url(${product.images?.[product.mainImageIndex || 0] || product.image})`,
                        backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                        backgroundSize: '250%',
                        backgroundRepeat: 'no-repeat',
                        pointerEvents: 'none',
                        borderRadius: '14px',
                        transition: 'opacity 0.2s'
                      }}
                    />
                  )}
                </>
              )
              : <i className="fa-solid fa-image"></i>}
          </div>
          <div className="bps-info">
            <h3>{product.name}</h3>
            <span>{currentVariant.size}</span>
            <strong>{formatPrice(currentVariant.discountPrice || currentVariant.price)}/hari</strong>
          </div>
        </div>

        {/* Main form */}
        <div className="booking-form-card">
          <div className="form-header">
            <h2><i className="fa-solid fa-pen-nib"></i> Detail Pesanan</h2>
            <p>Lengkapi informasi di bawah untuk memesan via WhatsApp.</p>
          </div>

          <form onSubmit={handleCheckout} className="form-body">



            {/* Nama penerima */}
            <div className="form-group">
              <label className="form-label">Nama Penerima Lengkap & Gelar</label>
              <input type="text" className="form-input" placeholder="Cth: Clara Adinda, S.T., M.Kom" value={recipientName} onChange={e => setRecipientName(e.target.value)} required />
            </div>

            {/* Ucapan */}
            <div className="form-group">
              <label className="form-label">Pesan / Ucapan Kustom</label>
              <textarea className="form-input textarea-input" rows={3} maxLength={200} placeholder="Cth: Selamat ya! Semoga sukses selalu di langkah barumu." value={message} onChange={e => setMessage(e.target.value)} />
              <span className="char-counter">{message.length}/200</span>
            </div>

            {/* Pengirim */}
            <div className="form-group">
              <label className="form-label">Dari / Nama Pengirim</label>
              <input type="text" className="form-input" placeholder="Cth: Keluarga Besar, Teman-temanmu" value={senderName} onChange={e => setSenderName(e.target.value)} />
            </div>

            {/* Peta */}
            <div className="form-group">
              <label className="form-label"><MapPin size={14} className="label-icon" /> Lokasi Pengiriman</label>
              <div className="map-search-wrapper" style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '200px', position: 'relative' }}>
                  <input type="text" className="form-input search-input" placeholder="Cari alamat, atau paste Plus Code/Koordinat Google Maps..." value={searchQuery} onChange={handleQueryChange} onKeyDown={e => e.key === 'Enter' && handleSearch(e)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} onFocus={() => suggestions.length > 0 && setShowSuggestions(true)} />
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="suggestions-dropdown" style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, 
                      backgroundColor: 'white', border: '1px solid #ddd', 
                      borderRadius: '6px', zIndex: 1000, margin: '4px 0 0 0', padding: 0, 
                      listStyle: 'none', maxHeight: '200px', overflowY: 'auto',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      {suggestions.map((s, idx) => (
                        <li key={idx} 
                            style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: idx === suggestions.length - 1 ? 'none' : '1px solid #eee' }}
                            onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s); }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fdf2f8'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <div style={{ fontWeight: '500', fontSize: '13px', color: '#1f2937' }}>{s.address.freeformAddress}</div>
                          {s.address.municipality && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{s.address.municipality}</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" className="btn-secondary search-btn" onClick={handleSearch} disabled={isSearching} style={{ whiteSpace: 'nowrap' }}>
                    <Search size={15} /> {isSearching ? '...' : 'Cari'}
                  </button>
                </div>
                <button type="button" className="btn-secondary location-btn" onClick={handleGetCurrentLocation} disabled={isLocating} style={{ whiteSpace: 'nowrap' }}>
                  <MapPin size={15} /> {isLocating ? 'Mencari...' : 'Lokasi Saya'}
                </button>
              </div>
              <MapsGuide />
              <div className="map-container-wrapper">
                <div id="booking-map" ref={mapRef} className="leaflet-map-element"></div>
              </div>
              <span className="map-instruction">Klik peta atau geser pin untuk menentukan lokasi pengiriman.</span>
            </div>

            {/* Alamat */}
            {address && (
              <div className="form-group address-display animate-fade-in">
                <label className="form-label">Alamat Terpilih:</label>
                <div className="address-box-content">
                  <i className="fa-solid fa-location-dot"></i>
                  <div>
                    <p>{address}</p>
                    <span className="dist-badge"><i className="fa-solid fa-road"></i> {distance} km</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tanggal */}
            <div className="form-group">
              <label className="form-label"><Calendar size={14} className="label-icon" /> Tanggal & Waktu Acara</label>
              <input type="datetime-local" className="form-input custom-datetime-input" min={getMinDate()} value={rentalDate} onChange={e => setRentalDate(e.target.value)} required />
              <div className="alert-box warning-alert mt-2">
                <Clock size={13} className="alert-icon" />
                <span><strong>Penting:</strong> Pengembalian papan maksimal pukul <strong>{returnTime || '16.00'} WIB</strong> di hari yang sama.</span>
              </div>
            </div>

            {/* Voucher / Promo */}
            <div className="form-group">
              <label className="form-label"><i className="fa-solid fa-ticket label-icon"></i> Kode Voucher / Promo</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Masukkan kode promo..." 
                  value={voucherCode} 
                  onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                  disabled={appliedVoucher !== null}
                  style={{ textTransform: 'uppercase' }}
                />
                {!appliedVoucher ? (
                  <button type="button" className="btn-secondary" onClick={handleApplyVoucher} style={{ whiteSpace: 'nowrap' }}>Terapkan</button>
                ) : (
                  <button type="button" className="btn-secondary" onClick={() => { setAppliedVoucher(null); setVoucherCode(''); }} style={{ whiteSpace: 'nowrap', background: '#ef4444', color: 'white', borderColor: '#ef4444' }}>Hapus</button>
                )}
              </div>
              {voucherError && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>{voucherError}</div>}
              {appliedVoucher && <div style={{ color: '#10b981', fontSize: '13px', marginTop: '4px' }}><i className="fa-solid fa-circle-check"></i> Voucher <b>{appliedVoucher.code}</b> diterapkan!</div>}
            </div>

            {/* Pricing */}
            <div className="pricing-summary-card">
              <h3><i className="fa-solid fa-receipt"></i> Rincian Pembayaran</h3>
              <div className="price-row">
                <span>Sewa Papan ({product.name}):</span>
                <span>{currentVariant.discountPrice ? (
                  <span style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                    <span style={{textDecoration:'line-through', fontSize:'0.8rem', color:'#9ca3af', marginBottom:'-2px'}}>{formatPrice(currentVariant.price)}</span>
                    {formatPrice(currentVariant.discountPrice)}
                  </span>
                ) : formatPrice(currentVariant.price)}</span>
              </div>
              <div className="price-row">
                <span>Ongkos Kirim ({distance} km):</span>
                <span>{distance === 0 ? 'Gratis (Ambil di Toko)' : formatPrice(shippingFee)}</span>
              </div>
              {appliedVoucher && (
                <div className="price-row" style={{ color: '#10b981' }}>
                  <span>Diskon Promo ({appliedVoucher.code}):</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="price-row total-row">
                <span>Total Bayar:</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </div>

            <button type="submit" className="btn-wa-checkout mt-4">
              <i className="fa-brands fa-whatsapp"></i>
              <span>Pesan via WhatsApp</span>
            </button>
            <p className="wa-note">Kamu akan diarahkan ke WhatsApp. Pembayaran dikonfirmasi langsung bersama admin.</p>
          </form>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {isImageZoomed && (
        <div className="image-zoom-modal" onClick={() => setIsImageZoomed(false)}>
          <div className="image-zoom-content" onClick={e => e.stopPropagation()}>
            <button className="close-zoom-btn" onClick={() => setIsImageZoomed(false)}><i className="fa-solid fa-xmark"></i></button>
            <img src={product.images?.[product.mainImageIndex || 0] || product.image} alt={product.name} />
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingForm;
