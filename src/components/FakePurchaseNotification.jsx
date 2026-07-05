import React, { useState, useEffect, useRef } from 'react';
import { getRandomName } from '../data/indonesianNames';

const FakePurchaseNotification = ({ catalog }) => {
  const [notification, setNotification] = useState(null);
  const [visible, setVisible] = useState(false);
  const productIndexRef = useRef(0);

  const showNotification = () => {
    if (!catalog || catalog.length === 0) return;

    const product = catalog[productIndexRef.current % catalog.length];
    productIndexRef.current = (productIndexRef.current + 1) % catalog.length;

    const name = getRandomName();
    setNotification({ name, product });
    setVisible(true);

    // Hide after 5 seconds
    setTimeout(() => setVisible(false), 5000);
  };

  useEffect(() => {
    if (!catalog || catalog.length === 0) return;

    // Show first notification after 15 seconds
    const initialDelay = setTimeout(showNotification, 15000);

    // Then every 5 minutes
    const interval = setInterval(showNotification, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [catalog]);

  if (!notification) return null;

  const productName = notification.product?.name || 'Papan Akrilik';
  const productImage = Array.isArray(notification.product?.images)
    ? notification.product.images[0]
    : notification.product?.image || null;

  return (
    <div className={`fake-notif-popup ${visible ? 'notif-enter' : 'notif-exit'}`}>
      <div className="notif-header">
        <i className="fa-solid fa-bell notif-bell-icon"></i>
        <span>Baru saja dipesan!</span>
      </div>
      <div className="notif-body">
        <div className="notif-avatar">
          {productImage
            ? <img src={productImage} alt={productName} className="notif-img" />
            : <div className="notif-img-placeholder"><i className="fa-solid fa-box-open"></i></div>
          }
        </div>
        <div className="notif-info">
          <strong>{notification.name}</strong>
          <span>menyewa <em>{productName}</em></span>
          <span className="notif-time">
            <i className="fa-regular fa-clock"></i> Baru saja
          </span>
        </div>
      </div>
    </div>
  );
};

export default FakePurchaseNotification;
