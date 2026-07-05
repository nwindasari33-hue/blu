import React from 'react';
import { Sparkles, LayoutDashboard, ShoppingBag, BookOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ settings }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
          {settings?.logoImage ? (
            <img src={settings.logoImage} alt="Logo" className="custom-navbar-logo" />
          ) : (
            <div className="brand-logo">
              <Sparkles className="logo-icon" />
            </div>
          )}
          <div className="brand-text">
            <h1>{settings?.shopName || 'AcrilyGrad'}</h1>
            <span>Penyewaan Akrilik Estetik</span>
          </div>
        </Link>

        <nav className="navbar-links">
          <Link 
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            style={{ textDecoration: 'none' }}
            onClick={() => window.scrollTo(0, 0)}
          >
            <ShoppingBag size={18} />
            <span>Katalog</span>
          </Link>
          <Link 
            to="/blog"
            className={`nav-link ${location.pathname.startsWith('/blog') ? 'active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <BookOpen size={18} />
            <span>Blog</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
