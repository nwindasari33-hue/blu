import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBlogs } from '../services/db';

const BlogList = ({ settings }) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const data = await getBlogs();
        // sort by newest
        const sorted = (data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBlogs(sorted);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchBlogs();
    window.scrollTo(0, 0);
  }, []);

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="cute-spinner"></div>
      </div>
    );
  }

  const filteredBlogs = blogs.filter(blog => {
    const query = searchQuery.toLowerCase();
    const matchTitle = blog.title && blog.title.toLowerCase().includes(query);
    const matchTags = blog.tags && blog.tags.toLowerCase().includes(query);
    return matchTitle || matchTags;
  });

  return (
    <div className="catalog-page">
      <section className="catalog-hero animate-fade-in text-mode-layout" style={{ minHeight: '30vh' }}>
        <div className="catalog-hero-content text-mode-content">
          <h1>Blog & Artikel</h1>
          <p className="hero-desc text-mode-desc">
            Tips wisuda, gaya foto, dan info terbaru seputar layanan kami.
          </p>
        </div>
      </section>

      <section className="catalog-section" style={{ paddingTop: '20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto 40px auto', position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}></i>
          <input 
            type="text" 
            placeholder="Cari artikel atau topik (misal: wisuda, kado)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '16px 16px 16px 48px', fontSize: '1.05rem', borderRadius: '30px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', outline: 'none' }}
          />
        </div>

        {filteredBlogs.length === 0 ? (
          <div className="catalog-empty">
            <i className="fa-solid fa-file-pen catalog-empty-icon"></i>
            <p>Belum ada artikel saat ini. Nantikan artikel menarik dari kami!</p>
          </div>
        ) : (
          <div className="product-grid">
            {filteredBlogs.map((blog, idx) => (
              <Link 
                key={blog.id} 
                to={`/blog/${blog.slug}`} 
                className="product-card animate-slide-up" 
                style={{ animationDelay: `${idx * 0.05}s`, textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}
              >
                <div className="product-card-img-wrap" style={{ height: '200px' }}>
                  {blog.coverImage ? (
                    <img src={blog.coverImage} alt={blog.title} className="product-card-img" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className="product-card-img-placeholder" style={{ background: '#f3f4f6' }}>
                      <i className="fa-regular fa-image placeholder-icon" style={{ color: '#9ca3af' }}></i>
                    </div>
                  )}
                </div>
                <div className="product-card-info" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="product-card-meta">
                    <span className="product-card-size">
                      <i className="fa-regular fa-calendar"></i> {formatDate(blog.createdAt)}
                    </span>
                  </div>
                  <h3 className="product-card-name" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{blog.title}</h3>
                  <div style={{ marginTop: 'auto', paddingTop: '16px', color: 'var(--primary-color)', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Baca Selengkapnya <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.8rem' }}></i>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default BlogList;
