import React, { useState, useEffect } from 'react';
import { getSettings } from '../services/db';

const DEFAULT_TABS = [
  {
    id: 'android',
    label: 'Android',
    icon: 'fa-brands fa-android',
    steps: [
      { icon: 'fa-solid fa-map-location-dot', title: 'Buka Google Maps', desc: 'Cari dan buka aplikasi Google Maps di HP Android Anda. Pastikan GPS/Lokasi sudah menyala.' }
    ]
  }
];

export default function MapsGuide() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('android');
  const [openStep, setOpenStep] = useState(0);
  const [tabsData, setTabsData] = useState([]);
  const [mapsVideoUrl, setMapsVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then(settings => {
      if (settings.mapsGuideTabs && Array.isArray(settings.mapsGuideTabs) && settings.mapsGuideTabs.length > 0) {
        setTabsData(settings.mapsGuideTabs);
        setActiveTab(settings.mapsGuideTabs[0].id);
      } else {
        setTabsData(DEFAULT_TABS);
        setActiveTab(DEFAULT_TABS[0].id);
      }
      if (settings.mapsVideoUrl) {
        setMapsVideoUrl(settings.mapsVideoUrl);
      }
    }).catch(err => {
      console.error("Failed to load maps guide settings", err);
      setTabsData(DEFAULT_TABS);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  const active = tabsData.find(t => t.id === activeTab) || tabsData[0];

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };
  const embedUrl = getYoutubeEmbedUrl(mapsVideoUrl);

  return (
    <div className={`maps-guide-wrapper ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="maps-guide-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <i className="fa-solid fa-location-crosshairs maps-guide-toggle-icon"></i>
        <span>Cara Salin Lokasi dari Google Maps</span>
        <i className={`fa-solid fa-chevron-down maps-guide-chevron ${open ? 'open' : ''}`}></i>
      </button>

      <div className="maps-guide-panel-wrapper">
        <div className="maps-guide-panel">
          <div className="maps-guide-panel-inner">
            <p className="maps-guide-subtitle">
              Ikuti langkah-langkah di bawah sesuai perangkat Anda untuk mendapatkan lokasi yang akurat dalam hitungan detik.
            </p>

            {/* Tabs */}
            <div className="maps-guide-tabs" role="tablist">
              {tabsData.map(t => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.id}
                  className={`maps-guide-tab ${activeTab === t.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(t.id);
                    setOpenStep(0);
                  }}
                >
                  <i className={`${t.icon} tab-icon`}></i> {t.label}
                </button>
              ))}
            </div>

            {/* Steps */}
            <ol className="maps-guide-steps">
              {active.steps.map((step, i) => {
                const isStepOpen = openStep === i;
                return (
                  <li key={i} className={`maps-guide-step ${isStepOpen ? 'open' : ''} ${step.highlight ? 'highlight' : ''}`}>
                    <div className="step-number">{i + 1}</div>
                    <div className="step-icon-wrapper">
                      <i className={step.icon || 'fa-solid fa-map-pin'}></i>
                    </div>
                    <div className="step-content-wrapper">
                      <button 
                        type="button" 
                        className="step-toggle" 
                        onClick={() => setOpenStep(isStepOpen ? null : i)}
                      >
                        <strong className="step-title">{step.title}</strong>
                        <i className={`fa-solid fa-chevron-down step-chevron ${isStepOpen ? 'open' : ''}`}></i>
                      </button>
                      <div className="step-body-wrapper">
                        <div className="step-body-inner">
                          <p className="step-desc">{step.desc}</p>
                          {step.imageUrl && (
                            <div style={{ marginTop: '12px' }}>
                              <img 
                                src={step.imageUrl} 
                                alt={`Langkah ${i + 1}`} 
                                style={{ 
                                  width: '100%', 
                                  maxHeight: '400px', 
                                  objectFit: 'cover', 
                                  objectPosition: 'top',
                                  borderRadius: '8px', 
                                  border: '1px solid #e2e8f0', 
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)' 
                                }} 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="maps-guide-tip">
              <i className="fa-solid fa-lightbulb tip-icon"></i> <strong>Contoh Plus Code yang benar:</strong>{' '}
              <code>RPP7+CM Sumbersari, Kabupaten Jember, Jawa Timur</code>
            </div>

            {/* YouTube Video Section */}
            {embedUrl && (
              <div style={{ marginTop: '20px', borderRadius: '12px', overflow: 'hidden', position: 'relative', paddingBottom: '56.25%', height: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <iframe 
                  src={embedUrl}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Tutorial Salin Lokasi"
                ></iframe>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
