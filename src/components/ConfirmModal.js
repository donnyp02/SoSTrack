import React from 'react';
import './ConfirmModal.css';

/**
 * Beautiful confirmation modal to replace ugly window.confirm()
 * Supports custom button text, colors, and icons
 */
function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'red', // red, green, yellow, blue
  onConfirm,
  onCancel,
  icon = null
}) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="confirm-modal-backdrop" onClick={handleBackdropClick}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        {icon && (
          <div className={`confirm-modal-icon confirm-icon-${confirmColor}`}>
            {icon}
          </div>
        )}

        <div className="confirm-modal-header">
          <h3>{title}</h3>
        </div>

        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>

        <div className="confirm-modal-footer">
          <button
            className="confirm-modal-btn cancel-btn"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-modal-btn confirm-btn confirm-btn-${confirmColor}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
