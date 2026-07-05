import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, Eye } from 'lucide-react';
import { getBlogs, incrementBlogViews } from '../services/db';

const BlogPost = ({ settings }) => {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const data = await getBlogs();
        const found = (data || []).find((b) => b.slug === slug);
        if (found) {
          setBlog(found);
          setViewCount(found.views || 0);
          incrementBlogViews(found.id)
            .then((newViews) => setViewCount(newViews.views || 0))
            .catch(console.error);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    fetchBlog();
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="cute-spinner"></div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="product-detail-container" style={{ textAlign: 'center', padding: '100px 20px', minHeight: '60vh' }}>
        <h2>Artikel Tidak Ditemukan</h2>
        <p>Maaf, artikel yang Anda cari tidak ada atau telah dihapus.</p>
        <Link to="/blog" className="btn-primary" style={{ display: 'inline-block', marginTop: '20px' }}>
          Kembali ke Blog
        </Link>
      </div>
    );
  }

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const plainTextSnippet = blog.content ? blog.content.replace(/<[^>]+>/g, '').substring(0, 150) + '...' : '';
  const metaDesc = blog.metaDescription || plainTextSnippet;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: blog.title,
    image: blog.coverImage ? [blog.coverImage] : [],
    datePublished: blog.createdAt,
    dateModified: blog.createdAt,
    author: [
      {
        '@type': 'Organization',
        name: settings?.shopName || 'Admin',
      },
    ],
    description: metaDesc,
  };

  const tagsArray = blog.tags ? blog.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const heroStyle = blog.coverImage
    ? { backgroundImage: `linear-gradient(180deg, rgba(17, 24, 39, 0.14), rgba(17, 24, 39, 0.9)), url(${blog.coverImage})` }
    : {};

  return (
    <div className="blog-post-container animate-fade-in blog-reader-shell">
      <Helmet>
        <title>
          {blog.title} | {settings?.shopName || 'AcrilyGrad'}
        </title>
        <meta name="description" content={metaDesc} />
        <meta property="og:title" content={blog.title} />
        <meta property="og:description" content={metaDesc} />
        {blog.coverImage && <meta property="og:image" content={blog.coverImage} />}
        {tagsArray.length > 0 && <meta name="keywords" content={tagsArray.join(', ')} />}
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
        {/* Load Noto Sans to perfectly match the reference */}
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
      </Helmet>

      <div className="blog-reader-wrap">
        <div className="blog-reader-header">
          <div className="blog-reader-breadcrumbs">
            <Link to="/">Beranda</Link>
            <span>›</span>
            <Link to="/blog">Postingan</Link>
            <span>›</span>
            <span className="truncate">{blog.title}</span>
          </div>

          <h1>{blog.title}</h1>

          <div className="blog-reader-meta">
            <span>{formatDate(blog.createdAt)}</span>
            <span className="meta-dot">•</span>
            <span>{settings?.shopName || 'Admin'}</span>
            <span className="meta-dot">•</span>
            <span>{viewCount} Dilihat</span>
          </div>
        </div>

        <article className="blog-reader-content">
          {blog.coverImage && (
            <img src={blog.coverImage} alt={blog.title} className="blog-cover-img" />
          )}
          
          <div dangerouslySetInnerHTML={{ __html: blog.content }}></div>
          
          <div className="blog-footer-section">
            {tagsArray.length > 0 && (
              <div className="blog-reader-tags">
                {tagsArray.map((tag, idx) => (
                  <span key={idx} className="lbN">{tag}</span>
                ))}
              </div>
            )}
            
            <div className="blog-share-buttons">
              <span className="share-label">Bagikan:</span>
              <a href={`https://wa.me/?text=${encodeURIComponent(blog.title + ' ' + window.location.href)}`} target="_blank" rel="noreferrer" className="btn-share wa"><i className="fa-brands fa-whatsapp"></i></a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noreferrer" className="btn-share fb"><i className="fa-brands fa-facebook-f"></i></a>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noreferrer" className="btn-share tw"><i className="fa-brands fa-twitter"></i></a>
            </div>
          </div>
        </article>
      </div>

      <style>{`
        .blog-reader-shell {
          min-height: 100vh;
          background: #fffdfc;
          padding: 20px;
          font-family: 'Noto Sans', var(--font-body), sans-serif;
          color: #08102b;
        }
        .blog-reader-wrap {
          width: 100%;
          max-width: 780px;
          margin: 0 auto;
          background: #fffdfc;
        }
        .blog-reader-header {
          padding: 10px 0 20px;
        }
        .blog-reader-breadcrumbs {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 0.85rem;
          color: #767676;
          margin-bottom: 15px;
        }
        .blog-reader-breadcrumbs a {
          color: #767676;
          text-decoration: none;
          transition: color 0.2s;
        }
        .blog-reader-breadcrumbs a:hover {
          color: var(--dark-pink);
        }
        .truncate {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 250px;
        }
        .blog-reader-header h1 {
          font-size: 36px;
          font-weight: 700;
          line-height: 1.3;
          margin-bottom: 15px;
          color: #08102b;
          text-wrap: balance;
        }
        .blog-reader-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
          color: #767676;
          flex-wrap: wrap;
        }
        .meta-dot {
          font-size: 0.6rem;
        }
        .blog-reader-content {
          font-size: 16px;
          line-height: 1.8;
          color: #08102b;
          margin-top: 10px;
        }
        .blog-cover-img {
          width: 100%;
          height: auto;
          border-radius: 12px;
          margin-bottom: 25px;
          box-shadow: 0 5px 30px rgba(0,0,0,0.05);
        }
        .blog-reader-content h2, .blog-reader-content h3 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 700;
        }
        .blog-reader-content p {
          margin-bottom: 1.2em;
        }
        .blog-reader-content a {
          color: var(--dark-pink);
          text-decoration: none;
          transition: opacity 0.2s;
        }
        .blog-reader-content a:hover {
          opacity: 0.8;
        }
        .blog-reader-content ul, .blog-reader-content ol {
          margin-bottom: 1.2em;
          padding-left: 1.5em;
        }
        .blog-reader-content blockquote {
          border-left: 4px solid var(--dark-pink);
          padding: 15px 20px;
          margin: 1.5em 0;
          background: rgba(232, 142, 155, 0.05);
          border-radius: 0 12px 12px 0;
          font-style: italic;
          color: #555;
        }
        .blog-footer-section {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #f0f0f0;
        }
        .blog-reader-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 25px;
        }
        .lbN {
          font-size: 0.8rem;
          background: #f5f5f5;
          color: #555;
          padding: 6px 14px;
          border-radius: 4px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
          cursor: default;
        }
        .lbN:hover {
          background: var(--dark-pink);
          color: white;
        }
        .blog-share-buttons {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .share-label {
          font-size: 0.9rem;
          font-weight: 600;
          margin-right: 5px;
          color: #08102b;
        }
        .btn-share {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          color: white;
          text-decoration: none;
          transition: opacity 0.2s;
          font-size: 1.1rem;
        }
        .btn-share:hover { opacity: 0.85; }
        .btn-share.wa { background: #25D366; }
        .btn-share.fb { background: #1877F2; }
        .btn-share.tw { background: #1DA1F2; }
        
        @media (max-width: 640px) {
          .blog-reader-header h1 {
            font-size: 28px;
          }
          .blog-reader-content {
            font-size: 15px;
          }
          .blog-reader-shell {
            padding: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default BlogPost;
