import React, { useState } from 'react';
import { FaTrash } from 'react-icons/fa';
import InventoryCard from './InventoryCard';
import './InventoryModal.css';
import InventoryThresholdsModal from './InventoryThresholdsModal';

const InventoryModal = ({ product, category, onPersistProduct, onSaveThresholds, onClose, onDeleteProduct }) => {
  const [showThresholds, setShowThresholds] = useState(false);
  const handleDelete = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (onDeleteProduct) {
      onDeleteProduct();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content inventory-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Inventory: {product?.flavor}</h2>
          <div className="inventory-modal-actions">
            {onDeleteProduct && (
              <button
                className="inventory-delete-btn"
                onClick={handleDelete}
                title="Delete product"
              >
                <FaTrash />
              </button>
            )}
            <button className="close-button" onClick={onClose}>×</button>
          </div>
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
          onSave={(rows) => category?.id && onSaveThresholds(category.id, rows)}
          onClose={() => setShowThresholds(false)}
        />
      )}
    </div>
  );
};

export default InventoryModal;
