import React from 'react';
import { Link } from 'react-router-dom';
import Testimonials from './Testimonials';
import PhotoGallery from './PhotoGallery';
import FAQ from './FAQ';

const BADGE_STYLES = {
  Terlaris: { bg: '#ef4444', label: <><i className="fa-solid fa-fire"></i> Terlaris</> },
  Baru: { bg: '#8b5cf6', label: <><i className="fa-solid fa-wand-magic-sparkles"></i> Baru</> },
  Promo: { bg: '#f59e0b', label: <><i className="fa-solid fa-tag"></i> Promo</> },
  Habis: { bg: '#6b7280', label: <><i className="fa-solid fa-xmark"></i> Habis</> }
};

// ── Hero Banner component ───────────────────────────────
const HeroBanner = ({ settings }) => {
  const mode = settings.heroMode || 'text';
  const banners = settings.heroBanners || [];
  const [current, setCurrent] = React.useState(0);
  const timerRef = React.useRef(null);
  const [paused, setPaused] = React.useState(false);

  const count = banners.length;

  const goTo = React.useCallback((idx) => {
    setCurrent((idx + count) % count);
  }, [count]);

  // auto-slide
  React.useEffect(() => {
    if (mode !== 'slider' || count < 2 || paused) return;
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % count), 4000);
    return () => clearInterval(timerRef.current);
  }, [mode, count, paused]);

  if (mode === 'slider' && count > 0) {
    const banner = banners[current];
    return (
      <section
        className="hero-slider animate-fade-in"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* background blur layer */}
        <div
          className="hero-slider-bg"
          style={{ backgroundImage: `url(${banner.url})` }}
        />
        {/* contain image */}
        <div className="hero-slider-img-wrap">
          <img
            src={banner.url}
            alt={`Banner ${current + 1}`}
            className="hero-slider-img"
            draggable={false}
          />
        </div>
        {/* nav buttons */}
        {count > 1 && (
          <>
            <button className="hero-slider-nav left" onClick={() => goTo(current - 1)} aria-label="Prev">
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button className="hero-slider-nav right" onClick={() => goTo(current + 1)} aria-label="Next">
              <i className="fa-solid fa-chevron-right"></i>
            </button>
            {/* dots */}
            <div className="hero-slider-dots">
              {banners.map((_, i) => (
                <button
                  key={i}
                  className={`hero-dot ${i === current ? 'active' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`Banner ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </section>
    );
  }

  // Helper to split title and highlight the middle word
  const renderHighlightedTitle = (titleText) => {
    const words = titleText.split(' ');
    if (words.length <= 2) return <h1>{titleText}</h1>;
    
    // Highlight the 3rd word (or middle word)
    const highlightIndex = Math.min(2, Math.floor(words.length / 2));
    return (
      <h1>
        {words.map((word, idx) => {
          if (idx === highlightIndex) {
            return <span key={idx} className="hero-title-highlight">{word} </span>;
          }
          return <span key={idx}>{word} </span>;
        })}
      </h1>
    );
  };

  const handleScrollToProducts = () => {
    const section = document.querySelector('.catalog-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Text hero (default)
  return (
    <section className="catalog-hero animate-fade-in text-mode-layout">
      <div className="catalog-hero-content text-mode-content">
        {settings.heroChip && (
          <span className="hero-chip text-mode-chip">
            <i className="fa-solid fa-star"></i> {settings.heroChip}
          </span>
        )}
        {renderHighlightedTitle(settings.heroTitle || 'Sewa Papan Akrilik Wisuda')}
        <p className="hero-desc text-mode-desc">
          {settings.heroDesc || 'Rayakan momen wisuda dengan papan akrilik cantik & elegan. Harga terjangkau, kualitas premium, kirim ke lokasi kamu.'}
        </p>
        <button className="btn-hero-cta" onClick={handleScrollToProducts}>
          Mulai Sewa <i className="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </section>
  );
};

const Catalog = ({ catalog, settings = {}, orders = [] }) => {
  const [activeCategory, setActiveCategory] = React.useState('all');

  const returnTime = settings.returnTime || '16.00';

  // Build map: productId → earliest restock ISO string
  const productRestockMap = React.useMemo(() => {
    const map = {};
    const [retH, retM] = returnTime.replace('.', ':').split(':').map(Number);
    orders.forEach(o => {
      if (!o.stockDeducted || o.stockRestored || !o.rentalDate || !o.productId) return;
      const acara = new Date(o.rentalDate);
      const deadline = new Date(acara);
      deadline.setHours(retH, retM ?? 0, 0, 0);
      if (!map[o.productId] || deadline < new Date(map[o.productId])) {
        map[o.productId] = deadline.toISOString();
      }
    });
    return map;
  }, [orders, returnTime]);

  const formatPrice = (price) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  const categories = settings.categories || [];
  
  const filteredCatalog = React.useMemo(() => {
    if (activeCategory === 'all') return catalog;
    return catalog.filter(p => p.categoryId === activeCategory);
  }, [catalog, activeCategory]);

  return (
    <div className="catalog-page">
      {/* Hero Banner */}
      <HeroBanner settings={settings} />

      {/* Product Grid */}
      <section className="catalog-section">
        <div className="catalog-section-header">
          <h2>{settings.catalogHeading || 'Pilih Papan Favoritmu'}</h2>
          <p>{filteredCatalog.length} produk tersedia</p>
        </div>

        {categories.length > 0 && (
          <div className="category-filter-wrapper">
            <button className="category-scroll-btn left" onClick={(e) => {
              e.currentTarget.nextElementSibling.scrollBy({ left: -200, behavior: 'smooth' });
            }}>
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <div className="category-filter-container">
              <button 
                className={`category-chip ${activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                Semua
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id} 
                  className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.icon && <i className={cat.icon} style={{ marginRight: '6px' }}></i>}
                  {cat.name}
                </button>
              ))}
            </div>
            <button className="category-scroll-btn right" onClick={(e) => {
              e.currentTarget.previousElementSibling.scrollBy({ left: 200, behavior: 'smooth' });
            }}>
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        )}

        {filteredCatalog.length === 0 ? (
          <div className="catalog-empty">
            <i className="fa-solid fa-box-open catalog-empty-icon"></i>
            <p>Belum ada produk di kategori ini.</p>
          </div>
        ) : (
          <div className="product-grid">
            {filteredCatalog.map((product, idx) => {
              const mainImg = product.images?.[product.mainImageIndex || 0] || product.image;
              const badge = product.badge ? BADGE_STYLES[product.badge] : null;

              const prodVariants = product.variants && product.variants.length > 0 
                ? product.variants 
                : [{ size: product.size, price: product.price, discountPrice: product.discountPrice, stock: product.stock }];
                
              const minPrice = Math.min(...prodVariants.map(v => v.discountPrice || v.price || 0));
              const totalStock = prodVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
              const isOutOfStock = product.badge === 'Habis' || totalStock <= 0;

              const cardContent = (
                <>
                  {/* Image area */}
                  <div className="product-card-img-wrap">
                    {mainImg ? (
                      <img src={mainImg} alt={product.name} className="product-card-img" />
                    ) : (
                      <div className={`product-card-img-placeholder style-${product.styleType || 'blush-floral'}`}>
                        <i className="fa-solid fa-image placeholder-icon"></i>
                      </div>
                    )}
                    {badge && (
                      <span className="product-card-badge" style={{ background: badge.bg }}>{badge.label}</span>
                    )}
                    {!isOutOfStock && (product.stock ?? 99) <= 2 && (
                      <span className="product-card-badge" style={{ background: '#f97316' }}><i className="fa-solid fa-bolt"></i> Sisa {product.stock}</span>
                    )}
                    {/* SOLD overlay */}
                    {isOutOfStock && (() => {
                      const restockISO = productRestockMap[product.id];
                      const restockDate = restockISO ? new Date(restockISO) : null;
                      const fmt = restockDate
                        ? restockDate.toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':') + ' WIB'
                        : null;
                      return (
                        <div className="sold-overlay">
                          <div className="sold-badge">SOLD</div>
                          {fmt && (
                            <div className="sold-restock-info">
                              <i className="fa-solid fa-clock-rotate-left"></i>
                              <span>Tersedia<br />{fmt}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Info area */}
                  <div className="product-card-info">
                    <div className="product-card-meta">
                      <span className="product-card-size">
                        <i className="fa-solid fa-ruler-combined"></i> {prodVariants.length > 1 ? `${prodVariants.length} Ukuran` : prodVariants[0]?.size?.split(' ')[0]}
                      </span>
                      <span className={`product-card-stock ${isOutOfStock ? 'out' : ''}`}>
                        {isOutOfStock ? 'Habis' : `Stok: ${totalStock}`}
                      </span>
                    </div>

                    <h3 className="product-card-name">{product.name}</h3>

                    {product.description && (
                      <p className="product-card-desc">
                        {product.description.length > 70
                          ? product.description.substring(0, 70) + '...'
                          : product.description}
                      </p>
                    )}

                    <div className="product-card-footer">
                      <div className="product-card-price">
                        {prodVariants.length > 1 ? (
                          <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                            <span className="price-main">{formatPrice(minPrice)}</span>
                            <span className="price-unit">/hari</span>
                          </div>
                        ) : (
                          prodVariants[0].discountPrice ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="price-original" style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '0.8rem', lineHeight: '1' }}>{formatPrice(prodVariants[0].price)}</span>
                              <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                                <span className="price-main" style={{ color: 'var(--primary-color)' }}>{formatPrice(prodVariants[0].discountPrice)}</span>
                                <span className="price-unit">/hari</span>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                              <span className="price-main">{formatPrice(prodVariants[0].price)}</span>
                              <span className="price-unit">/hari</span>
                            </div>
                          )
                        )}
                      </div>
                      <span
                        className={`btn-card-order ${isOutOfStock ? 'btn-disabled' : ''}`}
                      >
                        {isOutOfStock ? 'Habis' : 'Lihat Detail'}
                      </span>
                    </div>
                  </div>
                </>
              );

              return isOutOfStock ? (
                <div key={product.id || idx} className="product-card animate-slide-up" style={{ animationDelay: `${idx * 0.07}s` }}>
                  {cardContent}
                </div>
              ) : (
                <Link
                  key={product.id || idx}
                  to={`/product/${product.id}`}
                  className="product-card animate-slide-up"
                  style={{ animationDelay: `${idx * 0.07}s`, textDecoration: 'none', color: 'inherit' }}
                >
                  {cardContent}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* SEO Content Block (Hanya tampil jika ada isinya) */}
      {settings.seoContent && (
        <section className="seo-content-block">
          <div className="seo-content-inner">
            <p>{settings.seoContent}</p>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      <Testimonials />
      <FAQ faqs={settings.faqs || []} />
      <PhotoGallery photos={settings.galleryPhotos || []} enabled={settings.galleryEnabled ?? false} />
    </div>
  );
};

export default Catalog;
