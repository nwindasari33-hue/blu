import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import '../App.css';

const CustomPage = ({ settings }) => {
  const { slug } = useParams();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  let title = '';
  let content = '';

  if (slug === 'cara-pemesanan') {
    title = 'Cara Pemesanan';
    content = settings.footerHowToOrder || 'Konten belum tersedia.';
  } else if (slug === 'hubungi-kami') {
    title = 'Hubungi Kami';
    content = settings.footerContactUs || 'Konten belum tersedia.';
  } else {
    title = 'Halaman Tidak Ditemukan';
    content = 'Halaman yang Anda cari tidak tersedia.';
  }

  return (
    <div className="product-detail-container animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', minHeight: '60vh', padding: '20px' }}>
      <Link to="/" className="back-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#6b7280', marginBottom: '24px' }}>
        <ChevronLeft size={20} />
        <span>Kembali ke Beranda</span>
      </Link>
      
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#1f2937', marginBottom: '24px', borderBottom: '2px solid #f3f4f6', paddingBottom: '16px' }}>
          {title}
        </h1>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#4b5563', fontSize: '1rem' }}>
          {content}
        </div>
      </div>
    </div>
  );
};

export default CustomPage;
