// src/components/EditInventoryModal.js
import React, { useState, useEffect } from 'react';
import './AddProductModal.css'; // Using similar styling

const EditInventoryModal = ({ product, onSave, onClose }) => {
  // Initialize state from the product's packageOptions, which are derived from the category templates
  const [inventory, setInventory] = useState([]);

  // useEffect to sync state when the product prop changes
  useEffect(() => {
    if (product && product.packageOptions) {
      // Ensure we have a quantity field, defaulting to 0
      const initialInventory = product.packageOptions.map(opt => ({
        ...opt,
        quantity: opt.quantity || 0
      }));
      setInventory(initialInventory);
    }
  }, [product]);

  const handleSave = () => {
    // Transform the state back into the format expected by Firestore
    // Only include items that have a quantity to keep the data clean
    const newInventoryForDb = inventory
      .filter(item => item.quantity > 0)
      .map(({ id, quantity }) => ({
        templateId: id,
        quantity: Number(quantity)
      }));
    onSave(newInventoryForDb);
    onClose();
  };

  const handleQuantityChange = (index, value) => {
    const newInventory = [...inventory];
    // Ensure value is a non-negative number
    newInventory[index].quantity = Math.max(0, Number(value));
    setInventory(newInventory);
  };

  // The product prop might not be available on the first render
  if (!product) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Inventory: {product.flavor}</h3>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <h4>Container Inventory</h4>
          {inventory.length > 0 ? (
            inventory.map((item, index) => (
              <div key={item.id} className="form-group">
                <label>{item.name} ({item.weightOz} oz)</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(index, e.target.value)}
                  min="0"
                />
              </div>
            ))
          ) : (
            <p>No container types have been defined for this product's category.</p>
          )}
          <div className="form-actions">
            <button onClick={handleSave} className="submit-btn">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditInventoryModal;
