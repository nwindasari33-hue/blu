import React, { useEffect, useRef } from 'react';
import { CheckCircle2, Download, ShoppingBag, MapPin, Calendar, Clock, Smile, Sparkles } from 'lucide-react';

const OrderSuccess = ({ booking, onReturnToCatalog }) => {
  const mapRef = useRef(null);

  // Initialize a static map showing the delivery location
  useEffect(() => {
    if (mapRef.current && booking.coords && window.L) {
      const map = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        touchZoom: false
      }).setView([booking.coords.lat, booking.coords.lng], 15);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      // Add marker
      window.L.marker([booking.coords.lat, booking.coords.lng]).addTo(map);
    }
  }, [booking]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="success-container animate-fade-in">
      <div className="success-card">
        {/* Celebration Header */}
        <div className="success-header">
          <div className="success-icon-badge">
            <CheckCircle2 size={40} className="success-check-icon" />
          </div>
          <h2>Pemesanan Berhasil! <Sparkles className="inline-icon text-pink-400" size={24} /></h2>
          <p className="order-id-label">Order ID: {booking.id}</p>
          <div className="success-status-tag">Lunas (Paid via QRIS)</div>
        </div>

        <div className="success-body">
          {/* Welcome Message */}
          <div className="success-welcome">
            <Smile size={24} className="welcome-icon" />
            <p>Terima kasih! Papan akrilik wisuda Anda sedang dipersiapkan. Berikut adalah rincian penyewaan Anda:</p>
          </div>

          {/* Core Rental Details */}
          <div className="invoice-section">
            <h3>Rincian Papan Akrilik</h3>
            <div className="invoice-details-grid">
              <div className="detail-item">
                <span className="detail-label">Produk Papan:</span>
                <span className="detail-value">{booking.boardName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Nama Penerima:</span>
                <span className="detail-value font-semibold">
                  {booking.recipientName}
                </span>
              </div>
              <div className="detail-item full-width">
                <span className="detail-label">Pesan yang Ditulis:</span>
                <span className="detail-value italic-msg">"{booking.message || '-'}"</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Tanggal Sewa:</span>
                <span className="detail-value date-val">
                  <Calendar size={14} />
                  {booking.rentalDate}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Batas Pengembalian:</span>
                <span className="detail-value return-limit">
                  <Clock size={14} />
                  Maks. 16:00 WIB (Hari H)
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="invoice-section">
            <h3>Pengiriman & Lokasi</h3>
            <div className="invoice-details-grid">
              <div className="detail-item full-width">
                <span className="detail-label">Alamat Pengantaran:</span>
                <span className="detail-value address-val">
                  <MapPin size={14} className="pin-icon" />
                  {booking.address}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Jarak Pengiriman:</span>
                <span className="detail-value">{booking.distance} km</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Ongkos Kirim:</span>
                <span className="detail-value">
                  {booking.shippingFee === 0 ? 'Gratis (Ambil di Toko)' : formatPrice(booking.shippingFee)}
                </span>
              </div>
            </div>

            {/* Static Map View */}
            <div className="static-map-wrapper mt-3">
              <div ref={mapRef} className="static-map-element"></div>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="invoice-price-breakdown">
            <div className="invoice-row">
              <span>Biaya Sewa Papan:</span>
              <span>{formatPrice(booking.totalAmount - booking.shippingFee)}</span>
            </div>
            <div className="invoice-row">
              <span>Biaya Pengiriman:</span>
              <span>{formatPrice(booking.shippingFee)}</span>
            </div>
            <div className="invoice-row grand-total">
              <span>Total Pembayaran:</span>
              <span>{formatPrice(booking.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="success-actions no-print">
          <button className="btn-secondary print-btn" onClick={handlePrintReceipt}>
            <Download size={16} />
            <span>Cetak Invoice</span>
          </button>
          
          <button className="btn-primary shop-again-btn" onClick={onReturnToCatalog}>
            <ShoppingBag size={16} />
            <span>Kembali ke Toko</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
