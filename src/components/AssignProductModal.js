import React, { useState } from 'react';

const AssignProductModal = ({ onClose, products, onAssign }) => {
  const [selectedProductId, setSelectedProductId] = useState('');

  const handleAssign = () => {
    if (selectedProductId) {
      onAssign(selectedProductId);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign Product</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
            <option value="">Select a Product</option>
            {Object.values(products).map(product => (
              <option key={product.id} value={product.id}>{product.flavor}</option>
            ))}
          </select>
        </div>
        <div className="modal-footer">
          <button onClick={handleAssign} disabled={!selectedProductId}>Assign</button>
        </div>
      </div>
    </div>
  );
};

export default AssignProductModal;