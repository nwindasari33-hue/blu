import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2, ShieldCheck, Copy, Check } from 'lucide-react';

const QrisModal = ({ bookingData, onClose, onPaymentSuccess }) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      onClose(); // Auto close if expired
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onClose]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(bookingData.id || 'ORD-MOCK-ID');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simulate payment processing
  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onPaymentSuccess();
    }, 1500);
  };

  return (
    <div className="modal-backdrop">
      <div className="qris-modal-card animate-scale-up">
        {/* Modal Header */}
        <div className="qris-header">
          <div className="qris-branding">
            <span className="qris-logo-text">QRIS</span>
            <span className="gpn-logo-text">GPN</span>
          </div>
          <button className="qris-close-btn" onClick={onClose} disabled={isProcessing}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="qris-body">
          {/* Merchant Info */}
          <div className="qris-merchant-info">
            <h3>ACRILYGRAD YOGYAKARTA</h3>
            <p>NMID: ID1020304050607</p>
          </div>

          {/* Amount & Order ID */}
          <div className="qris-amount-card">
            <span className="amount-label">Total Tagihan</span>
            <h2 className="amount-value">{formatPrice(bookingData.totalAmount)}</h2>
            <div className="order-id-row" onClick={handleCopyId}>
              <span>Order ID: <strong>{bookingData.id}</strong></span>
              <button className="copy-btn">
                {copied ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Timer */}
          <div className="qris-timer-pill">
            <Clock size={16} />
            <span>Sisa Waktu Pembayaran: <strong>{formatTime(timeLeft)}</strong></span>
          </div>

          {/* QR Code Graphic (Drawn using styled CSS/SVG to look exactly like a real QRIS) */}
          <div className="qris-qr-container">
            <div className="qris-qr-frame">
              {/* Actual QRIS look-alike SVG with logo in center */}
              <svg width="200" height="200" viewBox="0 0 100 100" className="qris-svg">
                {/* Background */}
                <rect width="100" height="100" fill="#ffffff" />
                {/* Top Left Eye */}
                <rect x="5" y="5" width="25" height="25" fill="#000000" />
                <rect x="9" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="13" width="9" height="9" fill="#000000" />
                {/* Top Right Eye */}
                <rect x="70" y="5" width="25" height="25" fill="#000000" />
                <rect x="74" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="78" y="13" width="9" height="9" fill="#000000" />
                {/* Bottom Left Eye */}
                <rect x="5" y="70" width="25" height="25" fill="#000000" />
                <rect x="9" y="74" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="78" width="9" height="9" fill="#000000" />
                
                {/* Scattered QR modules (simulated points) */}
                <rect x="35" y="5" width="5" height="10" fill="#000000" />
                <rect x="45" y="10" width="10" height="5" fill="#000000" />
                <rect x="60" y="5" width="5" height="15" fill="#000000" />
                <rect x="35" y="20" width="15" height="5" fill="#000000" />
                <rect x="55" y="20" width="10" height="10" fill="#000000" />
                
                <rect x="5" y="35" width="10" height="5" fill="#000000" />
                <rect x="20" y="35" width="10" height="10" fill="#000000" />
                <rect x="35" y="35" width="5" height="5" fill="#000000" />
                <rect x="45" y="40" width="15" height="5" fill="#000000" />
                <rect x="65" y="35" width="10" height="15" fill="#000000" />
                <rect x="80" y="35" width="15" height="5" fill="#000000" />
                
                <rect x="5" y="50" width="15" height="10" fill="#000000" />
                <rect x="25" y="55" width="5" height="10" fill="#000000" />
                <rect x="35" y="50" width="20" height="5" fill="#000000" />
                <rect x="60" y="55" width="10" height="10" fill="#000000" />
                <rect x="75" y="50" width="5" height="15" fill="#000000" />
                <rect x="85" y="55" width="10" height="5" fill="#000000" />
                
                <rect x="35" y="70" width="10" height="5" fill="#000000" />
                <rect x="50" y="75" width="15" height="10" fill="#000000" />
                <rect x="35" y="85" width="5" height="10" fill="#000000" />
                <rect x="45" y="90" width="20" height="5" fill="#000000" />
                
                <rect x="70" y="70" width="5" height="25" fill="#000000" />
                <rect x="80" y="75" width="15" height="5" fill="#000000" />
                <rect x="85" y="85" width="10" height="10" fill="#000000" />

                {/* QRIS Center Branding Box */}
                <rect x="38" y="38" width="24" height="24" rx="2" fill="#ffffff" stroke="#102a43" strokeWidth="1" />
                <text x="50" y="51" fontSize="7" fontWeight="bold" fontFamily="Inter, sans-serif" fill="#102a43" textAnchor="middle">QRIS</text>
                <line x1="42" y1="54" x2="58" y2="54" stroke="#e1251b" strokeWidth="1.5" />
              </svg>
            </div>
            
            <p className="qr-scan-instruction">Pindai kode QR di atas menggunakan aplikasi pembayaran Anda (GoPay, OVO, Dana, ShopeePay, LinkAja, atau Mobile Banking).</p>
          </div>

          <div className="qris-security-badge">
            <ShieldCheck size={14} className="security-icon" />
            <span>Pembayaran Aman & Terverifikasi Otomatis</span>
          </div>

          {/* Prototype Simulation Action */}
          <div className="qris-simulation-zone">
            <p className="simulation-text"><strong>Mode Demo / Uji Coba:</strong></p>
            <button 
              className="btn-primary simulate-pay-btn" 
              onClick={handleSimulatePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span>Memproses Pembayaran...</span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Simulasikan Pembayaran Sukses</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrisModal;
