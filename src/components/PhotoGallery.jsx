import React, { useState, useEffect } from 'react';

const PHOTOS_PER_PAGE = 8;

const PhotoGallery = ({ photos = [], enabled = false }) => {
  const [visibleCount, setVisibleCount] = useState(PHOTOS_PER_PAGE);
  const [lightbox, setLightbox] = useState(null); // { imageUrl, caption }

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightbox) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightbox]);

  if (!enabled || photos.length === 0) return null;

  const visiblePhotos = photos.slice(0, visibleCount);
  const hasMore = visibleCount < photos.length;

  return (
    <section className="photo-gallery-section">
      <div className="photo-gallery-header">
        <i className="fa-solid fa-camera-retro photo-gallery-icon"></i>
        <h2>Dokumentasi Pelanggan Kami</h2>
        <p>Momen-momen spesial wisuda dari pelanggan yang telah mempercayakan kami</p>
      </div>

      <div className="photo-gallery-grid">
        {visiblePhotos.map((photo) => (
          <div
            key={photo.id}
            className="photo-gallery-card"
            onClick={() => setLightbox(photo)}
          >
            <div className="photo-gallery-img-wrap">
              <img
                src={photo.imageUrl}
                alt={photo.caption || 'Dokumentasi pelanggan'}
                loading="lazy"
                className="photo-gallery-img"
              />
            </div>
            {photo.caption && (
              <div className="photo-gallery-caption-bar">
                <i className="fa-solid fa-camera" style={{ fontSize: '0.7rem', opacity: 0.5 }}></i>
                <span>{photo.caption}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="photo-gallery-loadmore">
          <button
            type="button"
            className="photo-gallery-loadmore-btn"
            onClick={() => setVisibleCount(v => v + PHOTOS_PER_PAGE)}
          >
            <i className="fa-solid fa-images"></i> Lihat Lebih Banyak ({photos.length - visibleCount} foto lagi)
          </button>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox && (
        <div className="gallery-lightbox" onClick={() => setLightbox(null)}>
          <button className="gallery-lightbox-close" onClick={() => setLightbox(null)}>
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="gallery-lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightbox.imageUrl} alt={lightbox.caption || 'Foto'} className="gallery-lightbox-img" />
            {lightbox.caption && (
              <p className="gallery-lightbox-caption">{lightbox.caption}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default PhotoGallery;
