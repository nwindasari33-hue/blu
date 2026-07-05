import React, { useState, useEffect } from 'react';

const NotificationManager = () => {
  const [toasts, setToasts] = useState([]);
  const [confirmData, setConfirmData] = useState(null);

  useEffect(() => {
    const handleToast = (e) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, ...e.detail }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };

    const handleConfirm = (e) => {
      setConfirmData(e.detail);
    };

    window.addEventListener('show-toast', handleToast);
    window.addEventListener('show-confirm', handleConfirm);

    return () => {
      window.removeEventListener('show-toast', handleToast);
      window.removeEventListener('show-confirm', handleConfirm);
    };
  }, []);

  const handleConfirmResult = (result) => {
    if (confirmData) {
      confirmData.resolve(result);
      setConfirmData(null);
    }
  };

  return (
    <>
      {/* Toasts Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div className="toast-icon">
              {t.type === 'success' && <i className="fa-solid fa-circle-check"></i>}
              {t.type === 'error' && <i className="fa-solid fa-circle-xmark"></i>}
              {t.type === 'warning' && <i className="fa-solid fa-triangle-exclamation"></i>}
            </div>
            <div className="toast-msg">{t.msg}</div>
          </div>
        ))}
      </div>

      {/* Confirm Modal */}
      {confirmData && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <div className="confirm-icon">
              <i className="fa-solid fa-circle-exclamation"></i>
            </div>
            <h3 className="confirm-title">Konfirmasi</h3>
            <p className="confirm-msg">{confirmData.msg}</p>
            <div className="confirm-actions">
              <button className="btn-secondary" onClick={() => handleConfirmResult(false)}>
                Batal
              </button>
              <button className="btn-danger" onClick={() => handleConfirmResult(true)}>
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationManager;
