import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Share2, X, ZoomIn } from 'lucide-react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import FAQ from './FAQ';

const ProductDetail = ({ catalog, settings = {} }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = catalog.find(p => p.id === id);

  const [activeImg, setActiveImg] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isMagnifying, setIsMagnifying] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [copySuccess, setCopySuccess] = useState(false);

  // Variant Handling
  const prodVariants = product ? (product.variants && product.variants.length > 0 
    ? product.variants 
    : [{ id: 'default', size: product.size, price: product.price, discountPrice: product.discountPrice, stock: product.stock }]) : [];

  const [selectedVariantId, setSelectedVariantId] = useState(prodVariants[0]?.id);

  if (!product) {
    return (
      <div className="product-detail-page animate-fade-in" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <h2>Produk tidak ditemukan</h2>
        <Link to="/" className="btn-secondary mt-3">Kembali ke Katalog</Link>
      </div>
    );
  }

  const images = product.images?.length > 0
    ? product.images
    : (product.image ? [product.image] : []);

  const formatPrice = (price) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  const prevImg = () => setActiveImg(i => (i - 1 + images.length) % images.length);
  const nextImg = () => setActiveImg(i => (i + 1) % images.length);

  const handlePointerMove = (e) => {
    // Gunakan pointer event agar mendukung mouse dan touch dengan mudah
    const rect = e.currentTarget.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Hitung posisi kursor dalam persentase (0% - 100%)
    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;
    
    // Batasi nilai agar tidak melebihi batas gambar
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    setZoomPos({ x, y });
  };

  const imgStyle = {
    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
    transform: isMagnifying ? 'scale(2.2)' : 'scale(1)',
    transition: isMagnifying ? 'transform 0.1s ease-out' : 'transform 0.3s ease-out',
    cursor: isMagnifying ? 'zoom-out' : 'zoom-in',
    willChange: 'transform'
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const BADGE_STYLES = {
    Terlaris: { bg: '#ef4444', label: <><i className="fa-solid fa-fire"></i> Terlaris</> },
    Baru: { bg: '#8b5cf6', label: <><i className="fa-solid fa-wand-magic-sparkles"></i> Baru</> },
    Promo: { bg: '#f59e0b', label: <><i className="fa-solid fa-tag"></i> Promo</> },
    Habis: { bg: '#6b7280', label: <><i className="fa-solid fa-xmark"></i> Habis</> }
  };

  const badge = product.badge ? BADGE_STYLES[product.badge] : null;
  const currentVariant = prodVariants.find(v => v.id === selectedVariantId) || prodVariants[0];
  const isOutOfStock = product.badge === 'Habis' || (currentVariant.stock !== undefined && currentVariant.stock <= 0);

  const productImage = (product.images?.[product.mainImageIndex || 0] || product.image) || '';
  const productTitle = `Sewa ${product.name} | ${settings.seoTitle || 'AcrilyGrad'}`;
  const productDesc = product.description
    ? `${product.description.slice(0, 150)}. Sewa ${product.name} harga terjangkau, kualitas premium.`
    : `Sewa ${product.name} untuk momen spesial wisuda Anda. Kualitas premium dan desain elegan. Harga terjangkau.`;
  const minPrice = Math.min(...prodVariants.map(v => v.discountPrice || v.price || 0));

  return (
    <div className="product-detail-page animate-fade-in">
      <Helmet>
        <title>{productTitle}</title>
        <meta name="description" content={productDesc} />
        <meta name="robots" content="index, follow" />

        {/* Open Graph */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={productTitle} />
        <meta property="og:description" content={productDesc} />
        {productImage && <meta property="og:image" content={productImage} />}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={productTitle} />
        <meta name="twitter:description" content={productDesc} />
        {productImage && <meta name="twitter:image" content={productImage} />}

        {/* Product Schema JSON-LD */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "description": product.description || productDesc,
          "image": productImage || undefined,
          "brand": { "@type": "Brand", "name": settings.shopName || "AcrilyGrad" },
          "offers": {
            "@type": "Offer",
            "priceCurrency": "IDR",
            "price": minPrice,
            "availability": isOutOfStock
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
            "seller": { "@type": "Organization", "name": settings.shopName || "AcrilyGrad" }
          },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Beranda", "item": typeof window !== 'undefined' ? window.location.origin : '' },
              { "@type": "ListItem", "position": 2, "name": product.name }
            ]
          }
        })}</script>
      </Helmet>

      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link to="/">Beranda</Link>
        <span className="separator">/</span>
        <span className="current">{product.name}</span>
      </div>

      <div className="product-detail-layout">
        {/* Left: Image Gallery */}
        <div className="product-gallery">
          {/* Main image with carousel */}
          <div className="gallery-main">
            {images.length > 0 ? (
              <>
                <div 
                  className="magnifier-container" 
                  style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px' }}
                  onMouseEnter={() => setIsMagnifying(true)}
                  onMouseLeave={() => setIsMagnifying(false)}
                  onMouseMove={handlePointerMove}
                  onTouchStart={(e) => { setIsMagnifying(true); handlePointerMove(e); }}
                  onTouchEnd={() => setIsMagnifying(false)}
                  onTouchMove={handlePointerMove}
                >
                  <img src={images[activeImg]} alt={product.name} className="gallery-main-img" style={imgStyle} />
                  {!isMagnifying && <div className="zoom-hint"><ZoomIn size={20} /></div>}
                </div>
                {images.length > 1 && (
                  <>
                    <button className="gallery-arrow left" onClick={prevImg}><ChevronLeft size={20} /></button>
                    <button className="gallery-arrow right" onClick={nextImg}><ChevronRight size={20} /></button>
                    <div className="gallery-dots">
                      {images.map((_, i) => (
                        <span key={i} className={`gallery-dot ${i === activeImg ? 'active' : ''}`} onClick={() => setActiveImg(i)} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className={`gallery-placeholder style-${product.styleType || 'blush-floral'}`}>
                <i className="fa-solid fa-image"></i>
              </div>
            )}

            {/* Badge overlay */}
            {badge && (
              <span className="gallery-badge" style={{ background: badge.bg }}>{badge.label}</span>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="gallery-thumbnails">
              {images.map((img, i) => (
                <img key={i} src={img} alt={`Foto ${i + 1}`}
                  className={`gallery-thumb ${i === activeImg ? 'active' : ''}`}
                  onClick={() => setActiveImg(i)} />
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info */}
        <div className="product-info-panel">
          <div className="detail-header-flex">
            {badge && (
              <span className="info-badge" style={{ background: badge.bg }}>{badge.label}</span>
            )}
            <button className="share-btn" onClick={handleShare} title="Bagikan Tautan">
              <Share2 size={18} /> {copySuccess ? 'Tersalin!' : ''}
            </button>
          </div>

          <h1 className="detail-product-name">{product.name}</h1>

          <div className="detail-price-row">
            {currentVariant.discountPrice ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '1rem', marginBottom: '-5px' }}>{formatPrice(currentVariant.price)}</span>
                <div>
                  <span className="detail-price">{formatPrice(currentVariant.discountPrice)}</span>
                  <span className="detail-price-note">/ hari sewa</span>
                </div>
              </div>
            ) : (
              <>
                <span className="detail-price">{formatPrice(currentVariant.price)}</span>
                <span className="detail-price-note">/ hari sewa</span>
              </>
            )}
          </div>

          {/* Variant Selector */}
          {prodVariants.length > 1 && (
            <div className="variant-selector" style={{ marginTop: '16px', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-dark)', fontWeight: '600' }}>Pilih Ukuran/Diameter:</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {prodVariants.map(v => {
                  const isVarOut = v.stock <= 0;
                  return (
                    <button
                      key={v.id}
                      onClick={() => !isVarOut && setSelectedVariantId(v.id)}
                      disabled={isVarOut}
                      className={`variant-chip ${selectedVariantId === v.id ? 'active' : ''} ${isVarOut ? 'disabled' : ''}`}
                    >
                      {v.size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="detail-specs">
            <div className="detail-spec-item">
              <i className="fa-solid fa-ruler-combined"></i>
              <span>{currentVariant.size}</span>
            </div>
            <div className="detail-spec-item">
              <i className="fa-solid fa-layer-group"></i>
              <span>{product.materialLabel || 'Papan Akrilik Premium'}</span>
            </div>
            <div className={`detail-spec-item ${(currentVariant.stock ?? 1) <= 2 ? 'stock-warn' : ''}`}>
              <i className="fa-solid fa-boxes-stacked"></i>
              <span>
                {isOutOfStock ? 'Stok Habis' : `Tersedia: ${currentVariant.stock ?? '—'} unit`}
              </span>
            </div>
          </div>

          <div className="detail-divider" />

          {/* Description */}
          {product.description && (
            <div className="detail-description">
              <h3>Deskripsi Produk</h3>
              <p className={expanded ? '' : 'desc-clamped'}>
                {product.description}
              </p>
              {product.description.length > 150 && (
                <button className="read-more-btn" onClick={() => setExpanded(!expanded)}>
                  {expanded ? 'Sembunyikan ▲' : 'Baca Selengkapnya ▼'}
                </button>
              )}
            </div>
          )}

          <div className="detail-divider" />

          {/* Policies */}
          <div className="detail-policy-box">
            <div className="policy-item">
              <i className="fa-solid fa-rotate-left"></i>
              <span>Pengembalian maksimal pukul {settings.returnTime || '16.00'} WIB di hari yang sama.</span>
            </div>
            <div className="policy-item">
              <i className="fa-solid fa-shield-heart"></i>
              <span>{product.materialQuality || 'Akrilik premium berkualitas tinggi.'}</span>
            </div>
            <div className="policy-item">
              <i className="fa-brands fa-whatsapp"></i>
              <span>Konfirmasi & pembayaran via WhatsApp.</span>
            </div>
          </div>

          {/* Order CTA */}
          <button
            className="btn-order-now"
            onClick={() => navigate(`/booking/${product.id}?vid=${selectedVariantId}`)}
            disabled={isOutOfStock}
          >
            {isOutOfStock ? (
              <><i className="fa-solid fa-ban"></i> Stok Habis</>
            ) : (
              <><i className="fa-solid fa-cart-plus"></i> Pesan Sekarang</>
            )}
          </button>
        </div>
      </div>

      {/* Global FAQ at bottom */}
      <div style={{ marginTop: '40px' }}>
        <FAQ faqs={settings.faqs || []} />
      </div>
    </div>
  );
};

export default ProductDetail;
