import React from 'react';
import { Sparkles, MapPin, Clock, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = ({ settings }) => {
  const shopName = settings.shopName || 'AcrilyGrad';
  const tagline = settings.footerTagline || 'Hadirkan momen wisuda yang tak terlupakan dengan sentuhan elegan.';
  const badges = [
    settings.footerTrustBadge1,
    settings.footerTrustBadge2,
    settings.footerTrustBadge3
  ].filter(Boolean);

  const address = settings.shops?.[0]?.address || 'Alamat Toko Belum Diatur';
  const hours = settings.storeHours || 'Senin - Sabtu: 08.00 - 17.00 WIB';
  const waNumber = settings.waNumber || '';
  const waLink = waNumber ? `https://wa.me/${waNumber.replace(/[^0-9]/g, '')}` : '#';

  const formatUrl = (url) => {
    if (!url) return '';
    if (!url.startsWith('http')) return 'https://' + url;
    return url;
  };

  const extractUsername = (url) => {
    if (!url) return '';
    try {
      const fullUrl = formatUrl(url);
      const u = new URL(fullUrl);
      const parts = u.pathname.split('/').filter(p => p);
      if (parts.length > 0) return '@' + parts[0].replace('@', '');
    } catch {
      if (url.startsWith('@')) return url;
      return '@' + url;
    }
    return url;
  };

  const socialLinks = [
    { icon: 'fa-instagram', url: formatUrl(settings.footerInstagram), label: 'Instagram', username: extractUsername(settings.footerInstagram) },
    { icon: 'fa-tiktok', url: formatUrl(settings.footerTiktok), label: 'TikTok', username: extractUsername(settings.footerTiktok) },
    { icon: 'fa-facebook', url: formatUrl(settings.footerFacebook), label: 'Facebook', username: extractUsername(settings.footerFacebook) },
    { icon: 'fa-whatsapp', url: waNumber ? waLink : '', label: 'WhatsApp', username: waNumber ? `+${waNumber}` : '' }
  ];

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-inner">
          <div className="footer-grid">
            
            {/* Kolom 1: Brand */}
            <div className="footer-col-brand">
              <div className="footer-logo-wrap">
                {settings?.logoImage ? (
                  <img src={settings.logoImage} alt="Logo" className="custom-footer-logo" style={{ maxHeight: '32px', width: 'auto', objectFit: 'contain' }} />
                ) : (
                  <Sparkles className="footer-logo-icon" size={24} />
                )}
                <span className="footer-brand-name">{shopName}</span>
              </div>
              <p className="footer-brand-tagline">{tagline}</p>
              <div className="footer-divider"></div>
              {badges.length > 0 && (
                <div className="footer-trust-badges">
                  {badges.map((b, i) => {
                    let iconClass = "fa-solid fa-check-circle";
                    if (i === 0) iconClass = "fa-solid fa-graduation-cap";
                    if (i === 1) iconClass = "fa-solid fa-truck-fast";
                    if (i === 2) iconClass = "fa-solid fa-star";
                    return (
                      <div key={i} className="footer-trust-badge">
                        <i className={iconClass} style={{ marginRight: '6px' }}></i>
                        {b}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Kolom 2: Navigasi */}
            <div className="footer-col">
              <h4 className="footer-col-title">Jelajahi</h4>
              <div className="footer-col-divider"></div>
              <ul className="footer-link-list">
                <li><Link to="/" onClick={() => window.scrollTo(0, 0)} className="footer-link">Katalog Produk</Link></li>
                <li><Link to="/blog" onClick={() => window.scrollTo(0, 0)} className="footer-link">Blog & Artikel</Link></li>
                <li><Link to="/page/cara-pemesanan" className="footer-link">Cara Pemesanan</Link></li>
                <li><Link to="/page/hubungi-kami" className="footer-link">Hubungi Kami</Link></li>
              </ul>
            </div>

            {/* Kolom 3: Info Toko */}
            <div className="footer-col">
              <h4 className="footer-col-title">Info Toko</h4>
              <div className="footer-col-divider"></div>
              <div className="footer-info-list">
                <div className="footer-info-item">
                  <Clock className="footer-info-icon" size={16} />
                  <span>{hours}</span>
                </div>
                <div className="footer-info-item">
                  <MapPin className="footer-info-icon" size={16} />
                  <span>{address}</span>
                </div>
                <div className="footer-info-item">
                  <Phone className="footer-info-icon" size={16} />
                  <a href={waLink} target="_blank" rel="noreferrer" className="footer-link" style={{ margin: 0 }}>
                    +{waNumber}
                  </a>
                </div>
              </div>
            </div>

            {/* Kolom 4: Ikuti Kami */}
            <div className="footer-col">
              <h4 className="footer-col-title">Ikuti Kami</h4>
              <div className="footer-col-divider"></div>
              <div className="footer-social-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {socialLinks.map((s, i) => (
                  <a 
                    key={i} 
                    href={s.url || '#'} 
                    target="_blank"
                    rel="noreferrer"
                    className="footer-link"
                    title={s.label}
                    onClick={e => { if (!s.url) e.preventDefault(); }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      opacity: !s.url ? 0.5 : 1,
                      margin: 0
                    }}
                  >
                    <div className="footer-social-btn" style={{ margin: 0, width: '36px', height: '36px' }}>
                      <i className={`fa-brands ${s.icon}`}></i>
                    </div>
                    <span>
                      {s.url ? (s.username || s.label) : `${s.label} (Belum Diatur)`}
                    </span>
                  </a>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Lapisan Bawah: Copyright */}
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <span className="footer-copyright">
            {settings.footerCopyright || '© 2025 AcrilyGrad. Semua hak dilindungi.'}
          </span>
          <span className="footer-made-with">
            Made with ❤️ untuk wisudawan Indonesia
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
