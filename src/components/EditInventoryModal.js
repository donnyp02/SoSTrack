// src/components/EditInventoryModal.js
import React, { useState, useEffect } from 'react';
import './EditInventoryModal.css';

const EditInventoryModal = ({ product, onSave, onClose, onManageContainers = null }) => {
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    if (product && product.packageOptions) {
      const initialInventory = product.packageOptions.map((opt) => ({
        ...opt,
        quantity: opt.quantity || 0,
      }));
      setInventory(initialInventory);
    }
  }, [product]);

  const handleQuantityChange = (index, value) => {
    const newInventory = [...inventory];
    newInventory[index].quantity = Math.max(0, Number(value));
    setInventory(newInventory);
  };

  const handleSave = () => {
    const newInventoryForDb = inventory
      .filter((item) => item.quantity > 0)
      .map(({ id, quantity }) => ({
        templateId: id,
        quantity: Number(quantity),
      }));

    onSave(newInventoryForDb);
    onClose();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSave();
  };

  if (!product) {
    return null;
  }

  const categoryName = product.categoryName || product.category || '';
  const categorySku = product.categorySku || product.categoryPrefix || (typeof product.sku === 'string' ? product.sku.split('-')[0] : '');
  const flavorName = product.flavor || '';
  const flavorSku = product.flavorSku || '';
  const skuPrefix = categorySku ? categorySku + '-' : '-';
  const enableManageContainers = typeof onManageContainers === 'function';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>Edit Inventory</h2>
          <button type="button" onClick={onClose} className="close-button">&times;</button>
        </div>

        <div className="modal-body">
          <div className="category-group">
            <div className="form-group">
              <label htmlFor="edit-category">Category</label>
              <input
                id="edit-category"
                type="text"
                value={categoryName}
                placeholder="Category name"
                disabled
              />
            </div>

            <button
              type="button"
              className="manage-btn"
              disabled={!enableManageContainers}
              onClick={() => enableManageContainers && onManageContainers(product)}
            >
              Manage Containers
            </button>

            <div className="form-group category-sku-group">
              <label htmlFor="edit-category-sku">Category SKU</label>
              <input
                id="edit-category-sku"
                type="text"
                value={categorySku}
                placeholder="Category SKU"
                disabled
              />
            </div>
          </div>

          <div className="tight-stack">
            <div className="form-group" id="flavor-group">
              <label htmlFor="edit-flavor">Flavor</label>
              <input
                id="edit-flavor"
                type="text"
                value={flavorName}
                placeholder="Flavor"
                disabled
              />
            </div>

            <div className="form-group" id="flavor-sku-wrap">
              <label htmlFor="flavor-sku">Flavor SKU</label>
              <div className="flavor-sku-group">
                <span className="sku-prefix">{skuPrefix}</span>
                <input
                  id="flavor-sku"
                  type="text"
                  value={flavorSku}
                  placeholder="Flavor SKU"
                  disabled
                />
              </div>
            </div>
          </div>

          <h4>Container Inventory</h4>
          {inventory.length > 0 ? (
            inventory.map((item, index) => {
              const inputId = 'inventory-' + (item.id || index);
              const labelText = item.name + ' (' + item.weightOz + ' oz)';
              return (
                <div key={item.id || index} className="form-group">
                  <label htmlFor={inputId}>{labelText}</label>
                  <input
                    id={inputId}
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    min="0"
                  />
                </div>
              );
            })
          ) : (
            <p>No container types have been defined for this product's category.</p>
          )}
        </div>

        <div className="modal-footer">
          <button type="submit" className="add-btn">Save</button>
        </div>
      </form>
    </div>
  );
};

export default EditInventoryModal;
