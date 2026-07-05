import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Catalog from './components/Catalog';
import ProductDetail from './components/ProductDetail';
import BookingForm from './components/BookingForm';
import AdminDashboard from './components/AdminDashboard';
import FakePurchaseNotification from './components/FakePurchaseNotification';
import Footer from './components/Footer';
import CustomPage from './components/CustomPage';
import BlogList from './components/BlogList';
import BlogPost from './components/BlogPost';
import { getCatalog, getOrders, getFonts, getSettings, saveOrder, loadAndInjectAllFonts, adjustVariantStock, initDB } from './services/db';
import NotificationManager from './components/NotificationManager';
import './App.css';
import './notifications.css';

const AppContent = ({ catalog, orders, customFonts, settings, isLoading, refreshData }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  // Inject Favicon if available
  useEffect(() => {
    if (settings.faviconImage) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.faviconImage;
    }
  }, [settings.faviconImage]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="cute-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    try {
      await saveOrder({ ...order, status: newStatus });
      refreshData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="App animate-fade-in">
      <Helmet>
        {/* Primary SEO */}
        <title>{settings.seoTitle || 'Sewa Papan Akrilik Wisuda Murah & Estetik | AcrilyGrad'}</title>
        <meta name="description" content={settings.seoDesc || 'Sewa papan akrilik wisuda cantik dan murah. Tersedia berbagai ukuran dan desain elegan. Pengiriman ke seluruh wilayah. Pesan mudah, harga terjangkau, kualitas premium.'} />
        {settings.seoKeywords && <meta name="keywords" content={settings.seoKeywords} />}
        <meta name="robots" content="index, follow" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={settings.shopName || 'AcrilyGrad'} />
        <meta property="og:title" content={settings.seoTitle || 'Sewa Papan Akrilik Wisuda Murah & Estetik | AcrilyGrad'} />
        <meta property="og:description" content={settings.seoDesc || 'Sewa papan akrilik wisuda cantik dan murah. Berbagai ukuran & desain elegan.'} />
        {settings.seoOgImage && <meta property="og:image" content={settings.seoOgImage} />}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={settings.seoTitle || 'Sewa Papan Akrilik Wisuda Murah & Estetik | AcrilyGrad'} />
        <meta name="twitter:description" content={settings.seoDesc || 'Sewa papan akrilik wisuda cantik dan murah.'} />
        {settings.seoOgImage && <meta name="twitter:image" content={settings.seoOgImage} />}

        {/* LocalBusiness Schema JSON-LD */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": settings.shopName || "AcrilyGrad",
          "description": settings.seoDesc || "Sewa papan akrilik wisuda cantik dan murah. Tersedia berbagai ukuran dan desain elegan.",
          "url": typeof window !== 'undefined' ? window.location.origin : '',
          "telephone": settings.waNumber ? `+${settings.waNumber}` : undefined,
          "address": settings.shopAddress ? {
            "@type": "PostalAddress",
            "streetAddress": settings.shopAddress,
            "addressCountry": "ID"
          } : undefined,
          "openingHours": settings.storeHours || undefined,
          "priceRange": "$$",
          "image": settings.seoOgImage || undefined,
          "sameAs": [
            settings.footerInstagram ? `https://instagram.com/${settings.footerInstagram.replace('@','')}` : undefined,
          ].filter(Boolean)
        })}</script>
      </Helmet>
      
      <Navbar settings={settings} />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Catalog catalog={catalog} settings={settings} orders={orders} />} />
          <Route path="/product/:id" element={<ProductDetail catalog={catalog} settings={settings} />} />
          <Route path="/blog" element={<BlogList settings={settings} />} />
          <Route path="/blog/:slug" element={<BlogPost settings={settings} />} />
          <Route 
            path="/booking/:id" 
            element={
              <BookingForm 
                catalog={catalog}
                shops={settings.shops || [{ id: 1, name: 'Toko', address: settings.shopAddress || '', lat: settings.shopCoords?.lat || -7.797068, lng: settings.shopCoords?.lng || 110.370529 }]}
                shippingBaseFee={settings.shippingBaseFee}
                shippingRatePerKm={settings.shippingRatePerKm}
                shippingZones={settings.shippingZones || []}
                shippingAreas={settings.shippingAreas || []}
                freeShippingEnabled={settings.freeShippingEnabled || false}
                freeShippingAreas={settings.freeShippingAreas || []}
                vouchers={settings.vouchers || []}
                waNumber={settings.waNumber}
                shopName={settings.shopName}
                tomtomApiKey={settings.tomtomApiKey}
                returnTime={settings.returnTime}
              />
            } 
          />
          <Route 
            path="/admin/*" 
            element={
              <AdminDashboard
                catalog={catalog}
                orders={orders}
                customFonts={customFonts}
                settings={settings}
                onRefreshData={refreshData}
                onUpdateLocalSettings={updateLocalSettings}
                onUpdateOrderStatus={handleUpdateOrderStatus}
              />
            } 
          />
          <Route path="/page/:slug" element={<CustomPage settings={settings} />} />
        </Routes>
      </main>

      {!isAdmin && <Footer settings={settings} />}
      {!isAdmin && <FakePurchaseNotification catalog={catalog} />}
    </div>
  );
};

function App() {
  const [catalog, setCatalog] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customFonts, setCustomFonts] = useState([]);
  const [settings, setSettings] = useState({
    shops: [
      { id: 1, name: 'Toko Utama', address: '', lat: -7.792480, lng: 110.365655 },
      { id: 2, name: 'Toko Cabang', address: '', lat: -7.762690, lng: 110.381690 }
    ],
    shippingBaseFee: 5000,
    shippingRatePerKm: 3000,
    shippingZones: [],
    shopName: 'AcrilyGrad',
    waNumber: '',
    availableSizes: 'A1 (59.4 x 84.1 cm), A2 (42 x 59.4 cm), A3 (29.7 x 42 cm)',
    storePolicy: '',
    storeHours: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [dbCatalog, dbOrders, dbFonts, dbSettings] = await Promise.all([
        getCatalog(), getOrders(), getFonts(), getSettings()
      ]);
      setCatalog(dbCatalog);
      setOrders(dbOrders.reverse());
      setCustomFonts(dbFonts);
      if (dbSettings && Object.keys(dbSettings).length > 0) setSettings(s => ({ ...s, ...dbSettings }));
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const updateLocalSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try { await initDB(); } catch(e) { console.error('DB init error:', e); }
      await refreshData();
      await loadAndInjectAllFonts();
      setIsLoading(false);
    };
    init();
  }, []);




  return (
    <Router>
      <NotificationManager />
      <AppContent 
        catalog={catalog}
        orders={orders}
        customFonts={customFonts}
        settings={settings}
        isLoading={isLoading}
        refreshData={refreshData}
      />
    </Router>
  );
}

export default App;
