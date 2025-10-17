import React, { useMemo, useState } from 'react';
import './AssignProductModal.css';

const AssignProductModal = ({ onClose, products, categories, row, onAssign, onAddNewProduct }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const categoryList = useMemo(() => Object.values(categories || {}), [categories]);
  const productList = useMemo(
    () => Object.values(products || {}).filter(p => !selectedCategoryId || p.categoryId === selectedCategoryId),
    [products, selectedCategoryId]
  );
  const selectedCategory = selectedCategoryId ? categories[selectedCategoryId] : null;
  const templates = selectedCategory?.containerTemplates || [];

  const productName = row?.['product name'] ?? row?.['Product Name'] ?? '';
  const productDescription = row?.['product description'] ?? row?.['Product Description'] ?? '';

  const handleAssign = () => {
    if (!selectedProductId) return;
    onAssign({
      productId: selectedProductId,
      categoryId: selectedCategoryId || products[selectedProductId]?.categoryId || '',
      templateId: selectedTemplateId || '',
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign Product</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <div className="assign-product-warning">
            Assign Product: {productName}; {productDescription}
          </div>

          <div className="form-group">
            <label>Category</label>
            <div className="assign-row">
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setSelectedProductId('');
                  setSelectedTemplateId('');
                }}
                className="assign-select flex-fill"
              >
                <option value="">Select a Category</option>
                {categoryList.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                <option value="__NEW__">+ Create New Category</option>
              </select>
              <button type="button" className="icon-button assign" title="Create New Category" onClick={onAddNewProduct}>✚</button>
            </div>
          </div>

          {selectedCategoryId === '__NEW__' && (
            <div className="assign-new-alert">
              <button type="button" className="btn-primary" onClick={onAddNewProduct}>Add Product</button>
            </div>
          )}

          {!!selectedCategoryId && selectedCategoryId !== '__NEW__' && (
            <>
              <div className="form-group">
                <label>Flavor</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => { setSelectedProductId(e.target.value); setSelectedTemplateId(''); }}
                  className="assign-select"
                >
                  <option value="">Select Flavor</option>
                  {productList.map(p => (
                    <option key={p.id} value={p.id}>{p.flavor}</option>
                  ))}
                </select>
              </div>

              {!!selectedProductId && (
                <div className="form-group">
                  <label>Container</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="assign-select"
                  >
                    <option value="">Select Container</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} {t.weightOz ? `(${t.weightOz}oz)` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={handleAssign} disabled={!selectedProductId} className="btn-primary">Assign</button>
          <button onClick={onAddNewProduct} type="button" className="manage-btn">Add Product</button>
        </div>
      </div>
    </div>
  );
};

export default AssignProductModal;








