// src/components/AddProductModal.js
import React, { useState, useEffect } from 'react';
import './AddProductModal.css';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import CategoryContainersModal from './CategoryContainersModal';

const AddProductModal = ({
  categories,
  products,
  canDeleteCategory = false,
  onClose,
  onSubmit,
  onDataRefresh,
  productToEdit,
  categoryToEdit
}) => {
  const [categoryInput, setCategoryInput] = useState('');
  const [flavor, setFlavor] = useState('');
  const [categorySku, setCategorySku] = useState('');
  const [flavorSku, setFlavorSku] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isContainersModalOpen, setIsContainersModalOpen] = useState(false);
  const [useSelect, setUseSelect] = useState(true); // legacy flag, no longer used for UI switching
  const [skuTouched, setSkuTouched] = useState(false);

  const isEditMode = !!productToEdit;

  useEffect(() => {
    if (isEditMode) {
      setFlavor(productToEdit.flavor);
      setFlavorSku(productToEdit.flavorSku || '');
      setCategoryInput(categoryToEdit?.name || '');
      setCategorySku(categoryToEdit?.sku || '');
      setUseSelect(!!categoryToEdit?.name);
    } else {
      setCategoryInput('');
      setCategorySku('');
      setFlavor('');
      setFlavorSku('');
      setUseSelect(true);
      setSelectedCategory(null);
    }
  }, [isEditMode, productToEdit, categoryToEdit]);

  useEffect(() => {
    const norm = (s) => (s || '').toString().trim().toLowerCase();
    const found = Object.values(categories).find(
      (cat) => norm(cat.name) === norm(categoryInput)
    );
    setSelectedCategory(found || null);
    if (found) setCategorySku((found.sku || '').toUpperCase());
  }, [categoryInput, categories]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!categoryInput || !flavor) {
      alert('Please fill out both category and flavor.');
      return;
    }
    onSubmit({
      category: categoryInput.trim(),
      flavor: flavor.trim(),
      categorySku: categorySku.trim(),
      flavorSku: flavorSku.trim(),
    });
  };

  const handleSaveContainers = async (newPackageOptions) => {
    if (!selectedCategory) {
      alert('Please create the main product first before managing containers for a new category.');
      return;
    }
    const categoryDocRef = doc(db, 'categories', selectedCategory.id);
    try {
      await updateDoc(categoryDocRef, { packageOptions: newPackageOptions });
      setIsContainersModalOpen(false);
      onDataRefresh && onDataRefresh();
    } catch (error) {
      console.error('Error updating containers: ', error);
      alert('Failed to update containers.');
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    const catId = selectedCategory.id;
    const inUseCount = Object.values(products || {}).filter(p => p.categoryId === catId).length;
    if (inUseCount > 0) {
      alert(`Cannot delete category in use by ${inUseCount} product(s). Move or delete those products first.`);
      return;
    }
    if (!window.confirm(`Delete category "${selectedCategory.name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'categories', catId));
      setSelectedCategory(null);
      setCategoryInput('');
      setCategorySku('');
      onDataRefresh && onDataRefresh();
      alert('Category deleted.');
    } catch (err) {
      console.error('Failed to delete category', err);
      alert('Failed to delete category.');
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
          <div className="modal-header">
            <h2>{isEditMode ? 'Edit Product' : 'Add New Product'}</h2>
            <button type="button" onClick={onClose} className="close-button">&times;</button>
          </div>

          <div className="modal-body">
            {/* Category row */}
            <div className="category-group">
              <div className="form-group">
                <div className="category-label-row">
                  <label htmlFor="category">Category</label>
                  {canDeleteCategory && !isEditMode && selectedCategory?.id && (
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Delete Category"
                      onClick={handleDeleteCategory}
                    >
                      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" strokeWidth="2"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
                <input
                  id="category"
                  type="text"
                  list="category-list"
                  value={categoryInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategoryInput(val);
                    const norm = (s) => (s || '').toString().trim().toLowerCase();
                    const base = (s) => { const n = norm(s); return n.endsWith('s') ? n.slice(0, -1) : n; };
                    const found = Object.values(categories).find(c => base(c.name) === base(val));
                    setSelectedCategory(found || null);
                    if (found) setCategorySku(((found.sku) || '').toUpperCase());
                  }}
                  onBlur={async (e) => {
                    const newName = e.target.value.toString().trim();
                    if (!newName) return;
                    const norm = (s) => (s || '').toString().trim().toLowerCase();
                    const base = (s) => { const n = norm(s); return n.endsWith('s') ? n.slice(0, -1) : n; };
                    const found = Object.values(categories).find(c => base(c.name) === base(newName));
                    if (found && found.name !== newName) {
                      try {
                        await updateDoc(doc(db, 'categories', found.id), { name: newName });
                        setSelectedCategory({ ...found, name: newName });
                      } catch (err) { console.error('Failed to rename category', err); }
                    }
                  }}
                  placeholder="Type or choose a Category"
                />
                <datalist id="category-list">
                  {Object.values(categories).map((cat) => (
                    <option key={cat.id} value={cat.name} />
                  ))}
                </datalist>
              </div>

              <button
                type="button"
                className="manage-btn"
                disabled={!selectedCategory}
                onClick={() => setIsContainersModalOpen(true)}
              >
                Manage Containers
              </button>

              <div className="form-group category-sku-group">
                <label htmlFor="category-sku">Category SKU</label>
                <input
                  id="category-sku"
                  type="text"
                  value={categorySku}
                  onChange={(e) => setCategorySku(e.target.value)}
                  placeholder="e.g., SK"
                />
              </div>
            </div>

            {/* TIGHT STACK: Flavor + Flavor SKU are controlled together */}
            <div className="tight-stack">
              <div className="form-group" id="flavor-group">
                <label htmlFor="flavor">Flavor</label>
                <input
                  id="flavor"
                  type="text"
                  value={flavor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFlavor(val);
                    if (!skuTouched && /sour/i.test(val)) {
                      setFlavorSku(prev => (prev && prev.length ? prev : 'SOUR-'));
                    }
                  }}
                  placeholder="e.g., Blue Raspberry"
                />
              </div>

              <div className="form-group" id="flavor-sku-wrap">
                <label htmlFor="flavor-sku">Flavor SKU</label>
                <div className="flavor-sku-group">
                  <span className="sku-prefix">{categorySku ? `${categorySku}-` : '-'}</span>
                  <input
                    id="flavor-sku"
                    type="text"
                    value={flavorSku}
                    onChange={(e) => { setFlavorSku(e.target.value); setSkuTouched(true); }}
                    placeholder="e.g., BLURAS"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Consolidated preview (no label) */}
          {(() => {
            const mainParts = [];
            if (categoryInput) mainParts.push(categoryInput.trim());
            if (flavor) mainParts.push(flavor.trim());
            const mainText = mainParts.join(' ').replace(/\s+/g, ' ').trim();
            const sku = (categorySku || flavorSku)
              ? `${categorySku ? `${categorySku}-` : ''}${flavorSku || ''}`
              : '';
            return (
              <div className="product-preview">
                <div className="preview-value">
                  <span className="preview-main">{mainText || '—'}</span>
                  {sku && (
                    <span className="preview-sku"> {sku}</span>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="modal-footer">
            <button type="submit" className="add-btn">
              {isEditMode ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>

      {isContainersModalOpen && selectedCategory && (
        <CategoryContainersModal
          category={selectedCategory}
          onClose={() => setIsContainersModalOpen(false)}
          onSave={handleSaveContainers}
        />
      )}
    </>
  );
};

export default AddProductModal;



