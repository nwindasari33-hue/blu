import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  saveCatalogItem,
  deleteCatalogItem,
  saveFont,
  deleteFont,
  saveSettingItem,
  saveOrder,
  deleteOrder,
  adjustVariantStock
} from '../services/db';
import { toast, confirmDialog } from '../utils/toast';
import { parseLocationQuery } from '../utils/locationParser';
import AdminLogin from './AdminLogin';
import AdminBlog from './AdminBlog';
import '../App.css';
// ─────────────────────────────────────────────────────────
//  Helper: format rupiah
// ─────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

// ─────────────────────────────────────────────────────────
//  SHIPPING helpers
// ─────────────────────────────────────────────────────────
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
};

// ─────────────────────────────────────────────────────────
//  EMPTY state for a new product
// ─────────────────────────────────────────────────────────
const emptyProduct = () => ({
  name: '', 
  variants: [{ id: Date.now().toString(), size: 'A2 (42 x 59.4 cm)', price: 75000, discountPrice: '', stock: 5 }],
  categoryId: '', description: '', badge: '',
  materialLabel: 'Papan Akrilik Premium',
  materialQuality: 'Akrilik premium berkualitas tinggi.',
  images: [], mainImageIndex: 0
});

// ─────────────────────────────────────────────────────────
//  ORDER STATUS COLORS & LABELS
// ─────────────────────────────────────────────────────────
const ORDER_STATUSES = ['Pending', 'Dikonfirmasi', 'Dalam Pengiriman', 'Selesai', 'Dibatalkan'];
const STATUS_COLOR = {
  Pending: '#f59e0b', Dikonfirmasi: '#3b82f6',
  'Dalam Pengiriman': '#8b5cf6', Selesai: '#22c55e', Dibatalkan: '#ef4444'
};

// ═════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════
const AdminDashboard = ({ catalog, orders, customFonts, settings, onRefreshData, onUpdateOrderStatus }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem('isAdminLoggedIn') === 'true'
  );

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminLoggedIn');
    setIsAuthenticated(false);
  };

  // ─────────────────────────────────────────────────────
  //  TAB CONFIG
  // ─────────────────────────────────────────────────────
  const pendingCountForBadge = orders.filter(o => o.status === 'Pending').length;
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-bar' },
    { id: 'products', label: 'Produk', icon: 'fa-box' },
    { id: 'categories', label: 'Kategori', icon: 'fa-tags' },
    { id: 'orders', label: 'Pesanan', icon: 'fa-clipboard-list', badge: pendingCountForBadge },
    { id: 'blog', label: 'Manajemen Blog', icon: 'fa-pen-nib' },
    { id: 'shipping', label: 'Pengiriman', icon: 'fa-truck' },
    { id: 'vouchers', label: 'Promo & Voucher', icon: 'fa-ticket' },
    { id: 'hero', label: 'Hero & Banner', icon: 'fa-image' },
    { id: 'seo', label: 'SEO Settings', icon: 'fa-magnifying-glass' },
    { id: 'mapsguide', label: 'Panduan', icon: 'fa-map-location-dot' },
    { id: 'gallery', label: 'Galeri', icon: 'fa-images' },
    { id: 'settings', label: 'Pengaturan', icon: 'fa-gear' },
    { id: 'footer', label: 'Footer', icon: 'fa-layer-group' },
    { id: 'fonts', label: 'Desain (Font)', icon: 'fa-font' },
    { id: 'faq', label: 'FAQ', icon: 'fa-circle-question' },
    { id: 'account', label: 'Akun Admin', icon: 'fa-user-shield' },
  ];

  const pathParts = location.pathname.split('/');
  const routeTab = pathParts[2] || 'dashboard';
  const activeTab = tabs.find(t => t.id === routeTab) ? routeTab : 'dashboard';

  const handleTabClick = (tabId) => {
    navigate(`/admin/${tabId}`);
  };

  // ── Catalog ──────────────────────────────────────────
  const [isProductFormVisible, setIsProductFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodForm, setProdForm] = useState(emptyProduct());
  const [prodImgPreviews, setProdImgPreviews] = useState([]);

  // ── Orders ───────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderFilter, setOrderFilter] = useState('all');

  // ── Font ─────────────────────────────────────────────
  const [newFontName, setNewFontName] = useState('');
  const [isFontUploading, setIsFontUploading] = useState(false);

  // ── Shipping Settings ─────────────────────────────────
  const defaultShops = settings.shops || [
    { id: 1, name: 'Toko Utama', address: '', lat: -7.792480, lng: 110.365655 },
    { id: 2, name: 'Toko Cabang', address: '', lat: -7.762690, lng: 110.381690 }
  ];
  const [shops, setShops] = useState(defaultShops);
  const [baseFee, setBaseFee] = useState(settings.shippingBaseFee || 5000);
  const [defaultRate, setDefaultRate] = useState(settings.shippingRatePerKm || 3000);
  const [zones, setZones] = useState(settings.shippingZones || [
    { id: 'zone-1', name: 'Dalam Kota', radiusStart: 0, radiusEnd: 5, type: 'per_km', rate: 2000 },
    { id: 'zone-2', name: 'Pinggiran Kota', radiusStart: 5, radiusEnd: 15, type: 'per_km', rate: 4000 },
    { id: 'zone-3', name: 'Luar Kota', radiusStart: 15, radiusEnd: 999, type: 'per_km', rate: 6000 }
  ]);
  const [newZone, setNewZone] = useState({ name: '', radiusStart: 0, radiusEnd: 0, type: 'per_km', rate: 0 });

  const [areas, setAreas] = useState(settings.shippingAreas || []);
  const [newArea, setNewArea] = useState({ name: '', keyword: '', flatRate: 0 });

  const [freeShippingEnabled, setFreeShippingEnabled] = useState(settings.freeShippingEnabled || false);
  const [freeShippingAreas, setFreeShippingAreas] = useState(settings.freeShippingAreas || []);
  const [newFreeShippingArea, setNewFreeShippingArea] = useState('');

  // ── Categories ───────────────────────────────────────
  const [categories, setCategories] = useState(settings.categories || []);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: '' });

  // ── Vouchers ─────────────────────────────────────────
  const [vouchers, setVouchers] = useState(settings.vouchers || []);
  const [voucherForm, setVoucherForm] = useState({
    code: '', type: 'nominal', value: '', quota: '', expiryDate: '', active: true
  });

  // ── General Settings ──────────────────────────────────
  const [faqs, setFaqs] = useState(settings.faqs || []);
  const [editingFaq, setEditingFaq] = useState(null);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' });
  
  const [shopName, setShopName] = useState(settings.shopName || 'AcrilyGrad');
  const [catalogHeading, setCatalogHeading] = useState(settings.catalogHeading || 'Pilih Papan Favoritmu');
  const [logoImage, setLogoImage] = useState(settings.logoImage || '');
  const [faviconImage, setFaviconImage] = useState(settings.faviconImage || '');
  const [waNumber, setWaNumber] = useState(settings.waNumber || '');
  const [availableSizes, setAvailableSizes] = useState(settings.availableSizes || '');
  const [storePolicy, setStorePolicy] = useState(settings.storePolicy || '');
  const [returnTime, setReturnTime] = useState(settings.returnTime || '16.00');
  const [storeHours, setStoreHours] = useState(settings.storeHours || '');
  const [tomtomApiKey, setTomtomApiKey] = useState(settings.tomtomApiKey || '');

  // ── Hero & Banner Settings ──────────────────────────
  const [heroMode, setHeroMode] = useState(settings.heroMode || 'text');
  const [heroChip, setHeroChip] = useState(settings.heroChip || 'Terpercaya & Estetik');
  const [heroTitle, setHeroTitle] = useState(settings.heroTitle || 'Sewa Papan Akrilik Wisuda');
  const [heroDesc, setHeroDesc] = useState(settings.heroDesc || 'Rayakan momen wisuda dengan papan akrilik cantik & elegan. Harga terjangkau, kualitas premium, kirim ke lokasi kamu.');
  const [heroBanners, setHeroBanners] = useState(settings.heroBanners || []);
  const [bannerInput, setBannerInput] = useState('');

  // ── SEO Settings ──────────────────────────────────────
  const [seoTitle, setSeoTitle] = useState(settings.seoTitle || 'Sewa Papan Akrilik Wisuda Murah & Estetik | AcrilyGrad');
  const [seoDesc, setSeoDesc] = useState(settings.seoDesc || 'Sewa papan akrilik wisuda cantik dan murah. Tersedia berbagai ukuran dan desain elegan. Pengiriman ke seluruh wilayah.');
  const [seoKeywords, setSeoKeywords] = useState(settings.seoKeywords || 'sewa papan akrilik wisuda, papan akrilik wisuda murah, papan wisuda estetik, kado wisuda akrilik, sewa papan wisuda');
  const [seoOgImage, setSeoOgImage] = useState(settings.seoOgImage || '');
  const [seoContent, setSeoContent] = useState(settings.seoContent || '');

  const [footerTagline, setFooterTagline] = useState(settings.footerTagline || 'Hadirkan momen wisuda yang tak terlupakan dengan sentuhan elegan.');
  const [footerTrustBadge1, setFooterTrustBadge1] = useState(settings.footerTrustBadge1 || '');
  const [footerTrustBadge2, setFooterTrustBadge2] = useState(settings.footerTrustBadge2 || '');
  const [footerTrustBadge3, setFooterTrustBadge3] = useState(settings.footerTrustBadge3 || '');
  const [footerInstagram, setFooterInstagram] = useState(settings.footerInstagram || '');
  const [footerTiktok, setFooterTiktok] = useState(settings.footerTiktok || '');
  const [footerFacebook, setFooterFacebook] = useState(settings.footerFacebook || '');
  const [footerCopyright, setFooterCopyright] = useState(settings.footerCopyright || '© 2025 AcrilyGrad. Semua hak dilindungi.');
  const [footerHowToOrder, setFooterHowToOrder] = useState(settings.footerHowToOrder || '1. Pilih produk di katalog.\n2. Klik Pesan Sekarang.\n3. Isi formulir pengiriman.\n4. Selesaikan pembayaran via WhatsApp.');
  const [footerContactUs, setFooterContactUs] = useState(settings.footerContactUs || 'Anda dapat menghubungi kami melalui:\n- WhatsApp: [NOMOR_WA]\n- Email: admin@acrilygrad.com\n- Alamat Toko Utama');

  // ── Account Settings ───────────────────────────────────
  const [adminUsername, setAdminUsername] = useState(settings.adminUsername || 'admin');
  const [adminPassword, setAdminPassword] = useState(settings.adminPassword || 'admin123');
  const [oldPassword, setOldPassword] = useState('');
  
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    const currentPass = settings.adminPassword || 'admin123';
    if (oldPassword !== currentPass) {
      toast.error('Sandi lama salah!');
      return;
    }
    try {
      await saveSettingItem('adminUsername', adminUsername);
      await saveSettingItem('adminPassword', adminPassword);
      toast.success('Kredensial admin berhasil diperbarui!');
      setOldPassword('');
      onRefreshData();
    } catch (err) {
      toast.error('Gagal menyimpan kredensial admin.');
    }
  };

  // ── Maps Guide Settings ──────────────────────────────
  const defaultMapsGuide = [
    {
      id: 'android', label: 'Android',
      steps: [
        { title: 'Buka Google Maps', desc: 'Cari dan buka aplikasi Google Maps di HP Android Anda. Pastikan GPS/Lokasi sudah menyala.' },
        { title: 'Cari Lokasi Tujuan', desc: 'Ketik nama gedung, jalan, atau daerah tempat acara wisuda Anda berlangsung di kolom pencarian bagian atas, lalu pilih hasil yang paling sesuai.' },
        { title: 'Tekan & Tahan Titik Lokasi Secara Presisi', desc: 'Jika titik lokasi masih kurang tepat (misal: gerbangnya di sebelah barat), geser peta dan tekan agak lama (long-press) tepat pada titik lokasi yang Anda inginkan hingga muncul pin penanda berwarna merah (Dropped Pin).' },
        { title: 'Buka Detail Lokasi', desc: 'Perhatikan panel berwarna putih yang muncul di bagian paling bawah layar ponsel Anda ("Membubuhkan pin"). Sentuh atau tarik panel tersebut ke arah atas untuk melihat informasi detail.' },
        { title: 'Cari Ikon Plus Code & Salin', desc: 'Gulir sedikit ke bawah hingga Anda melihat ikon berbentuk titik-titik biru kotak (seperti kode QR) bersebelahan dengan teks aneh (Contoh: "2Q2W+JM Pekauman..."). Itulah Plus Code! Sentuh teks tersebut sekali, lalu akan muncul tulisan "Kode Plus disalin ke papan klip".' },
        { title: 'Selesai! Tempel di Kolom Pencarian Web Ini', desc: 'Kembali ke website penyewaan ini. Tempel (Paste) kode yang baru saja Anda salin ke dalam kolom pencarian alamat di atas, lalu klik tombol "Cari". Pin peta kami akan otomatis berpindah 100% presisi ke titik Anda!' }
      ]
    },
    {
      id: 'iphone', label: 'iPhone',
      steps: [
        { title: 'Buka Google Maps', desc: 'Buka aplikasi Google Maps di iPhone Anda. (Jika Anda menggunakan Apple Maps, mohon beralih ke Google Maps terlebih dahulu).' },
        { title: 'Tentukan Titik Tujuan', desc: 'Ketikkan nama alamat acara Anda di kolom pencarian atas. Anda juga bisa langsung menggeser peta ke lokasi tujuan.' },
        { title: 'Jatuhkan Pin Penanda', desc: 'Tekan dan tahan (long-press) jari Anda pada titik pengiriman yang paling tepat di layar peta. Sebuah pin merah berlabel "Dropped Pin" akan muncul di layar.' },
        { title: 'Geser Panel ke Atas', desc: 'Di layar bagian bawah, akan muncul kotak "Membubuhkan pin" atau "Dropped Pin". Usap (swipe) kotak putih tersebut ke atas untuk membuka detail selengkapnya.' },
        { title: 'Temukan Plus Code', desc: 'Cari baris yang memiliki ikon titik-titik biru melingkar (di bawah koordinat/alamat). Di sebelahnya terdapat teks Plus Code (Misal: "2Q2W+JM Pekauman..."). Sentuh teks tersebut, dan iPhone Anda akan langsung menyalinnya secara otomatis.' },
        { title: 'Tempel Kembali ke Web Ini', desc: 'Kembali ke browser (Safari/Chrome) yang membuka web penyewaan ini. Tempel (Paste) kode tersebut ke dalam kolom pencarian alamat di atas lalu klik "Cari". Lokasi Anda berhasil dikunci!' }
      ]
    },
    {
      id: 'desktop', label: 'Desktop',
      steps: [
        { title: 'Buka Google Maps di Browser', desc: 'Buka tab baru di browser Anda (Chrome, Edge, Safari) lalu kunjungi alamat: maps.google.com' },
        { title: 'Cari Lokasi Tujuan', desc: 'Ketik alamat atau nama gedung tempat Anda berada pada kotak penelusuran di pojok kiri atas layar, lalu Enter.' },
        { title: 'Klik Kanan Tepat di Titik Lokasi', desc: 'Gunakan kursor mouse Anda untuk menunjuk titik pengiriman yang paling akurat di peta (misal: tepat di depan pintu gerbang). Lalu, klik kanan (right-click) mouse Anda.' },
        { title: 'Klik Angka Koordinat', desc: 'Sebuah menu klik-kanan akan muncul. Di baris paling atas menu tersebut, Anda akan melihat deretan angka koordinat (misal: -7.99843, 113.79668). Klik kiri tepat di angka tersebut, dan angka tersebut akan langsung tersalin!' },
        { title: 'Tempel di Kolom Pencarian Web Ini', desc: 'Kembali ke halaman web penyewaan ini. Tempel kode yang baru Anda salin tersebut (dengan menekan Ctrl+V atau klik kanan -> Paste) ke dalam kolom pencarian alamat, lalu klik tombol "Cari". Selesai!' }
      ]
    }
  ];

  const initialMapsGuide = settings.mapsGuideTabs && settings.mapsGuideTabs[0] && settings.mapsGuideTabs[0].steps && settings.mapsGuideTabs[0].steps.length > 0 
    ? settings.mapsGuideTabs 
    : defaultMapsGuide;

  const [mapsGuideTabs, setMapsGuideTabs] = useState(initialMapsGuide);
  const [activeMapsTabId, setActiveMapsTabId] = useState('android');
  const [mapsVideoUrl, setMapsVideoUrl] = useState(settings.mapsVideoUrl || '');

  // ── Gallery ────────────────────────────────────────
  const [galleryPhotos, setGalleryPhotos] = useState(settings.galleryPhotos || []);
  const [galleryEnabled, setGalleryEnabled] = useState(settings.galleryEnabled ?? false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');

  // ── KPIs ─────────────────────────────────────────────
  const totalRevenue = orders.filter(o => o.status === 'Selesai').reduce((s, o) => s + (o.totalAmount || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'Pending').length;
  const thisMonth = orders.filter(o => {
    const d = new Date(o.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const lowStockProducts = catalog.filter(p => (p.stock ?? 99) <= 2);

  // ─────────────────────────────────────────────────────
  //  PRODUCT HANDLERS
  // ─────────────────────────────────────────────────────
  const handleProductField = (field, val) => setProdForm(f => ({ ...f, [field]: val }));

  const handleImagesUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 5 - (prodForm.images?.length || 0));
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProdForm(f => ({
          ...f,
          images: [...(f.images || []), reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (idx) => {
    setProdForm(f => {
      const imgs = f.images.filter((_, i) => i !== idx);
      return { ...f, images: imgs, mainImageIndex: Math.min(f.mainImageIndex || 0, imgs.length - 1) };
    });
  };

  const handleVariantChange = (idx, field, val) => {
    setProdForm(f => {
      const newVariants = [...f.variants];
      newVariants[idx][field] = val;
      return { ...f, variants: newVariants };
    });
  };

  const handleAddVariant = () => {
    setProdForm(f => ({
      ...f,
      variants: [...f.variants, { id: Date.now().toString(), size: '', price: 0, discountPrice: '', stock: 0 }]
    }));
  };

  const handleRemoveVariant = (idx) => {
    setProdForm(f => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== idx)
    }));
  };

  const handleEditProduct = (prod) => {
    setEditingProduct(prod);
    
    let prodVariants = prod.variants;
    if (!prodVariants || prodVariants.length === 0) {
      // Fallback for old data
      prodVariants = [{
        id: Date.now().toString(),
        size: prod.size || 'A2 (42 x 59.4 cm)',
        price: prod.price || 75000,
        discountPrice: prod.discountPrice || '',
        stock: prod.stock ?? 5
      }];
    }

    setProdForm({
      name: prod.name || '',
      variants: prodVariants,
      categoryId: prod.categoryId || '',
      description: prod.description || '',
      badge: prod.badge || '',
      materialLabel: prod.materialLabel || 'Papan Akrilik Premium',
      materialQuality: prod.materialQuality || 'Akrilik premium berkualitas tinggi.',
      images: prod.images || (prod.image ? [prod.image] : []),
      mainImageIndex: prod.mainImageIndex || 0
    });
    setIsProductFormVisible(true);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setProdForm(emptyProduct());
    setIsProductFormVisible(false);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!prodForm.name.trim()) { toast.warning('Nama produk harus diisi.'); return; }

    const payload = {
      id: editingProduct ? editingProduct.id : 'acrylic-' + Date.now(),
      ...prodForm,
      // Backward compat: keep `image` = first image
      image: prodForm.images?.[prodForm.mainImageIndex || 0] || null
    };

    try {
      await saveCatalogItem(payload);
      toast.success('Produk berhasil disimpan!');
      setEditingProduct(null);
      setProdForm(emptyProduct());
      setIsProductFormVisible(false);
      onRefreshData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan produk.');
    }
  };

  const handleDeleteProduct = async (id) => {
    const confirmed = await confirmDialog('Hapus produk ini?');
    if (!confirmed) return;
    await deleteCatalogItem(id);
    onRefreshData();
  };

  // ─────────────────────────────────────────────────────
  //  FONT HANDLERS
  // ─────────────────────────────────────────────────────
  const handleFontUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsFontUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const fontData = { id: 'font-' + Date.now(), name: newFontName || file.name.replace(/\.[^.]+$/, ''), data: reader.result };
      try {
        await saveFont(fontData);
        setNewFontName('');
        toast.success('Font berhasil diupload!');
        onRefreshData();
      } catch (err) { toast.error('Gagal upload font.'); }
      finally { setIsFontUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFont = async (id) => {
    const confirmed = await confirmDialog('Hapus font ini?');
    if (!confirmed) return;
    await deleteFont(id);
    onRefreshData();
  };

  // ─────────────────────────────────────────────────────
  //  SHIPPING HANDLERS
  // ─────────────────────────────────────────────────────
  const [shopQueries, setShopQueries] = useState({});
  const [isSearchingMap, setIsSearchingMap] = useState({});

  const handleSearchShopLocation = async (shopIdx) => {
    const q = shopQueries[shopIdx];
    if (!q || !q.trim()) return;

    setIsSearchingMap(prev => ({ ...prev, [shopIdx]: true }));
    try {
      const TOMTOM_KEY = settings.tomtomApiKey || 'ZGivQglmFeXV1B9a4ZcWOrkcikjY3HqD';
      const { lat, lng, address } = await parseLocationQuery(q, TOMTOM_KEY);
      
      setShops(prev => prev.map((s, i) => {
        if (i === shopIdx) {
          return { ...s, lat, lng, address: address || s.address };
        }
        return s;
      }));
      setShopQueries(prev => ({ ...prev, [shopIdx]: '' }));
      toast.success('Koordinat toko berhasil ditemukan dan diisi otomatis!');
    } catch (err) {
      if (err.message.includes('pendek Google Maps')) {
        toast.warning(err.message);
      } else {
        toast.error(err.message || 'Gagal mengekstrak koordinat dari input tersebut.');
      }
    } finally {
      setIsSearchingMap(prev => ({ ...prev, [shopIdx]: false }));
    }
  };

  const handleShopField = (shopIdx, field, val) => {
    setShops(prev => prev.map((s, i) => i === shopIdx ? { ...s, [field]: val } : s));
  };

  const handleAddZone = () => {
    if (!newZone.name) { toast.warning('Isi nama zona.'); return; }
    const zone = { id: 'zone-' + Date.now(), ...newZone };
    const sorted = [...zones, zone].sort((a, b) => a.radiusStart - b.radiusStart);
    setZones(sorted);
    setNewZone({ name: '', radiusStart: 0, radiusEnd: 0, type: 'per_km', rate: 0 });
  };

  const handleDeleteZone = (id) => setZones(zones.filter(z => z.id !== id));

  const handleAddArea = () => {
    if (!newArea.name || !newArea.keyword) { toast.warning('Isi nama dan kata kunci wilayah.'); return; }
    const area = { id: 'area-' + Date.now(), ...newArea };
    setAreas([...areas, area]);
    setNewArea({ name: '', keyword: '', flatRate: 0 });
  };

  const handleDeleteArea = (id) => setAreas(areas.filter(a => a.id !== id));

  const handleAddFreeShippingArea = () => {
    if (newFreeShippingArea.trim()) {
      setFreeShippingAreas([...freeShippingAreas, newFreeShippingArea.trim()]);
      setNewFreeShippingArea('');
    }
  };
  const handleDeleteFreeShippingArea = (index) => {
    setFreeShippingAreas(freeShippingAreas.filter((_, i) => i !== index));
  };

  const handleSaveShipping = async (e) => {
    e.preventDefault();

    let finalAreas = [...areas];
    if (newArea.name && newArea.keyword) {
      const area = { id: 'area-' + Date.now(), ...newArea };
      finalAreas.push(area);
      setAreas(finalAreas);
      setNewArea({ name: '', keyword: '', flatRate: 0 });
    }

    let finalZones = [...zones];
    if (newZone.name) {
      const zone = { id: 'zone-' + Date.now(), ...newZone };
      finalZones.push(zone);
      finalZones.sort((a, b) => a.radiusStart - b.radiusStart);
      setZones(finalZones);
      setNewZone({ name: '', radiusStart: 0, radiusEnd: 0, type: 'per_km', rate: 0 });
    }

    try {
      await saveSettingItem('shops', shops);
      await saveSettingItem('shippingBaseFee', Number(baseFee));
      await saveSettingItem('shippingRatePerKm', Number(defaultRate));
      await saveSettingItem('shippingZones', finalZones);
      await saveSettingItem('shippingAreas', finalAreas);
      await saveSettingItem('freeShippingEnabled', freeShippingEnabled);
      await saveSettingItem('freeShippingAreas', freeShippingAreas);
      // Legacy fallback
      if (shops[0]) await saveSettingItem('shopCoords', { lat: shops[0].lat, lng: shops[0].lng });
      toast.success('Pengaturan pengiriman berhasil disimpan!');
      onRefreshData();
    } catch (err) { toast.error('Gagal menyimpan: ' + err.message); }
  };

  // ─────────────────────────────────────────────────────
  //  GENERAL SETTINGS HANDLERS
  // ─────────────────────────────────────────────────────
  const handleSaveGeneralSettings = async (e) => {
    e.preventDefault();
    try {
      await saveSettingItem('shopName', shopName);
      await saveSettingItem('catalogHeading', catalogHeading);
      await saveSettingItem('logoImage', logoImage);
      await saveSettingItem('faviconImage', faviconImage);
      await saveSettingItem('waNumber', waNumber);
      await saveSettingItem('availableSizes', availableSizes);
      await saveSettingItem('storePolicy', storePolicy);
      await saveSettingItem('returnTime', returnTime);
      await saveSettingItem('storeHours', storeHours);
      await saveSettingItem('tomtomApiKey', tomtomApiKey);
      toast.success('Pengaturan umum berhasil disimpan!');
      onRefreshData();
    } catch (err) { toast.error('Gagal menyimpan: ' + err.message); }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.warning('Ukuran file logo maksimal 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setLogoImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleFaviconUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.warning('Ukuran file favicon maksimal 500KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setFaviconImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveFooterSettings = async (e) => {
    e.preventDefault();
    try {
      await saveSettingItem('footerTagline', footerTagline);
      await saveSettingItem('footerTrustBadge1', footerTrustBadge1);
      await saveSettingItem('footerTrustBadge2', footerTrustBadge2);
      await saveSettingItem('footerTrustBadge3', footerTrustBadge3);
      await saveSettingItem('footerInstagram', footerInstagram);
      await saveSettingItem('footerTiktok', footerTiktok);
      await saveSettingItem('footerFacebook', footerFacebook);
      await saveSettingItem('footerCopyright', footerCopyright);
      await saveSettingItem('footerHowToOrder', footerHowToOrder);
      await saveSettingItem('footerContactUs', footerContactUs);
      toast.success('Pengaturan footer berhasil disimpan!');
      onRefreshData();
    } catch (err) { toast.error('Gagal menyimpan: ' + err.message); }
  };

  // ── MAPS GUIDE HANDLERS ──────────────────────────────
  const handleSaveMapsGuide = async (e) => {
    e.preventDefault();
    try {
      await saveSettingItem('mapsGuideTabs', mapsGuideTabs);
      await saveSettingItem('mapsVideoUrl', mapsVideoUrl);
      toast.success('Panduan Maps berhasil disimpan!');
      onRefreshData();
    } catch (err) {
      toast.error('Gagal menyimpan panduan Maps.');
    }
  };

  const handleMapsGuideChange = (tabId, stepIndex, field, value) => {
    setMapsGuideTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab;
      const newSteps = [...tab.steps];
      newSteps[stepIndex] = { ...newSteps[stepIndex], [field]: value };
      return { ...tab, steps: newSteps };
    }));
  };

  // ─────────────────────────────────────────────────────
  //  FILTERED ORDERS
  // ─────────────────────────────────────────────────────
  const filteredOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter);

  // ─────────────────────────────────────────────────────
  //  RENDER TAB: DASHBOARD
  // ─────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="admin-tab-content">
      <div className="kpi-grid">
        <div className="kpi-card">
          <i className="fa-solid fa-sack-dollar kpi-icon" style={{ color: '#22c55e' }}></i>
          <div><span className="kpi-value">{fmt(totalRevenue)}</span><p>Total Pendapatan</p></div>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-clock kpi-icon" style={{ color: '#f59e0b' }}></i>
          <div><span className="kpi-value">{pendingCount}</span><p>Pesanan Pending</p></div>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-calendar kpi-icon" style={{ color: '#3b82f6' }}></i>
          <div><span className="kpi-value">{thisMonth}</span><p>Pesanan Bulan Ini</p></div>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-box kpi-icon" style={{ color: '#8b5cf6' }}></i>
          <div><span className="kpi-value">{catalog.length}</span><p>Total Produk</p></div>
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="alert-stock-warning">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <strong>Stok Hampir Habis:</strong>
          {lowStockProducts.map(p => <span key={p.id} className="stock-pill">{p.name} ({p.stock ?? 0} unit)</span>)}
        </div>
      )}

      <div className="recent-orders-table">
        <h3>Pesanan Terbaru</h3>
        <table className="orders-tbl">
          <thead>
            <tr><th>ID</th><th>Produk</th><th>Pemesan</th><th>Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {orders.slice(0, 5).map(o => (
              <tr key={o.id}>
                <td className="order-id-cell">{o.id}</td>
                <td>{o.boardName}</td>
                <td>{o.recipientName}</td>
                <td>{fmt(o.totalAmount || 0)}</td>
                <td><span className="status-badge" style={{ background: STATUS_COLOR[o.status] || '#888' }}>{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────
  //  RENDER TAB: PRODUK
  // ─────────────────────────────────────────────────────
  const renderProducts = () => {
    if (isProductFormVisible) {
      return (
        <div className="admin-tab-content animate-fade-in">
          <div className="admin-card">
            <h3>{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
            <form onSubmit={handleSaveProduct} className="admin-product-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nama Produk</label>
                  <input className="form-input" value={prodForm.name} onChange={e => handleProductField('name', e.target.value)} required placeholder="Cth: Blush Pink Floral" />
                </div>
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select className="form-input" value={prodForm.categoryId || ''} onChange={e => handleProductField('categoryId', e.target.value)}>
                    <option value="">Semua (Tanpa Kategori)</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Variants Section */}
              <div className="admin-variants-section" style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1rem', color: '#1f2937' }}>Pilihan Ukuran & Harga</h4>
                {prodForm.variants?.map((variant, idx) => (
                  <div key={variant.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', paddingBottom: '16px', borderBottom: idx < prodForm.variants.length - 1 ? '1px dashed #d1d5db' : 'none' }}>
                    <div className="form-group" style={{ flex: '1 1 200px' }}>
                      <label className="form-label">Nama Ukuran/Diameter</label>
                      <input className="form-input" value={variant.size} onChange={e => handleVariantChange(idx, 'size', e.target.value)} required placeholder="Cth: A2 (42 x 59.4 cm)" />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 150px' }}>
                      <label className="form-label">Harga (Rp)</label>
                      <input type="number" className="form-input" value={variant.price} onChange={e => handleVariantChange(idx, 'price', Number(e.target.value))} required min="0" />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 150px' }}>
                      <label className="form-label">Hrg Promo (Opsional)</label>
                      <input type="number" className="form-input" value={variant.discountPrice || ''} onChange={e => handleVariantChange(idx, 'discountPrice', e.target.value ? Number(e.target.value) : '')} min="0" placeholder="Kosongkan jika tdk ada" />
                    </div>
                    <div className="form-group" style={{ flex: '0 1 100px' }}>
                      <label className="form-label">Stok</label>
                      <input type="number" className="form-input" value={variant.stock} onChange={e => handleVariantChange(idx, 'stock', Number(e.target.value))} required min="0" />
                    </div>
                    {prodForm.variants.length > 1 && (
                      <div className="form-group" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end' }}>
                        <button type="button" className="btn-icon-del" onClick={() => handleRemoveVariant(idx)} title="Hapus Ukuran">
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" className="btn-secondary" onClick={handleAddVariant} style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                  <i className="fa-solid fa-plus"></i> Tambah Ukuran Lain
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi Produk</label>
                <textarea className="form-input textarea-input" rows={3} value={prodForm.description} onChange={e => handleProductField('description', e.target.value)} placeholder="Deskripsikan papan akrilik ini..." />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Teks Label Material</label>
                  <input className="form-input" value={prodForm.materialLabel || ''} onChange={e => handleProductField('materialLabel', e.target.value)} placeholder="Cth: Papan Akrilik Premium" />
                </div>
                <div className="form-group">
                  <label className="form-label">Teks Kualitas Material</label>
                  <input className="form-input" value={prodForm.materialQuality || ''} onChange={e => handleProductField('materialQuality', e.target.value)} placeholder="Cth: Akrilik premium berkualitas tinggi." />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Badge Label</label>
                <select className="form-input" value={prodForm.badge} onChange={e => handleProductField('badge', e.target.value)}>
                  <option value="">Tidak ada badge</option>
                  <option value="Terlaris">Terlaris</option>
                  <option value="Baru">Baru</option>
                  <option value="Promo">Promo</option>
                  <option value="Habis">Habis</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Foto Produk (Maks. 5 gambar)</label>
                <input type="file" accept="image/*" multiple className="form-input file-input" onChange={handleImagesUpload} disabled={(prodForm.images?.length || 0) >= 5} />
                <p className="field-helper">Upload hingga 5 foto. Klik foto untuk jadikan thumbnail utama.</p>

                {prodForm.images?.length > 0 && (
                  <div className="prod-image-grid">
                    {prodForm.images.map((img, idx) => (
                      <div key={idx} className={`prod-img-thumb ${idx === (prodForm.mainImageIndex || 0) ? 'main-thumb' : ''}`}
                        onClick={() => handleProductField('mainImageIndex', idx)}>
                        <img src={img} alt={`Foto ${idx + 1}`} />
                        {idx === (prodForm.mainImageIndex || 0) && <span className="main-label">Utama</span>}
                        <button type="button" className="remove-img-btn" onClick={ev => { ev.stopPropagation(); handleRemoveImage(idx); }}>
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions" style={{ gap: '12px', display: 'flex' }}>
                <button type="submit" className="btn-primary">
                  <i className="fa-solid fa-floppy-disk"></i> {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
                </button>
                <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                  Kembali / Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="admin-tab-content animate-fade-in">
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Daftar Produk ({catalog.length})</h3>
            <button className="btn-primary" onClick={() => setIsProductFormVisible(true)}>
              <i className="fa-solid fa-plus"></i> Tambah Produk Baru
            </button>
          </div>
          <div className="product-admin-list">
            {catalog.map(prod => {
              const mainImg = prod.images?.[prod.mainImageIndex || 0] || prod.image;
              
              // Handle variants backward compatibility
              const prodVariants = prod.variants && prod.variants.length > 0 
                ? prod.variants 
                : [{ size: prod.size, price: prod.price, discountPrice: prod.discountPrice, stock: prod.stock }];
                
              const minPrice = Math.min(...prodVariants.map(v => v.discountPrice || v.price || 0));
              const totalStock = prodVariants.reduce((sum, v) => sum + (v.stock || 0), 0);

              return (
                <div key={prod.id} className="product-admin-row">
                  <div className="prod-admin-img">
                    {mainImg ? <img src={mainImg} alt={prod.name} /> : <i className="fa-solid fa-image prod-no-img"></i>}
                  </div>
                  <div className="prod-admin-info">
                    <strong>{prod.name}</strong>
                    <span>{prodVariants.length > 1 ? `${prodVariants.length} Ukuran` : prodVariants[0]?.size}</span>
                    <span>{fmt(minPrice)}</span>
                    <span className={`stock-tag ${totalStock <= 2 ? 'stock-low' : ''}`}>
                      Stok: {totalStock}
                    </span>
                    {prod.badge && <span className="prod-badge-tag">{prod.badge}</span>}
                  </div>
                  <div className="prod-admin-actions">
                    <button className="btn-icon-edit" onClick={() => handleEditProduct(prod)}>
                      <i className="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button className="btn-icon-del" onClick={() => handleDeleteProduct(prod.id)}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────
  //  ORDER ACTION HANDLERS
  // ─────────────────────────────────────────────────────
  const handleConfirmPayment = async (order) => {
    // Idempotency: skip if stock already deducted
    if (!order.stockDeducted) {
      const productId = order.productId || catalog.find(p => p.name === order.boardName)?.id;
      const variantId = order.variantId;
      if (productId && variantId) {
        await adjustVariantStock(productId, variantId, -1);
      }
    }
    const newStatus = 'Dikonfirmasi';
    const updated = { ...order, status: newStatus, paidAt: new Date().toISOString(), stockDeducted: true };
    await saveOrder(updated);
    onRefreshData();
    setSelectedOrder(prev => prev?.id === order.id ? { ...prev, ...updated } : prev);
    toast.success(`Pesanan #${order.id} dikonfirmasi! Stok produk dikurangi.`);
  };

  const handleConfirmDelivered = async (order) => {
    const newStatus = 'Selesai';
    await saveOrder({ ...order, status: newStatus, deliveredAt: new Date().toISOString() });
    onRefreshData();
    setSelectedOrder(prev => prev?.id === order.id ? { ...prev, status: newStatus } : prev);
    toast.success(`Pesanan #${order.id} ditandai Selesai!`);
  };

  const handleDeleteOrder = async (order) => {
    const ok = await confirmDialog('Hapus Pesanan?', `Pesanan #${order.id} akan dihapus permanen.`);
    if (!ok) return;
    // Restore stock if it was deducted and not yet restored
    if (order.stockDeducted && !order.stockRestored) {
      const productId = order.productId || catalog.find(p => p.name === order.boardName)?.id;
      const variantId = order.variantId;
      if (productId && variantId) {
        await adjustVariantStock(productId, variantId, +1);
      }
    }
    await deleteOrder(order.id);
    onRefreshData();
    setSelectedOrder(null);
    toast.success('Pesanan dihapus.');
  };

  // ─────────────────────────────────────────────────────
  //  RENDER TAB: PESANAN
  // ─────────────────────────────────────────────────────
  const renderOrders = () => {
    const filteredOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter);

    return (
    <div className="admin-tab-content">
      {/* Filter bar */}
      <div className="order-filter-bar">
        {['all', ...ORDER_STATUSES].map(s => (
          <button key={s} className={`filter-pill ${orderFilter === s ? 'active' : ''}`} onClick={() => setOrderFilter(s)}>
            {s === 'all' ? 'Semua' : s}
          </button>
        ))}
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="order-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="order-modal" onClick={e => e.stopPropagation()}>
            <div className="order-modal-header">
              <div>
                <h3>Detail Pesanan</h3>
                <span className="order-code-tag">#{selectedOrder.id}</span>
              </div>
              <button className="close-modal-btn" onClick={() => setSelectedOrder(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="order-modal-body">
              <div className="order-detail-row"><strong>Produk</strong><span>{selectedOrder.boardName}</span></div>
              {selectedOrder.variantSize && <div className="order-detail-row"><strong>Ukuran</strong><span>{selectedOrder.variantSize}</span></div>}
              <div className="order-detail-row"><strong>Pemesan</strong><span>{selectedOrder.recipientName}</span></div>
              <div className="order-detail-row"><strong>Ucapan</strong><span>{selectedOrder.message || '—'}</span></div>
              <div className="order-detail-row"><strong>Dari</strong><span>{selectedOrder.senderName || '—'}</span></div>
              <div className="order-detail-row"><strong>Tanggal Acara</strong><span>{selectedOrder.rentalDate}</span></div>
              <div className="order-detail-row"><strong>Alamat</strong><span>{selectedOrder.address}</span></div>
              <div className="order-detail-row"><strong>Jarak</strong><span>{selectedOrder.distance} km</span></div>
              <div className="order-detail-row"><strong>Ongkir</strong><span>{fmt(selectedOrder.shippingFee || 0)}</span></div>
              {selectedOrder.discountCode && (
                <div className="order-detail-row"><strong>Diskon ({selectedOrder.discountCode})</strong><span>-{fmt(selectedOrder.discountAmount || 0)}</span></div>
              )}
              <div className="order-detail-row total-row"><strong>Total</strong><span>{fmt(selectedOrder.totalAmount || 0)}</span></div>
              <div className="order-detail-row">
                <strong>Status</strong>
                <span className="status-badge" style={{ background: STATUS_COLOR[selectedOrder.status] || '#888' }}>{selectedOrder.status}</span>
              </div>
              {/* Stock status info */}
              <div className="order-stock-info">
                {selectedOrder.stockDeducted
                  ? selectedOrder.stockRestored
                    ? <span className="stock-info-tag restored"><i className="fa-solid fa-rotate-left"></i> Stok sudah dikembalikan</span>
                    : <span className="stock-info-tag deducted"><i className="fa-solid fa-minus-circle"></i> Stok sudah dikurangi — akan dikembalikan otomatis pukul {settings.returnTime || '16.00'} WIB</span>
                  : <span className="stock-info-tag pending"><i className="fa-solid fa-clock"></i> Stok belum dikurangi (menunggu konfirmasi bayar)</span>
                }
              </div>
            </div>
            <div className="order-modal-footer">
              {/* Quick action buttons */}
              <div className="order-quick-actions">
                {selectedOrder.status === 'Pending' && (
                  <button className="btn-order-confirm-pay" onClick={() => handleConfirmPayment(selectedOrder)}>
                    <i className="fa-solid fa-circle-check"></i> Konfirmasi Bayar
                  </button>
                )}
                {(selectedOrder.status === 'Dikonfirmasi' || selectedOrder.status === 'Dalam Pengiriman') && (
                  <button className="btn-order-delivered" onClick={() => handleConfirmDelivered(selectedOrder)}>
                    <i className="fa-solid fa-box-open"></i> Pesanan Selesai
                  </button>
                )}
                {settings.waNumber && (
                  <a className="btn-wa-contact" href={`https://wa.me/${settings.waNumber}?text=Halo,%20mengenai%20pesanan%20%23${selectedOrder.id}`} target="_blank" rel="noreferrer">
                    <i className="fa-brands fa-whatsapp"></i> Hubungi WA
                  </a>
                )}
                <button className="btn-order-delete" onClick={() => handleDeleteOrder(selectedOrder)}>
                  <i className="fa-solid fa-trash"></i> Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders list - responsive cards on mobile, table on desktop */}
      <div className="admin-card">
        <div className="order-count-label">{filteredOrders.length} pesanan</div>

        {/* Desktop table */}
        <table className="orders-tbl hide-on-mobile">
          <thead>
            <tr><th>Kode</th><th>Produk</th><th>Pemesan</th><th>Total</th><th>Status</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 && (
              <tr><td colSpan={6} className="empty-table">Tidak ada pesanan.</td></tr>
            )}
            {filteredOrders.map(o => (
              <tr key={o.id} className="order-row" onClick={() => setSelectedOrder(o)}>
                <td className="order-id-cell">#{o.id}</td>
                <td>{o.boardName}</td>
                <td>{o.recipientName}</td>
                <td>{fmt(o.totalAmount || 0)}</td>
                <td><span className="status-badge" style={{ background: STATUS_COLOR[o.status] || '#888' }}>{o.status}</span></td>
                <td onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button className="btn-icon-edit" title="Detail" onClick={() => setSelectedOrder(o)}><i className="fa-solid fa-eye"></i></button>
                  {o.status === 'Pending' && (
                    <button className="btn-icon-confirm" title="Konfirmasi Bayar" onClick={() => handleConfirmPayment(o)}><i className="fa-solid fa-circle-check"></i></button>
                  )}
                  {(o.status === 'Dikonfirmasi' || o.status === 'Dalam Pengiriman') && (
                    <button className="btn-icon-delivered" title="Selesai" onClick={() => handleConfirmDelivered(o)}><i className="fa-solid fa-box-open"></i></button>
                  )}
                  <button className="btn-icon-del" title="Hapus" onClick={() => handleDeleteOrder(o)}><i className="fa-solid fa-trash"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="order-cards hide-on-desktop">
          {filteredOrders.length === 0 && <p className="empty-table">Tidak ada pesanan.</p>}
          {filteredOrders.map(o => (
            <div key={o.id} className="order-card-item" onClick={() => setSelectedOrder(o)}>
              <div className="order-card-header">
                <span className="order-code-tag">#{o.id}</span>
                <span className="status-badge" style={{ background: STATUS_COLOR[o.status] || '#888' }}>{o.status}</span>
              </div>
              <div className="order-card-info">
                <strong>{o.boardName}</strong>
                <span>{o.recipientName}</span>
                <span className="order-card-total">{fmt(o.totalAmount || 0)}</span>
              </div>
              <div className="order-card-actions" onClick={e => e.stopPropagation()}>
                {o.status === 'Pending' && (
                  <button className="btn-order-confirm-pay btn-sm" onClick={() => handleConfirmPayment(o)}>
                    <i className="fa-solid fa-circle-check"></i> Bayar
                  </button>
                )}
                {(o.status === 'Dikonfirmasi' || o.status === 'Dalam Pengiriman') && (
                  <button className="btn-order-delivered btn-sm" onClick={() => handleConfirmDelivered(o)}>
                    <i className="fa-solid fa-box-open"></i> Selesai
                  </button>
                )}
                <button className="btn-icon-edit btn-sm" onClick={() => setSelectedOrder(o)}>
                  <i className="fa-solid fa-eye"></i>
                </button>
                <button className="btn-icon-del btn-sm" onClick={() => handleDeleteOrder(o)}>
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
  };


  // ─────────────────────────────────────────────────────
  //  RENDER TAB: PENGIRIMAN
  // ─────────────────────────────────────────────────────
  const renderShipping = () => (
    <div className="admin-tab-content">
      <form onSubmit={handleSaveShipping}>
        {/* 2 Shops */}
        <div className="admin-card">
          <h3><i className="fa-solid fa-store"></i> Lokasi Toko</h3>
          <div className="shops-grid">
            {shops.map((shop, idx) => (
              <div key={shop.id} className="shop-form-card">
                <h4>{shop.name || `Toko ${idx + 1}`}</h4>
                <div className="form-group">
                  <label className="form-label">Nama Toko</label>
                  <input className="form-input" value={shop.name} onChange={e => handleShopField(idx, 'name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Alamat Lengkap</label>
                  <input className="form-input" value={shop.address} onChange={e => handleShopField(idx, 'address', e.target.value)} />
                </div>
                <div className="form-group mb-4">
                  <label className="form-label">
                    <i className="fa-solid fa-map-location-dot" style={{ color: 'var(--primary-color)', marginRight: '6px' }}></i>
                    Deteksi Koordinat Otomatis
                  </label>
                  <p className="field-helper mb-2" style={{ marginTop: '-4px' }}>Paste <b>Plus Code</b> atau <b>Link Maps</b> untuk melacak kordinat tanpa ketik manual.</p>
                  <div style={{ position: 'relative', width: '100%', margin: 0 }}>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Contoh: 2Q2W+JM Pekauman..." 
                      value={shopQueries[idx] || ''}
                      onChange={e => setShopQueries(prev => ({ ...prev, [idx]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchShopLocation(idx);
                        }
                      }}
                      style={{ paddingRight: '45px', width: '100%', boxSizing: 'border-box', margin: 0 }}
                    />
                      <button 
                        type="button"
                        onClick={() => handleSearchShopLocation(idx)} 
                        disabled={isSearchingMap[idx]}
                        style={{ 
                          position: 'absolute',
                        right: '4px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent', 
                        color: 'var(--primary-color)', 
                        border: 'none', 
                        height: '34px', 
                        width: '34px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#fff5f7'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {isSearchingMap[idx] ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.1rem' }}></i> : <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '1.1rem' }}></i>}
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input type="number" step="any" className="form-input" value={shop.lat} onChange={e => handleShopField(idx, 'lat', parseFloat(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input type="number" step="any" className="form-input" value={shop.lng} onChange={e => handleShopField(idx, 'lng', parseFloat(e.target.value))} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Default rates */}
        <div className="admin-card mt-4">
          <h3><i className="fa-solid fa-money-bill-wave"></i> 1. Tarif Pengiriman Reguler (Default)</h3>
          <p className="field-helper">Tarif ini berlaku jika alamat dan jarak tidak masuk dalam aturan khusus manapun di bawah.</p>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Biaya Dasar (Base Fee, Rp)</label>
              <input type="number" className="form-input" value={baseFee} onChange={e => setBaseFee(Number(e.target.value))} min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Tarif Default per Km (Rp)</label>
              <input type="number" className="form-input" value={defaultRate} onChange={e => setDefaultRate(Number(e.target.value))} min="0" />
            </div>
          </div>
        </div>

        {/* Free Shipping Area */}
        <div className="admin-card mt-4">
          <div className="detail-header-flex">
            <h3><i className="fa-solid fa-gift"></i> Area Gratis Ongkir</h3>
            <label className="toggle-switch">
              <input type="checkbox" checked={freeShippingEnabled} onChange={e => setFreeShippingEnabled(e.target.checked)} />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <p className="field-helper">Aktifkan fitur ini untuk menggratiskan ongkos kirim jika alamat pengguna mengandung salah satu kata kunci wilayah di bawah ini.</p>
          
          {freeShippingEnabled && (
            <>
              <div className="shipping-zones-table" style={{ marginTop: '15px' }}>
                <table className="admin-table">
                  <thead><tr><th>No</th><th>Kata Kunci (Kecamatan/Kota)</th><th style={{ width: '80px', textAlign: 'center' }}>Aksi</th></tr></thead>
                  <tbody>
                    {freeShippingAreas.map((area, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{area}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button type="button" className="btn-icon-delete" onClick={() => handleDeleteFreeShippingArea(idx)}><i className="fa-solid fa-trash"></i></button>
                        </td>
                      </tr>
                    ))}
                    {freeShippingAreas.length === 0 && (
                      <tr><td colSpan="3" style={{ textAlign: 'center', color: '#888' }}>Belum ada area gratis ongkir.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="add-zone-form" style={{ marginTop: '15px' }}>
                <h4>Tambah Area Gratis Ongkir</h4>
                <div className="form-row" style={{ alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Kata Kunci Wilayah</label>
                    <input type="text" className="form-input" placeholder="Contoh: Kaliwates" value={newFreeShippingArea} onChange={e => setNewFreeShippingArea(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddFreeShippingArea())} />
                  </div>
                  <div className="form-group">
                    <button type="button" className="btn-primary" onClick={handleAddFreeShippingArea}><i className="fa-solid fa-plus"></i> Tambah Area</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Shipping Areas (Kecamatan/Kabupaten) */}
        <div className="admin-card mt-4">
          <h3><i className="fa-solid fa-map-pin"></i> 2. Tarif Tetap Berdasarkan Wilayah (Kecamatan/Kabupaten)</h3>
          <p className="field-helper">Tarif khusus yang diaktifkan jika <b>nama alamat pelanggan</b> mengandung kata kunci wilayah di bawah ini.</p>

          <table className="zone-table">
            <thead>
              <tr><th>Nama Wilayah</th><th>Kata Kunci Pencarian</th><th>Tarif Flat (Rp)</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {areas.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Belum ada wilayah tarif khusus.</td></tr>}
              {areas.map(a => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td><span className="badge-keyword">"{a.keyword}"</span></td>
                  <td>{fmt(a.flatRate)}</td>
                  <td>
                    <button type="button" className="btn-icon-del small" onClick={() => handleDeleteArea(a.id)}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add area form */}
          <div className="add-zone-form mt-3">
            <h4>+ Tambah Wilayah Baru</h4>
            <div className="form-row align-bottom">
              <div className="form-group">
                <label className="form-label">Nama Wilayah (Kecamatan/Kota)</label>
                <input className="form-input" placeholder="Cth: Kec. Bondowoso" value={newArea.name} onChange={e => setNewArea(a => ({ ...a, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Kata Kunci (Ketik yg unik)</label>
                <input className="form-input" placeholder="Cth: Bondowoso" value={newArea.keyword} onChange={e => setNewArea(a => ({ ...a, keyword: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Tarif Tetap (Rp)</label>
                <input type="number" className="form-input" value={newArea.flatRate} onChange={e => setNewArea(a => ({ ...a, flatRate: Number(e.target.value) }))} min="0" />
              </div>
              <div className="form-group">
                <button type="button" className="btn-secondary w-100" onClick={handleAddArea}>
                  <i className="fa-solid fa-plus"></i> Tambah
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Zones (Distance) */}
        <div className="admin-card mt-4">
          <h3><i className="fa-solid fa-map-location-dot"></i> 3. Tarif Khusus Berdasarkan Jarak (Radius KM)</h3>
          <p className="field-helper">Berlaku jika alamat pelanggan tidak masuk wilayah di atas. Sistem akan memilih rentang jarak yang sesuai.</p>

          <table className="zone-table">
            <thead>
              <tr><th>Nama Zona</th><th>Dari (km)</th><th>Sampai (km)</th><th>Jenis Tarif</th><th>Biaya (Rp)</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {zones.length === 0 && <tr><td colSpan="6" className="text-center text-muted">Belum ada zona jarak khusus.</td></tr>}
              {zones.map(z => (
                <tr key={z.id}>
                  <td>{z.name}</td>
                  <td>{z.radiusStart} km</td>
                  <td>{z.radiusEnd >= 999 ? '∞' : `${z.radiusEnd} km`}</td>
                  <td><span className={`badge-type ${z.type || 'per_km'}`}>{z.type === 'flat' ? 'Tarif Tetap' : 'Per KM'}</span></td>
                  <td>{fmt(z.rate || z.ratePerKm)}</td>
                  <td>
                    <button type="button" className="btn-icon-del small" onClick={() => handleDeleteZone(z.id)}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add zone form */}
          <div className="add-zone-form mt-3">
            <h4>+ Tambah Zona Jarak Baru</h4>
            <div className="form-row align-bottom">
              <div className="form-group">
                <label className="form-label">Nama Zona</label>
                <input className="form-input" placeholder="Cth: Area Luar Kota" value={newZone.name} onChange={e => setNewZone(z => ({ ...z, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Dari (km)</label>
                <input type="number" className="form-input" value={newZone.radiusStart} onChange={e => setNewZone(z => ({ ...z, radiusStart: Number(e.target.value) }))} min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Sampai (km)</label>
                <input type="number" className="form-input" value={newZone.radiusEnd} onChange={e => setNewZone(z => ({ ...z, radiusEnd: Number(e.target.value) }))} min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Jenis Tarif</label>
                <select className="form-input" value={newZone.type} onChange={e => setNewZone(z => ({ ...z, type: e.target.value }))}>
                  <option value="per_km">Per KM</option>
                  <option value="flat">Tarif Tetap (Flat)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Biaya (Rp)</label>
                <input type="number" className="form-input" value={newZone.rate} onChange={e => setNewZone(z => ({ ...z, rate: Number(e.target.value) }))} min="0" />
              </div>
            </div>
            <button type="button" className="btn-secondary mt-2" onClick={handleAddZone}>
              <i className="fa-solid fa-plus"></i> Tambah Zona Jarak
            </button>
          </div>
        </div>

        <div className="form-actions mt-4">
          <button type="submit" className="btn-primary">
            <i className="fa-solid fa-floppy-disk"></i> Simpan Pengaturan Pengiriman
          </button>
        </div>
      </form>
    </div>
  );

  // ─────────────────────────────────────────────────────
  //  VOUCHER HANDLERS
  // ── Categories ───────────────────────────────────────
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    let finalCategories = [...categories];
    if (editingCategory) {
      finalCategories = finalCategories.map(c => 
        c.id === editingCategory.id ? { ...c, name: categoryForm.name, icon: categoryForm.icon } : c
      );
    } else {
      const newCategory = {
        id: 'cat_' + Date.now(),
        name: categoryForm.name,
        icon: categoryForm.icon || 'fa-solid fa-tag'
      };
      finalCategories.push(newCategory);
    }

    setCategories(finalCategories);
    try {
      await saveSettingItem('categories', finalCategories);
      toast.success(editingCategory ? 'Kategori diperbarui!' : 'Kategori ditambahkan!');
      setEditingCategory(null);
      setCategoryForm({ name: '', icon: '' });
    } catch (err) { toast.error('Gagal menyimpan kategori.'); }
  };

  const handleDeleteCategory = async (id) => {
    const confirm = await confirmDialog('Hapus Kategori?', 'Apakah Anda yakin ingin menghapus kategori ini?');
    if (!confirm) return;
    
    const finalCategories = categories.filter(c => c.id !== id);
    setCategories(finalCategories);
    try {
      await saveSettingItem('categories', finalCategories);
      toast.success('Kategori dihapus!');
    } catch (err) { toast.error('Gagal menghapus.'); }
  };

  const handleEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, icon: cat.icon || '' });
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', icon: '' });
  };

  // ── Vouchers ─────────────────────────────────────────
  const handleSaveVoucher = async (e) => {
    e.preventDefault();
    if (!voucherForm.code || !voucherForm.value) return;
    
    let finalVouchers = [...vouchers];
    const newVoucher = {
      id: 'voucher-' + Date.now(),
      code: voucherForm.code.toUpperCase(),
      type: voucherForm.type,
      value: Number(voucherForm.value),
      quota: Number(voucherForm.quota) || 0,
      expiryDate: voucherForm.expiryDate,
      active: voucherForm.active
    };
    finalVouchers.push(newVoucher);
    setVouchers(finalVouchers);
    try {
      await saveSettingItem('vouchers', finalVouchers);
      toast.success('Voucher berhasil ditambahkan!');
      setVoucherForm({ code: '', type: 'nominal', value: '', quota: '', expiryDate: '', active: true });
    } catch (err) { toast.error('Gagal menyimpan voucher.'); }
  };

  const handleDeleteVoucher = async (id) => {
    const confirm = await confirmDialog('Hapus voucher ini?', 'Apakah Anda yakin ingin menghapus voucher ini?');
    if (!confirm) return;
    const finalVouchers = vouchers.filter(v => v.id !== id);
    setVouchers(finalVouchers);
    try {
      await saveSettingItem('vouchers', finalVouchers);
      toast.success('Voucher dihapus!');
    } catch (err) { toast.error('Gagal menghapus.'); }
  };

  const handleToggleVoucher = async (id, active) => {
    const finalVouchers = vouchers.map(v => v.id === id ? { ...v, active } : v);
    setVouchers(finalVouchers);
    try {
      await saveSettingItem('vouchers', finalVouchers);
    } catch (err) { toast.error('Gagal memperbarui status.'); }
  };

  // ─────────────────────────────────────────────────────
  //  RENDER TAB: CATEGORIES
  // ─────────────────────────────────────────────────────
  const renderCategories = () => (
    <div className="admin-tab-content">
      <div className="admin-card">
        <h3><i className="fa-solid fa-tags"></i> Manajemen Kategori</h3>
        <p className="field-helper">Tambahkan kategori untuk mengelompokkan produk Anda (misal: Mahar, Kado Wisuda). Kategori ini akan muncul di halaman utama.</p>
        
        <form onSubmit={handleSaveCategory} className="mt-4 mb-5" style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h4>{editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h4>
          <div className="form-row mt-3">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Nama Kategori</label>
              <input type="text" className="form-input" placeholder="Cth: Mahar Pernikahan" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">FontAwesome Icon (Opsional)</label>
              <input type="text" className="form-input" placeholder="Cth: fa-solid fa-ring" value={categoryForm.icon} onChange={e => setCategoryForm({ ...categoryForm, icon: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
              <i className="fa-solid fa-save"></i> {editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
            </button>
            {editingCategory && (
              <button type="button" className="btn-secondary" onClick={handleCancelEditCategory} style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
                Batal
              </button>
            )}
          </div>
        </form>

        <h4 className="mb-3">Daftar Kategori</h4>
        {categories.length === 0 ? (
          <p className="empty-hint">Belum ada kategori yang ditambahkan.</p>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nama Kategori</th>
                  <th>Icon</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: '600' }}>{c.name}</td>
                    <td>{c.icon ? <><i className={c.icon}></i> {c.icon}</> : '-'}</td>
                    <td>
                      <div className="action-buttons" style={{ justifyContent: 'center' }}>
                        <button className="btn-icon-edit" onClick={() => handleEditCategory(c)} title="Edit"><i className="fa-solid fa-pen"></i></button>
                        <button className="btn-icon-del" onClick={() => handleDeleteCategory(c.id)} title="Hapus"><i className="fa-solid fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────
  //  RENDER TAB: PROMO & VOUCHER
  // ─────────────────────────────────────────────────────
  const renderVouchers = () => (
    <div className="admin-tab-content">
      <div className="admin-card">
        <h3><i className="fa-solid fa-ticket"></i> Manajemen Voucher & Promo</h3>
        <p className="field-helper">Buat dan kelola kode promo untuk pelanggan Anda. Diskon bisa berupa potongan nominal (Rp) atau persentase (%).</p>
        
        <form onSubmit={handleSaveVoucher} className="mt-4 mb-5" style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h4>Tambah Voucher Baru</h4>
          <div className="form-row mt-3">
            <div className="form-group">
              <label className="form-label">Kode Voucher</label>
              <input type="text" className="form-input" placeholder="Cth: MANTAP10K" value={voucherForm.code} onChange={e => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Tipe Diskon</label>
              <select className="form-input" value={voucherForm.type} onChange={e => setVoucherForm({ ...voucherForm, type: e.target.value })}>
                <option value="nominal">Potongan Nominal (Rp)</option>
                <option value="percent">Potongan Persentase (%)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nilai Diskon</label>
              <input type="number" className="form-input" placeholder={voucherForm.type === 'nominal' ? 'Cth: 10000' : 'Cth: 10 (max 100%)'} value={voucherForm.value} onChange={e => setVoucherForm({ ...voucherForm, value: e.target.value })} min="1" max={voucherForm.type === 'percent' ? 100 : undefined} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Kuota (Jumlah maksimal dipakai)</label>
              <input type="number" className="form-input" placeholder="Cth: 100" value={voucherForm.quota} onChange={e => setVoucherForm({ ...voucherForm, quota: e.target.value })} min="1" required />
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal Kedaluwarsa</label>
              <input type="date" className="form-input" value={voucherForm.expiryDate} onChange={e => setVoucherForm({ ...voucherForm, expiryDate: e.target.value })} required />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="btn-primary w-100" style={{ height: '42px' }}>
                <i className="fa-solid fa-plus"></i> Tambah Voucher
              </button>
            </div>
          </div>
        </form>

        <h4>Daftar Voucher Aktif & Tersedia</h4>
        <div className="table-responsive mt-3">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nilai Diskon</th>
                <th>Sisa Kuota</th>
                <th>Kedaluwarsa</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Belum ada voucher yang dibuat.</td></tr>
              )}
              {vouchers.map(v => (
                <tr key={v.id}>
                  <td><strong>{v.code}</strong></td>
                  <td>{v.type === 'nominal' ? fmt(v.value) : `${v.value}%`}</td>
                  <td>{v.quota} x pemakaian</td>
                  <td>{new Date(v.expiryDate).toLocaleDateString('id-ID')}</td>
                  <td>
                    <label className="toggle-switch small">
                      <input type="checkbox" checked={v.active} onChange={e => handleToggleVoucher(v.id, e.target.checked)} />
                      <span className="toggle-slider"></span>
                    </label>
                    <span style={{ fontSize: '0.8rem', marginLeft: '8px', color: v.active ? '#10b981' : '#ef4444' }}>{v.active ? 'Aktif' : 'Nonaktif'}</span>
                  </td>
                  <td>
                    <button type="button" className="btn-icon-delete" onClick={() => handleDeleteVoucher(v.id)} title="Hapus Voucher">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────
  //  RENDER TAB: HERO & BANNER
  // ─────────────────────────────────────────────────────
  const handleSaveHero = async (e) => {
    e.preventDefault();
    try {
      await saveSettingItem('heroMode', heroMode);
      await saveSettingItem('heroChip', heroChip);
      await saveSettingItem('heroTitle', heroTitle);
      await saveSettingItem('heroDesc', heroDesc);
      await saveSettingItem('heroBanners', heroBanners);
      toast.success('Pengaturan Hero & Banner berhasil disimpan!');
      onRefreshData();
    } catch (err) { toast.error('Gagal menyimpan.'); }
  };

  const handleAddBanner = () => {
    if (!bannerInput.trim()) return;
    if (heroBanners.length >= 5) { toast.warning('Maksimal 5 banner.'); return; }
    setHeroBanners(prev => [...prev, { id: Date.now().toString(), url: bannerInput.trim() }]);
    setBannerInput('');
  };

  const handleRemoveBanner = (id) => {
    setHeroBanners(prev => prev.filter(b => b.id !== id));
  };

  const renderHero = () => (
    <div className="admin-tab-content">
      <div className="admin-card">
        <h3><i className="fa-solid fa-image"></i> Hero & Banner</h3>
        <p className="field-helper mb-3">Atur tampilan bagian atas halaman utama (hero section). Pilih mode teks atau slider gambar.</p>
        <form onSubmit={handleSaveHero}>

          {/* Mode switch */}
          <div className="hero-mode-switch-wrap">
            <i className="fa-solid fa-font hero-mode-icon"></i>
            <span className="hero-mode-label">Tampilan Teks</span>
            <label className="toggle-switch" title="Aktifkan Slider Gambar">
              <input
                type="checkbox"
                checked={heroMode === 'slider'}
                onChange={e => setHeroMode(e.target.checked ? 'slider' : 'text')}
              />
              <span className="toggle-track">
                <span className="toggle-thumb"></span>
              </span>
            </label>
            <span className="hero-mode-label">Slider Gambar</span>
            <i className="fa-solid fa-images hero-mode-icon"></i>
            <span className={`hero-mode-status-badge ${heroMode === 'slider' ? 'on' : 'off'}`}>
              {heroMode === 'slider' ? 'Slider AKTIF' : 'Teks AKTIF'}
            </span>
          </div>

          {/* Text hero fields */}
          {heroMode === 'text' && (
            <div className="hero-fields-section">
              <div className="form-group">
                <label className="form-label">Badge / Chip (teks kecil di atas judul)</label>
                <input className="form-input" value={heroChip} onChange={e => setHeroChip(e.target.value)} placeholder="Terpercaya & Estetik" />
              </div>
              <div className="form-group">
                <label className="form-label">Judul Utama (H1)</label>
                <input className="form-input" value={heroTitle} onChange={e => setHeroTitle(e.target.value)} placeholder="Sewa Papan Akrilik Wisuda" />
              </div>
              <div className="form-group">
                <label className="form-label">Deskripsi Singkat</label>
                <textarea className="form-input textarea-input" rows={3} value={heroDesc} onChange={e => setHeroDesc(e.target.value)} placeholder="Rayakan momen wisuda..." />
              </div>
              {/* Live preview */}
              <div className="hero-text-preview">
                <span className="hero-chip-preview"><i className="fa-solid fa-star"></i> {heroChip || 'Badge'}</span>
                <h2 className="hero-title-preview">{heroTitle || 'Judul Utama'}</h2>
                <p className="hero-desc-preview">{heroDesc || 'Deskripsi singkat...'}</p>
              </div>
            </div>
          )}

          {/* Slider banner fields */}
          {heroMode === 'slider' && (
            <div className="hero-fields-section">
              <div className="banner-guideline-box">
                <i className="fa-solid fa-circle-info"></i>
                <div>
                  <strong>Pedoman Ukuran Gambar Banner</strong>
                  <p>Ukuran ideal: <code>1440 × 480 px</code> (rasio 3:1 landscape)</p>
                  <p>Format: PNG / JPG / WebP · Maks 5 banner</p>
                  <p>Gambar akan ditampilkan tanpa crop menggunakan <em>contain</em> mode</p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tambah Banner via URL Gambar ({heroBanners.length}/5)</label>
                <div className="banner-add-row">
                  <input
                    className="form-input"
                    value={bannerInput}
                    onChange={e => setBannerInput(e.target.value)}
                    placeholder="https://example.com/banner.jpg"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddBanner(); } }}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleAddBanner}
                    disabled={heroBanners.length >= 5}
                  >
                    <i className="fa-solid fa-plus"></i> Tambah
                  </button>
                </div>
              </div>

              {heroBanners.length === 0 && (
                <p className="field-helper" style={{ textAlign: 'center', padding: '24px' }}>Belum ada banner. Tambahkan URL gambar di atas.</p>
              )}

              <div className="banner-list">
                {heroBanners.map((b, idx) => (
                  <div key={b.id} className="banner-list-item">
                    <span className="banner-idx">{idx + 1}</span>
                    <div className="banner-preview-thumb">
                      <img src={b.url} alt={`Banner ${idx + 1}`} onError={e => { e.target.style.display = 'none'; }} />
                    </div>
                    <span className="banner-url-text">{b.url}</span>
                    <button type="button" className="btn-icon-del" onClick={() => handleRemoveBanner(b.id)} title="Hapus banner">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-actions mt-3">
            <button type="submit" className="btn-primary">
              <i className="fa-solid fa-floppy-disk"></i> Simpan Pengaturan Hero
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────
  //  RENDER TAB: SEO SETTINGS
  // ─────────────────────────────────────────────────────
  const handleSaveSeo = async (e) => {
    e.preventDefault();
    try {
      await saveSettingItem('seoTitle', seoTitle);
      await saveSettingItem('seoDesc', seoDesc);
      await saveSettingItem('seoKeywords', seoKeywords);
      await saveSettingItem('seoOgImage', seoOgImage);
      await saveSettingItem('seoContent', seoContent);
      toast.success('Pengaturan SEO berhasil disimpan!');
      onRefreshData();
    } catch (err) { toast.error('Gagal menyimpan pengaturan SEO.'); }
  };

  const renderSeo = () => (
    <div className="admin-tab-content">
      <div className="admin-card">
        <h3><i className="fa-solid fa-magnifying-glass"></i> SEO Settings</h3>
        <p className="field-helper mb-3">Atur informasi yang dibaca mesin pencari Google. Pastikan mengandung kata kunci yang relevan dengan bisnis Anda.</p>

        <form onSubmit={handleSaveSeo}>

          {/* Section 1: Core Meta */}
          <div className="seo-section-title"><i className="fa-solid fa-tag"></i> Meta Tag Utama</div>

          <div className="form-group">
            <label className="form-label">
              Meta Title (Judul di Google)
              <span className={`seo-char-count ${seoTitle.length > 60 ? 'over' : ''}`}>{seoTitle.length}/60</span>
            </label>
            <input
              className="form-input"
              value={seoTitle}
              onChange={e => setSeoTitle(e.target.value)}
              placeholder="Sewa Papan Akrilik Wisuda Murah & Estetik | NamaToko"
            />
            <p className="field-helper">Masukkan kata kunci utama + nama kota Anda. Ideal ≤60 karakter.</p>
          </div>

          <div className="form-group">
            <label className="form-label">
              Meta Description (Deskripsi di bawah judul Google)
              <span className={`seo-char-count ${seoDesc.length > 160 ? 'over' : ''}`}>{seoDesc.length}/160</span>
            </label>
            <textarea
              className="form-input textarea-input"
              rows={3}
              value={seoDesc}
              onChange={e => setSeoDesc(e.target.value)}
              placeholder="Sewa papan akrilik wisuda cantik dan murah..."
            />
            <p className="field-helper">Deskripsi menarik yang mendorong orang klik. Ideal 120–160 karakter.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Meta Keywords</label>
            <input
              className="form-input"
              value={seoKeywords}
              onChange={e => setSeoKeywords(e.target.value)}
              placeholder="pisahkan, dengan, koma"
            />
            <p className="field-helper">Contoh: sewa papan akrilik wisuda, papan akrilik murah, papan wisuda estetik bondowoso</p>
          </div>

          {/* Section 2: Social Media Preview */}
          <div className="seo-section-title mt-3"><i className="fa-solid fa-share-nodes"></i> Thumbnail Sosial Media (OG Image)</div>
          <div className="form-group">
            <label className="form-label">URL Gambar Preview (Open Graph)</label>
            <input
              className="form-input"
              value={seoOgImage}
              onChange={e => setSeoOgImage(e.target.value)}
              placeholder="https://example.com/thumbnail.jpg"
            />
            <p className="field-helper">Gambar yang muncul saat link web Anda dibagikan di WhatsApp/Facebook/Twitter. Ukuran ideal: 1200×630 px.</p>
            {seoOgImage && (
              <div className="seo-og-preview">
                <span className="seo-og-label">Preview:</span>
                <img src={seoOgImage} alt="OG Preview" onError={e => e.target.style.display='none'} />
              </div>
            )}
          </div>

          {/* Section 3: SEO Content Block */}
          <div className="seo-section-title mt-3"><i className="fa-solid fa-align-left"></i> Teks Konten SEO (Halaman Utama)</div>
          <div className="form-group">
            <label className="form-label">Paragraf Deskripsi Bisnis</label>
            <textarea
              className="form-input textarea-input"
              rows={5}
              value={seoContent}
              onChange={e => setSeoContent(e.target.value)}
              placeholder="Contoh: AcrilyGrad adalah pusat sewa papan akrilik wisuda terpercaya. Kami menyediakan berbagai pilihan papan akrilik cantik dan elegan untuk momen wisuda yang tak terlupakan. Melayani seluruh wilayah dengan harga terjangkau..."
            />
            <p className="field-helper">Teks ini akan ditampilkan di bagian bawah halaman katalog. Google sangat menyukai konten teks yang kaya kata kunci dan informatif.</p>
          </div>

          <div className="form-actions mt-3">
            <button type="submit" className="btn-primary">
              <i className="fa-solid fa-floppy-disk"></i> Simpan Pengaturan SEO
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────
  //  RENDER TAB: SETTINGS
  // ─────────────────────────────────────────────────────
  const renderSettings = () => (

    <div className="admin-tab-content">
      {/* General Settings */}
      <div className="admin-card">
        <h3><i className="fa-solid fa-gear"></i> Pengaturan Umum</h3>
        <form onSubmit={handleSaveGeneralSettings}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nama Toko</label>
              <input className="form-input" value={shopName} onChange={e => setShopName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Nomor WhatsApp Admin</label>
              <input className="form-input" value={waNumber} onChange={e => setWaNumber(e.target.value)} placeholder="6281234567890 (tanpa +)" />
              <p className="field-helper">Format: 62xxxxxxxxxx (tanpa tanda + di depan)</p>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Ukuran Tersedia (pisahkan koma)</label>
            <input className="form-input" value={availableSizes} onChange={e => setAvailableSizes(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Judul Katalog Produk</label>
            <div className="catalog-heading-preview-wrap">
              <input
                className="form-input"
                value={catalogHeading}
                onChange={e => setCatalogHeading(e.target.value)}
                placeholder="Pilih Papan Favoritmu"
                maxLength={60}
              />
              <div className="catalog-heading-preview">
                <span className="catalog-heading-preview-label">Preview:</span>
                <span className="catalog-heading-preview-text">{catalogHeading || 'Pilih Papan Favoritmu'}</span>
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Jam Operasional</label>
              <input className="form-input" value={storeHours} onChange={e => setStoreHours(e.target.value)} placeholder="Senin - Sabtu: 08.00 - 17.00 WIB" />
            </div>
            <div className="form-group">
              <label className="form-label">TomTom API Key</label>
              <input className="form-input" value={tomtomApiKey} onChange={e => setTomtomApiKey(e.target.value)} placeholder="Masukkan API Key dari TomTom" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Batas Maksimal Jam Pengembalian</label>
              <input className="form-input" value={returnTime} onChange={e => setReturnTime(e.target.value)} placeholder="Cth: 16.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Kebijakan Pengembalian</label>
              <textarea className="form-input textarea-input" rows={2} value={storePolicy} onChange={e => setStorePolicy(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              <i className="fa-solid fa-floppy-disk"></i> Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>

      {/* Logo & Favicon Settings */}
      <div className="admin-card mt-4">
        <h3><i className="fa-solid fa-image"></i> Logo & Ikon Website</h3>
        <p className="field-helper mb-3">Atur logo utama dan ikon browser (favicon) agar sesuai dengan identitas merek Anda.</p>
        <form onSubmit={handleSaveGeneralSettings}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Logo Utama Website (PNG/JPG)</label>
              <input type="file" accept="image/*" className="form-input" onChange={handleLogoUpload} />
              <p className="field-helper mt-1" style={{ fontSize: '0.8rem' }}>
                <i className="fa-solid fa-circle-info text-blue"></i> <b>Rekomendasi:</b> Format PNG (latar transparan), orientasi persegi (1:1) atau bebas.<br/>
                Gambar ini <b>hanya akan menggantikan ikon bintang</b> (teks nama toko tetap dipertahankan). Berapa pun ukurannya, sistem akan merespons (Smart Sizing) agar pas dengan tinggi menu. Maks: 2MB.
              </p>
              {logoImage && (
                <div className="mt-2 p-2" style={{ background: '#f8f9fa', borderRadius: '4px', border: '1px dashed #ccc', display: 'inline-block' }}>
                  <img src={logoImage} alt="Logo Preview" style={{ maxHeight: '40px', width: 'auto', objectFit: 'contain' }} />
                </div>
              )}
            </div>
          </div>
          
          <div className="form-row mt-3">
            <div className="form-group">
              <label className="form-label">Ikon Browser / Favicon (PNG/ICO)</label>
              <input type="file" accept=".png,.ico,image/png,image/x-icon" className="form-input" onChange={handleFaviconUpload} />
              <p className="field-helper mt-1" style={{ fontSize: '0.8rem' }}>
                <i className="fa-solid fa-circle-info text-blue"></i> <b>Rekomendasi:</b> Format PNG/ICO, rasio kotak presisi 1:1 (contoh: 128x128 piksel). Maks: 500KB.
              </p>
              {faviconImage && (
                <div className="mt-2">
                  <img src={faviconImage} alt="Favicon Preview" style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              )}
            </div>
          </div>
          
          <div className="form-actions mt-3">
            <button type="submit" className="btn-primary">
              <i className="fa-solid fa-floppy-disk"></i> Simpan Logo & Ikon
            </button>
          </div>
        </form>
      </div>

      {/* Font Management */}
      <div className="admin-card mt-4">
        <h3><i className="fa-solid fa-font"></i> Manajemen Font Kustom</h3>
        <div className="font-upload-panel">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nama Font</label>
              <input className="form-input" placeholder="Cth: MyBeautifulFont" value={newFontName} onChange={e => setNewFontName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">File Font (.ttf / .otf)</label>
              <input type="file" accept=".ttf,.otf" className="form-input file-input" onChange={handleFontUpload} disabled={isFontUploading} />
            </div>
          </div>
        </div>

        <div className="font-list mt-3">
          {customFonts.length === 0 && <p className="empty-hint">Belum ada font kustom yang diupload.</p>}
          {customFonts.map(f => (
            <div key={f.id} className="font-item">
              <span style={{ fontFamily: f.name }}>{f.name}</span>
              <button className="btn-icon-del small" onClick={() => handleDeleteFont(f.id)}>
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────
  //  RENDER TAB: FOOTER SETTINGS
  // ─────────────────────────────────────────────────────
  const renderFooterSettings = () => (
    <div className="admin-tab-content">
      <div className="admin-card">
        <h3><i className="fa-solid fa-layer-group"></i> Pengaturan Footer</h3>
        <p className="field-helper" style={{marginBottom: '20px'}}>
          Sesuaikan teks tagline, tautan sosial media, dan hak cipta. *Note: Info kontak otomatis diambil dari Pengaturan Umum.*
        </p>
        
        <form onSubmit={handleSaveFooterSettings}>
          <div className="form-group">
            <label className="form-label">Tagline Brand</label>
            <input className="form-input" value={footerTagline} onChange={e => setFooterTagline(e.target.value)} />
          </div>

          <h4 style={{marginTop: '20px', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-dark)'}}>Badge Kepercayaan (Trust Badges)</h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Badge 1</label>
              <input className="form-input" value={footerTrustBadge1} onChange={e => setFooterTrustBadge1(e.target.value)} placeholder="Contoh: 500+ Wisudawan Puas" />
            </div>
            <div className="form-group">
              <label className="form-label">Badge 2</label>
              <input className="form-input" value={footerTrustBadge2} onChange={e => setFooterTrustBadge2(e.target.value)} placeholder="Contoh: Pengiriman Cepat" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Badge 3</label>
            <input className="form-input" value={footerTrustBadge3} onChange={e => setFooterTrustBadge3(e.target.value)} placeholder="Contoh: Kualitas Premium" />
          </div>

          <h4 style={{marginTop: '20px', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-dark)'}}>Tautan Media Sosial</h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label"><i className="fa-brands fa-instagram"></i> Link Instagram</label>
              <input className="form-input" value={footerInstagram} onChange={e => setFooterInstagram(e.target.value)} placeholder="https://instagram.com/acrilygrad" />
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fa-brands fa-tiktok"></i> Link TikTok</label>
              <input className="form-input" value={footerTiktok} onChange={e => setFooterTiktok(e.target.value)} placeholder="https://tiktok.com/@acrilygrad" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label"><i className="fa-brands fa-facebook"></i> Link Facebook</label>
            <input className="form-input" value={footerFacebook} onChange={e => setFooterFacebook(e.target.value)} placeholder="https://facebook.com/acrilygrad" />
          </div>

          <h4 style={{marginTop: '20px', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-dark)'}}>Hak Cipta</h4>
          <div className="form-group">
            <label className="form-label">Teks Hak Cipta</label>
            <input className="form-input" value={footerCopyright} onChange={e => setFooterCopyright(e.target.value)} placeholder="© 2025 AcrilyGrad. Semua hak dilindungi." />
          </div>

          <h4 style={{marginTop: '20px', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-dark)'}}>Konten Modal Footer</h4>
          <div className="form-group">
            <label className="form-label">Cara Pemesanan</label>
            <textarea className="form-input textarea-input" rows={4} value={footerHowToOrder} onChange={e => setFooterHowToOrder(e.target.value)} placeholder="Teks yang muncul saat Cara Pemesanan diklik" />
          </div>
          <div className="form-group">
            <label className="form-label">Hubungi Kami</label>
            <textarea className="form-input textarea-input" rows={4} value={footerContactUs} onChange={e => setFooterContactUs(e.target.value)} placeholder="Teks yang muncul saat Hubungi Kami diklik" />
          </div>

          <div className="form-actions" style={{marginTop: '24px'}}>
            <button type="submit" className="btn-primary">
              <i className="fa-solid fa-floppy-disk"></i> Simpan Footer
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────
  //  RENDER TAB: GALLERY
  // ─────────────────────────────────────────────────────
  const handleAddGalleryPhoto = () => {
    if (!newPhotoUrl.trim()) { toast.error('URL gambar tidak boleh kosong!'); return; }
    setGalleryPhotos(prev => [...prev, { id: Date.now(), imageUrl: newPhotoUrl.trim(), caption: newPhotoCaption.trim() }]);
    setNewPhotoUrl('');
    setNewPhotoCaption('');
    toast.success('Foto ditambahkan! Jangan lupa klik Simpan.');
  };

  const handleDeleteGalleryPhoto = (id) => {
    setGalleryPhotos(prev => prev.filter(p => p.id !== id));
    toast.success('Foto dihapus. Jangan lupa klik Simpan.');
  };

  const handleSaveGallery = async (e) => {
    if (e) e.preventDefault();
    try {
      await saveSettingItem('galleryPhotos', galleryPhotos);
      await saveSettingItem('galleryEnabled', galleryEnabled);
      onRefreshData();
      toast.success('Galeri berhasil disimpan!');
    } catch {
      toast.error('Gagal menyimpan galeri.');
    }
  };

  const renderGallery = () => (
    <div className="admin-tab-content">
      <div className="admin-card">
        <h3><i className="fa-solid fa-images"></i> Galeri Dokumentasi Pelanggan</h3>
        <p className="field-helper" style={{ marginBottom: '20px' }}>
          Tambahkan foto-foto dokumentasi pelanggan yang pernah memesan. Foto akan ditampilkan di halaman utama di bawah section "Apa Kata Mereka?".
        </p>

        {/* Toggle On/Off */}
        <div className="gallery-toggle-wrap">
          <button
            type="button"
            className={`gallery-toggle-switch ${galleryEnabled ? 'active' : ''}`}
            onClick={() => setGalleryEnabled(v => !v)}
          />
          <div>
            <strong style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}>
              {galleryEnabled ? (
                <><i className="fa-solid fa-check-circle" style={{ color: '#22c55e', marginRight: '6px' }}></i> Galeri Aktif</>
              ) : (
                <><i className="fa-solid fa-times-circle" style={{ color: '#ef4444', marginRight: '6px' }}></i> Galeri Nonaktif</>
              )}
            </strong>
            <p className="field-helper" style={{ margin: 0, fontSize: '0.8rem' }}>
              {galleryEnabled ? 'Section galeri foto ditampilkan di halaman utama.' : 'Section galeri disembunyikan dari halaman utama.'}
            </p>
          </div>
        </div>

        {/* Form Tambah Foto */}
        <div className="admin-card" style={{ background: '#f8f9fa', padding: '20px', marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px', fontSize: '1rem' }}><i className="fa-solid fa-plus-circle" style={{ color: 'var(--primary-pink)', marginRight: '8px' }}></i>Tambah Foto Baru</h4>
          <div className="form-group mb-2">
            <label className="form-label">URL Gambar</label>
            <input
              className="form-input"
              placeholder="Contoh: https://imgur.com/foto-wisuda.jpg"
              value={newPhotoUrl}
              onChange={e => setNewPhotoUrl(e.target.value)}
            />
          </div>
          {newPhotoUrl && (
            <div style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'inline-block' }}>
              <img src={newPhotoUrl} alt="Preview" style={{ display: 'block', maxHeight: '120px', maxWidth: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div className="form-group mb-3">
            <label className="form-label">Deskripsi / Caption (Opsional)</label>
            <input
              className="form-input"
              placeholder="Contoh: Wisuda 2023"
              value={newPhotoCaption}
              onChange={e => setNewPhotoCaption(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddGalleryPhoto(); } }}
            />
          </div>
          <button type="button" className="btn-primary" onClick={handleAddGalleryPhoto} style={{ fontSize: '0.9rem' }}>
            <i className="fa-solid fa-plus"></i> Tambah Foto
          </button>
        </div>

        {/* Daftar Foto */}
        {galleryPhotos.length === 0 ? (
          <p className="empty-hint"><i className="fa-solid fa-image" style={{ marginRight: '6px' }}></i>Belum ada foto. Tambahkan foto pertama Anda di atas!</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {galleryPhotos.map(photo => (
              <div key={photo.id} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' }}>
                <img src={photo.imageUrl} alt={photo.caption || 'Foto'} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} />
                {photo.caption && (
                  <div style={{ padding: '8px 10px', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid #f0f0f0' }}>
                    {photo.caption}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteGalleryPhoto(photo.id)}
                  style={{
                    position: 'absolute', top: '6px', right: '6px',
                    background: 'rgba(220,38,38,0.85)', color: 'white',
                    border: 'none', borderRadius: '50%',
                    width: '28px', height: '28px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}
                  title="Hapus foto"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={handleSaveGallery}>
            <i className="fa-solid fa-floppy-disk"></i> Simpan Galeri ({galleryPhotos.length} foto)
          </button>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────
  //  RENDER TAB: MAPS GUIDE
  // ─────────────────────────────────────────────────────
  const renderMapsGuide = () => {
    const activeTab = mapsGuideTabs.find(t => t.id === activeMapsTabId) || mapsGuideTabs[0];
    const activeTabIndex = mapsGuideTabs.findIndex(t => t.id === activeMapsTabId);

    return (
      <div className="admin-tab-content">
        <div className="admin-card">
          <h3><i className="fa-solid fa-map-location-dot"></i> Editor Panduan Lokasi (Maps)</h3>
          <p className="field-helper" style={{marginBottom: '20px'}}>
            Ubah langkah-langkah yang akan ditampilkan kepada pelanggan saat mereka ingin menyalin Plus Code atau koordinat dari Google Maps.
          </p>

          <div className="maps-guide-tabs mb-4">
            {mapsGuideTabs.map(tab => (
              <button
                key={tab.id}
                className={`maps-guide-tab ${activeMapsTabId === tab.id ? 'active' : ''}`}
                onClick={() => setActiveMapsTabId(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSaveMapsGuide}>
            <div className="steps-editor-list">
              {activeTab && activeTab.steps.map((step, idx) => (
                <div key={idx} className="admin-card" style={{ padding: '16px', marginBottom: '12px', background: '#f8f9fa' }}>
                  <div className="form-group mb-2">
                    <label className="form-label">Langkah {idx + 1} - Judul</label>
                    <input 
                      className="form-input" 
                      value={step.title} 
                      onChange={e => handleMapsGuideChange(activeTab.id, idx, 'title', e.target.value)} 
                    />
                  </div>
                  <div className="form-group mb-2">
                    <label className="form-label">Langkah {idx + 1} - Deskripsi</label>
                    <textarea 
                      className="form-input textarea-input" 
                      rows={3} 
                      value={step.desc} 
                      onChange={e => handleMapsGuideChange(activeTab.id, idx, 'desc', e.target.value)} 
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">Langkah {idx + 1} - URL Gambar (Opsional)</label>
                    <input 
                      className="form-input" 
                      placeholder="Cth link: https://imgur.com/image.png"
                      value={step.imageUrl || ''} 
                      onChange={e => handleMapsGuideChange(activeTab.id, idx, 'imageUrl', e.target.value)} 
                    />
                    {step.imageUrl && (
                      <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'inline-block' }}>
                        <img src={step.imageUrl} alt={`Preview ${step.title}`} style={{ display: 'block', maxHeight: '150px', maxWidth: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-card" style={{ padding: '16px', marginBottom: '12px', background: '#f8f9fa' }}>
              <div className="form-group mb-0">
                <label className="form-label">URL Video YouTube Tutorial (Opsional)</label>
                <input 
                  className="form-input" 
                  placeholder="Contoh: https://www.youtube.com/watch?v=..."
                  value={mapsVideoUrl} 
                  onChange={e => setMapsVideoUrl(e.target.value)} 
                />
                <p className="field-helper mt-1" style={{ fontSize: '12px' }}>
                  Jika diisi, video akan ditampilkan di bawah panduan Maps. Biarkan kosong jika tidak ada video.
                </p>
              </div>
            </div>

            <div className="form-actions mt-4">
              <button type="submit" className="btn-primary">
                <i className="fa-solid fa-floppy-disk"></i> Simpan Panduan
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────
  //  RENDER TAB: FAQ
  // ─────────────────────────────────────────────────────
  const handleSaveFaq = async (e) => {
    e.preventDefault();
    let updatedFaqs = [...faqs];
    if (editingFaq) {
      updatedFaqs = updatedFaqs.map(f => f.id === editingFaq.id ? { ...f, ...faqForm } : f);
    } else {
      updatedFaqs.push({ id: 'faq-' + Date.now(), ...faqForm });
    }
    try {
      await saveSettingItem('faqs', updatedFaqs);
      setFaqs(updatedFaqs);
      setEditingFaq(null);
      setFaqForm({ question: '', answer: '' });
      toast.success('FAQ berhasil disimpan!');
      onRefreshData();
    } catch (err) { toast.error('Gagal menyimpan FAQ.'); }
  };

  const handleEditFaq = (faq) => {
    setEditingFaq(faq);
    setFaqForm({ question: faq.question, answer: faq.answer });
  };

  const handleDeleteFaq = async (id) => {
    const confirm = await confirmDialog('Hapus FAQ?', 'Apakah Anda yakin ingin menghapus pertanyaan ini?');
    if (!confirm) return;
    const updatedFaqs = faqs.filter(f => f.id !== id);
    try {
      await saveSettingItem('faqs', updatedFaqs);
      setFaqs(updatedFaqs);
      toast.success('FAQ dihapus.');
      onRefreshData();
    } catch (err) { toast.error('Gagal menghapus FAQ.'); }
  };

  const renderFaq = () => (
    <div className="admin-tab-content animate-fade-in">
      <div className="admin-card mb-4">
        <h3>{editingFaq ? 'Edit FAQ' : 'Tambah FAQ Baru'}</h3>
        <form onSubmit={handleSaveFaq}>
          <div className="form-group mb-2">
            <label className="form-label">Pertanyaan</label>
            <input 
              className="form-input" 
              value={faqForm.question} 
              onChange={e => setFaqForm({ ...faqForm, question: e.target.value })} 
              required 
            />
          </div>
          <div className="form-group mb-2">
            <label className="form-label">Jawaban</label>
            <textarea 
              className="form-input textarea-input" 
              rows={3} 
              value={faqForm.answer} 
              onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })} 
              required 
            />
          </div>
          <div className="form-actions mt-4">
            <button type="submit" className="btn-primary">
              <i className="fa-solid fa-floppy-disk"></i> {editingFaq ? 'Simpan FAQ' : 'Tambah FAQ'}
            </button>
            {editingFaq && (
              <button type="button" className="btn-secondary" onClick={() => { setEditingFaq(null); setFaqForm({ question: '', answer: '' }); }}>Batal</button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h3>Daftar FAQ</h3>
        {faqs.length === 0 ? (
          <p className="field-helper">Belum ada FAQ. Silakan tambahkan di atas.</p>
        ) : (
          <div className="faq-list-admin" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map(faq => (
              <div key={faq.id} style={{ padding: '16px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>{faq.question}</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.5 }}>{faq.answer}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => handleEditFaq(faq)} style={{ padding: '6px 12px' }}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDeleteFaq(faq.id)} style={{ padding: '6px 12px' }}>Hapus</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────
  //  RENDER TAB: AKUN ADMIN
  // ─────────────────────────────────────────────────────
  const renderAccount = () => (
    <div className="admin-tab-content animate-fade-in">
      <div className="admin-card mb-4" style={{ maxWidth: '500px' }}>
        <h3><i className="fa-solid fa-user-shield"></i> Pengaturan Akun Admin</h3>
        <p className="field-helper" style={{ marginBottom: '20px' }}>
          Ubah username dan password untuk login ke panel admin.
        </p>
        <form onSubmit={handleSaveAccount}>
          <div className="form-group mb-2">
            <label className="form-label">Username Baru</label>
            <input 
              type="text"
              className="form-input" 
              value={adminUsername} 
              onChange={e => setAdminUsername(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group mb-2">
            <label className="form-label">Password Baru</label>
            <input 
              type="password"
              className="form-input" 
              value={adminPassword} 
              onChange={e => setAdminPassword(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Password Lama</label>
            <input 
              type="password"
              className="form-input" 
              value={oldPassword} 
              onChange={e => setOldPassword(e.target.value)} 
              required 
              placeholder="Masukkan sandi lama untuk memvalidasi"
            />
          </div>
          <div className="form-actions mt-4">
            <button type="submit" className="btn-primary">
              <i className="fa-solid fa-floppy-disk"></i> Simpan Kredensial
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card" style={{ maxWidth: '500px', backgroundColor: '#fff1f2', borderColor: '#ffe4e6' }}>
        <h4 style={{ color: '#be123c', marginBottom: '8px' }}>Keluar dari Panel Admin</h4>
        <p style={{ fontSize: '0.9rem', color: '#881337', marginBottom: '16px' }}>Akhiri sesi login admin Anda.</p>
        <button className="btn-danger" onClick={handleLogout}>
          <i className="fa-solid fa-arrow-right-from-bracket"></i> Logout
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────
  //  MAIN RENDER
  // ─────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <AdminLogin settings={settings} onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="admin-container animate-fade-in">
      <div className="admin-title-row">
        <h2><i className="fa-solid fa-screwdriver-wrench admin-title-icon"></i> Dashboard Admin</h2>
        <span className="admin-subtitle">Panel Kendali Toko {shopName}</span>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tab-nav">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`admin-tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => handleTabClick(t.id)}
          >
            <i className={`fa-solid ${t.icon}`}></i>
            <span>{t.label}</span>
            {t.badge > 0 && <span className="tab-badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'products' && renderProducts()}
      {activeTab === 'categories' && renderCategories()}
      {activeTab === 'orders' && renderOrders()}
      {activeTab === 'blog' && <AdminBlog />}
      {activeTab === 'shipping' && renderShipping()}
      {activeTab === 'vouchers' && renderVouchers()}
      {activeTab === 'hero' && renderHero()}
      {activeTab === 'seo' && renderSeo()}
      {activeTab === 'mapsguide' && renderMapsGuide()}
      {activeTab === 'gallery' && renderGallery()}
      {activeTab === 'settings' && renderSettings()}
      {activeTab === 'footer' && renderFooterSettings()}
      {activeTab === 'faq' && renderFaq()}
      {activeTab === 'account' && renderAccount()}
    </div>
  );
};

export default AdminDashboard;
