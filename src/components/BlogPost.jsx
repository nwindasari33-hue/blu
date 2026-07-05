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
            .then((newViews) => setViewCount(newViews))
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
      </Helmet>

      <div className="blog-reader-wrap">
        <div className="blog-reader-hero" style={heroStyle}>
          <div className="blog-reader-hero__inner">
            <div className="blog-reader-breadcrumbs">
              <Link to="/">Beranda</Link>
              <span>/</span>
              <Link to="/blog">Blog</Link>
              <span>/</span>
              <span>{blog.title}</span>
            </div>

            <span className="blog-reader-kicker">Artikel & Inspirasi</span>
            <h1>{blog.title}</h1>

            <div className="blog-reader-meta">
              <span><i className="fa-regular fa-calendar"></i> {formatDate(blog.createdAt)}</span>
              <span><i className="fa-solid fa-feather"></i> {settings?.shopName || 'Admin'}</span>
              <span><Eye size={16} /> {viewCount} Dilihat</span>
            </div>
          </div>
        </div>

        <div className="blog-reader-toolbar">
          <Link to="/blog" className="blog-reader-back">
            <ChevronLeft size={16} />
            Kembali ke Blog
          </Link>
        </div>

        <article className="blog-reader-content">
          <div dangerouslySetInnerHTML={{ __html: blog.content }}></div>

          {tagsArray.length > 0 && (
            <div className="blog-reader-tags">
              <i className="fa-solid fa-tags"></i>
              {tagsArray.map((tag, idx) => (
                <span key={idx}>{tag}</span>
              ))}
            </div>
          )}
        </article>
      </div>

      <style>{`
        .blog-reader-shell {
          min-height: 100vh;
          padding: clamp(16px, 3vw, 32px);
          background:
            radial-gradient(circle at top, rgba(255, 182, 193, 0.16), transparent 32%),
            linear-gradient(180deg, #fcfaf7 0%, #fff 100%);
        }
        .blog-reader-wrap {
          width: min(100%, 920px);
          margin: 0 auto;
        }
        .blog-reader-hero {
          min-height: 280px;
          border-radius: 28px;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
          background: linear-gradient(135deg, #f8e8ee, #fdf7f2);
          background-size: cover;
          background-position: center;
          box-shadow: 0 24px 60px rgba(45, 55, 72, 0.1);
        }
        .blog-reader-hero__inner {
          width: 100%;
          padding: clamp(24px, 5vw, 48px);
          color: #fff;
        }
        .blog-reader-breadcrumbs,
        .blog-reader-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .blog-reader-breadcrumbs {
          color: rgba(255, 255, 255, 0.82);
          font-size: 0.9rem;
          margin-bottom: 14px;
        }
        .blog-reader-breadcrumbs a {
          color: inherit;
          text-decoration: none;
        }
        .blog-reader-kicker {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          margin-bottom: 14px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(8px);
          font-size: 0.8rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .blog-reader-hero h1 {
          font-size: clamp(2rem, 4.8vw, 3.4rem);
          line-height: 1.08;
          margin: 0;
          max-width: 16ch;
          text-wrap: balance;
        }
        .blog-reader-meta {
          margin-top: 16px;
          color: rgba(255, 255, 255, 0.82);
          font-size: 0.95rem;
        }
        .blog-reader-meta span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(17, 24, 39, 0.18);
          backdrop-filter: blur(10px);
        }
        .blog-reader-toolbar {
          display: flex;
          justify-content: flex-start;
          margin-top: -18px;
          padding: 0 18px;
        }
        .blog-reader-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: var(--text-dark);
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(247, 214, 219, 0.9);
          padding: 11px 18px;
          border-radius: 999px;
          box-shadow: 0 12px 30px rgba(45, 55, 72, 0.08);
          font-weight: 600;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .blog-reader-back:hover {
          transform: translateY(-1px);
          box-shadow: 0 16px 38px rgba(45, 55, 72, 0.12);
        }
        .blog-reader-content {
          width: min(100%, 760px);
          margin: 18px auto 0;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(247, 214, 219, 0.85);
          border-radius: 28px;
          padding: clamp(22px, 4vw, 42px);
          box-shadow: 0 24px 60px rgba(45, 55, 72, 0.08);
          font-size: clamp(1rem, 0.98rem + 0.25vw, 1.08rem);
          line-height: 1.9;
          color: #374151;
        }
        .blog-reader-content img {
          display: block;
          max-width: 100%;
          height: auto;
          border-radius: 18px;
          margin: 1.4em 0;
        }
        .blog-reader-content h2,
        .blog-reader-content h3,
        .blog-reader-content h4 {
          color: #1f2937;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          line-height: 1.3;
          text-wrap: balance;
        }
        .blog-reader-content a {
          color: var(--primary-color);
          text-decoration: underline;
        }
        .blog-reader-content p {
          margin-bottom: 1.1em;
        }
        .blog-reader-content ul,
        .blog-reader-content ol {
          margin-bottom: 1.2em;
          padding-left: 1.4em;
        }
        .blog-reader-content blockquote {
          border-left: 4px solid var(--primary-color);
          padding-left: 1rem;
          color: #6b7280;
          font-style: italic;
          margin: 1.5em 0;
          background: #fff7fa;
          padding: 1rem;
          border-radius: 0 16px 16px 0;
        }
        .blog-reader-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5em 0;
          display: block;
          overflow-x: auto;
          border-radius: 16px;
        }
        .blog-reader-content th,
        .blog-reader-content td {
          border: 1px solid #e5e7eb;
          padding: 12px;
        }
        .blog-reader-content th {
          background-color: #f9fafb;
          font-weight: 600;
        }
        .blog-reader-tags {
          margin-top: 28px;
          padding-top: 18px;
          border-top: 1px solid rgba(229, 231, 235, 0.9);
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .blog-reader-tags i {
          color: #9ca3af;
          margin-right: 4px;
        }
        .blog-reader-tags span {
          background: #f6f1f4;
          color: #4b5563;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.86rem;
        }
        @media (max-width: 640px) {
          .blog-reader-hero {
            min-height: 260px;
            border-radius: 24px;
          }
          .blog-reader-toolbar {
            margin-top: -14px;
            padding: 0 12px;
          }
          .blog-reader-back {
            width: 100%;
            justify-content: center;
          }
          .blog-reader-content {
            border-radius: 22px;
            line-height: 1.85;
          }
        }
      `}</style>
    </div>
  );
};

export default BlogPost;
