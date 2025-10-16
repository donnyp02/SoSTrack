// src/components/LotCard.js
import React, { memo } from 'react';
import { FaCalendarAlt, FaBoxes } from 'react-icons/fa';
import './LotCard.css';

const STATUS_COLORS = {
  'Ready': 'ready',
  'Hold': 'hold',
  'Consumed': 'consumed',
  'Recalled': 'recalled',
  'Pending QA': 'pending',
  'Released': 'ready',
  'Quarantined': 'hold',
  'On Hold': 'hold'
};

const LotCard = memo(({ lot, onClick }) => {
  const statusClass = STATUS_COLORS[lot.status] || 'pending';

  // Check if expiring soon (within 7 days)
  const now = new Date();
  const saleBy = lot.saleBy || lot.expirationDate;
  const daysUntilExpiry = saleBy ? Math.ceil((saleBy - now) / (1000 * 60 * 60 * 24)) : null;

  let dateClass = '';
  if (daysUntilExpiry !== null) {
    if (daysUntilExpiry < 0) {
      dateClass = 'expired';
    } else if (daysUntilExpiry <= 7) {
      dateClass = 'expiring-soon';
    }
  }

  const formatDate = (date) => {
    if (!date) return '—';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="lot-card" onClick={onClick}>
      <div className={`lot-card-striped-bar ${statusClass}`}></div>
      <div className="lot-card-content">
        <div className="lot-card-info">
          <div className="lot-card-header">
            <h3 className="lot-card-number">{lot.lotNumber || lot.internalLotNumber || lot.id}</h3>
            <span className={`status-pill ${statusClass}`}>{lot.status}</span>
          </div>
          <div className="lot-card-product">{lot.productName || lot.ingredientName || 'Unknown'}</div>
          <div className="lot-card-meta">
            {lot.quantityLabel && (
              <span>
                <FaBoxes />
                {lot.quantityLabel}
              </span>
            )}
            {lot.amount && (
              <span>
                <FaBoxes />
                {lot.amount} {lot.unit || ''}
              </span>
            )}
            {lot.primaryLocation && <span>{lot.primaryLocation}</span>}
            {lot.storageLocation && <span>{lot.storageLocation.area || lot.storageLocation.bin || lot.storageLocation}</span>}
          </div>
        </div>
        <div className="lot-card-status">
          <div className={`lot-card-date ${dateClass}`}>
            <FaCalendarAlt style={{ marginRight: '6px', fontSize: '0.9em' }} />
            {formatDate(saleBy)}
          </div>
        </div>
      </div>
    </div>
  );
});

export default LotCard;
