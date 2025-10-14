import React, { useState } from 'react';
import InventoryCard from './InventoryCard';
import './InventoryModal.css';
import InventoryThresholdsModal from './InventoryThresholdsModal';

const InventoryModal = ({ product, category, onPersistProduct, onSaveThresholds, onClose }) => {
  const [showThresholds, setShowThresholds] = useState(false);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content inventory-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Inventory: {product?.flavor}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <InventoryCard
            product={product}
            category={category}
            onPersistProduct={onPersistProduct}
            onOpenThresholds={() => setShowThresholds(true)}
          />
        </div>
      </div>
      {showThresholds && (
        <InventoryThresholdsModal
          category={category}
          onSave={(rows) => onSaveThresholds(category.id, rows)}
          onClose={() => setShowThresholds(false)}
        />
      )}
    </div>
  );
};

export default InventoryModal;

