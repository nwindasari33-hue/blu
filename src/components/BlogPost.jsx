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
              <div>
                <div className="tags-label">Tag</div>
                <div className="blog-reader-tags">
                  {tagsArray.map((tag, idx) => (
                    <span key={idx} className="lbN">{tag}</span>
                  ))}
                </div>
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
          padding: 10px 0 24px;
          border-bottom: 1px solid #f0f0f0;
          margin-bottom: 28px;
        }
        .blog-reader-breadcrumbs {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 0.82rem;
          color: #767676;
          margin-bottom: 16px;
        }
        .blog-reader-breadcrumbs a {
          color: #767676;
          text-decoration: none;
          transition: color 0.2s;
        }
        .blog-reader-breadcrumbs a:hover { color: var(--dark-pink); }
        .truncate {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 240px;
        }
        .blog-reader-header h1 {
          font-size: 36px;
          font-weight: 700;
          line-height: 1.25;
          margin-bottom: 16px;
          color: #08102b;
          text-wrap: balance;
          letter-spacing: -0.02em;
        }
        .blog-reader-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.83rem;
          color: #767676;
          flex-wrap: wrap;
        }
        .meta-dot { font-size: 0.5rem; color: #ccc; }

        /* ── ARTICLE BODY ─────────────────────────── */
        .blog-reader-content {
          font-size: 16.5px;
          line-height: 1.85;
          color: #1a1a2e;
          margin-top: 0;
        }
        .blog-cover-img {
          width: 100%;
          height: auto;
          border-radius: 14px;
          margin-bottom: 30px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.08);
          display: block;
        }

        /* Headings */
        .blog-reader-content h2 {
          font-size: 1.55rem;
          font-weight: 700;
          margin: 2em 0 0.6em;
          color: #0d0d1a;
          padding-left: 14px;
          border-left: 4px solid var(--dark-pink);
          letter-spacing: -0.01em;
        }
        .blog-reader-content h3 {
          font-size: 1.2rem;
          font-weight: 700;
          margin: 1.6em 0 0.5em;
          color: #1a1a2e;
        }
        .blog-reader-content h4 {
          font-size: 1rem;
          font-weight: 600;
          margin: 1.4em 0 0.4em;
          color: #2d2d42;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.85rem;
        }

        /* Paragraphs & links */
        .blog-reader-content p { margin-bottom: 1.25em; }
        .blog-reader-content a {
          color: var(--dark-pink);
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: opacity 0.2s;
        }
        .blog-reader-content a:hover { opacity: 0.75; }

        /* Lists */
        .blog-reader-content ul {
          margin-bottom: 1.3em;
          padding-left: 1.6em;
          list-style: none;
        }
        .blog-reader-content ul li {
          position: relative;
          padding-left: 1.2em;
          margin-bottom: 0.4em;
        }
        .blog-reader-content ul li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.65em;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--dark-pink);
        }
        .blog-reader-content ol {
          margin-bottom: 1.3em;
          padding-left: 0;
          list-style: none;
          counter-reset: ol-counter;
        }
        .blog-reader-content ol li {
          counter-increment: ol-counter;
          position: relative;
          padding-left: 2.4em;
          margin-bottom: 0.5em;
        }
        .blog-reader-content ol li::before {
          content: counter(ol-counter);
          position: absolute;
          left: 0;
          top: 0.1em;
          width: 1.7em;
          height: 1.7em;
          border-radius: 50%;
          background: var(--dark-pink);
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Blockquote — premium card style */
        .blog-reader-content blockquote {
          position: relative;
          margin: 2em 0;
          padding: 24px 24px 20px 64px;
          background: #fff8f9;
          border: 1px solid rgba(232,142,155,0.25);
          border-radius: 14px;
          font-style: italic;
          color: #444;
          font-size: 1.05rem;
          line-height: 1.75;
        }
        .blog-reader-content blockquote::before {
          content: '"';
          position: absolute;
          left: 16px;
          top: 10px;
          font-size: 4rem;
          font-family: Georgia, serif;
          color: var(--dark-pink);
          line-height: 1;
          opacity: 0.5;
        }
        .blog-reader-content blockquote p { margin-bottom: 0; }

        /* Horizontal rule — ornamental */
        .blog-reader-content hr {
          border: none;
          text-align: center;
          margin: 2.5em 0;
          color: #ccc;
          font-size: 1.4rem;
          letter-spacing: 0.4em;
        }
        .blog-reader-content hr::after {
          content: '✦ ✦ ✦';
        }

        /* Inline code */
        .blog-reader-content code {
          background: #f0f0f5;
          color: #c0392b;
          padding: 2px 7px;
          border-radius: 5px;
          font-size: 0.88em;
          font-family: 'Courier New', monospace;
        }

        /* Code block */
        .blog-reader-content pre {
          background: #1e1e2e;
          color: #cdd6f4;
          padding: 20px 22px;
          border-radius: 12px;
          overflow-x: auto;
          margin: 1.6em 0;
          font-size: 0.9rem;
          line-height: 1.65;
        }
        .blog-reader-content pre code {
          background: transparent;
          color: inherit;
          padding: 0;
          font-size: inherit;
        }

        /* Images in content */
        .blog-reader-content img {
          display: block;
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 1.8em auto;
          box-shadow: 0 6px 30px rgba(0,0,0,0.08);
        }
        .blog-reader-content figure {
          margin: 1.8em 0;
          text-align: center;
        }
        .blog-reader-content figcaption {
          margin-top: 8px;
          font-size: 0.82rem;
          color: #999;
          font-style: italic;
        }

        /* Table — striped */
        .blog-reader-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.8em 0;
          font-size: 0.92rem;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 1px 8px rgba(0,0,0,0.06);
          display: block;
          overflow-x: auto;
        }
        .blog-reader-content th {
          background: var(--dark-pink);
          color: white;
          font-weight: 600;
          padding: 12px 16px;
          text-align: left;
        }
        .blog-reader-content td {
          padding: 11px 16px;
          border-bottom: 1px solid #f0f0f0;
        }
        .blog-reader-content tr:nth-child(even) td { background: #fafafa; }
        .blog-reader-content tr:last-child td { border-bottom: none; }

        /* ── FOOTER SECTION ───────────────────────── */
        .blog-footer-section {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #ebebeb;
        }
        .tags-label {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #999;
          margin-bottom: 10px;
        }
        .blog-reader-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 28px;
        }
        .lbN {
          font-size: 0.78rem;
          background: #f2f2f2;
          color: #444;
          padding: 5px 13px;
          border-radius: 4px;
          font-weight: 600;
          transition: background 0.18s, color 0.18s;
          cursor: default;
          border: 1px solid transparent;
        }
        .lbN:hover {
          background: #fff0f2;
          border-color: var(--dark-pink);
          color: var(--dark-pink);
        }
        .blog-share-buttons {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .share-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: #444;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-right: 4px;
        }
        .btn-share {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          color: white !important;
          text-decoration: none !important;
          font-size: 1rem;
          transition: transform 0.18s, box-shadow 0.18s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .btn-share:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          opacity: 1 !important;
        }
        .btn-share.wa { background: #25D366; }
        .btn-share.fb { background: #1877F2; }
        .btn-share.tw { background: #1DA1F2; }

        @media (max-width: 640px) {
          .blog-reader-header h1 { font-size: 26px; }
          .blog-reader-content { font-size: 15.5px; }
          .blog-reader-shell { padding: 14px; }
          .blog-reader-content blockquote { padding: 18px 18px 16px 48px; }
        }
      `}</style>
    </div>
  );
};

export default BlogPost;
