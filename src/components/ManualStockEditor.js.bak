import React, { useState, useEffect } from 'react';
import './ManualStockEditor.css';

const ManualStockEditor = ({ products, categories, onSave }) => {
  const [inventory, setInventory] = useState({});

  useEffect(() => {
    const initialInventory = {};
    Object.values(products).forEach(product => {
      const category = categories[product.categoryId];
      const packageOptions = (category?.containerTemplates || []).map(template => {
        const inventoryItem = (product.containerInventory || []).find(inv => inv.templateId === template.id);
        return { ...template, quantity: inventoryItem?.quantity || 0 };
      });
      initialInventory[product.id] = {
        ...product,
        packageOptions: packageOptions,
      };
    });
    setInventory(initialInventory);
  }, [products, categories]);

  const handleQuantityChange = (productId, templateId, newQuantity) => {
    const updatedInventory = { ...inventory };
    const product = updatedInventory[productId];
    const packageOptionIndex = product.packageOptions.findIndex(opt => opt.id === templateId);
    
    if (packageOptionIndex > -1) {
        const n = Math.max(0, Number(newQuantity));
        product.packageOptions[packageOptionIndex].quantity = Number.isFinite(n) ? n : 0;
        setInventory(updatedInventory);
    }
  };

  const handleSave = () => {
    onSave(inventory);
  };

  return (
    <div className="manual-stock-editor">
      <h2>Manual Stock Editor</h2>
      <div className="product-inventory-list">
        {Object.values(inventory).map(product => (
          <div key={product.id} className="product-inventory-item">
            <h3>{categories[product.categoryId]?.name} {product.flavor}</h3>
            <div className="inventory-inputs">
              {product.packageOptions.map(option => (
                <div key={option.id} className="inventory-input-item">
                  <label>{option.name} ({option.weightOz}oz)</label>
                  <input
                    type="number"
                    value={option.quantity}
                    onChange={(e) => handleQuantityChange(product.id, option.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleSave} className="save-button">Save All Changes</button>
    </div>
  );
};

export default ManualStockEditor;
