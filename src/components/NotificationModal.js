import React, { useEffect } from 'react';
import './NotificationModal.css';

const NotificationModal = ({ message, onClose, autoClose = 5000 }) => {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  return (
    <div className="notification-modal-backdrop" onClick={onClose}>
      <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notification-content">
          <div className="notification-icon">🔔</div>
          <div className="notification-message">{message}</div>
        </div>
        <button className="notification-close" onClick={onClose}>×</button>
      </div>
    </div>
  );
};

export default NotificationModal;
