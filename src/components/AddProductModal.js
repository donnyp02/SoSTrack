// src/components/AddProductModal.js
import React, { useState, useEffect } from 'react';
import './AddProductModal.css';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import CategoryContainersModal from './CategoryContainersModal';

const AddProductModal = ({
  categories,
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
  const [useSelect, setUseSelect] = useState(true); // dropdown first

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
    const found = Object.values(categories).find(
      (cat) => cat.name?.toLowerCase() === categoryInput?.toLowerCase()
    );
    setSelectedCategory(found || null);
    if (found) setCategorySku(found.sku || '');
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
                <label htmlFor="category">Category</label>

                {useSelect ? (
                  <select
                    id="category"
                    className="selectlike"
                    value={categoryInput || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__NEW__') {
                        setUseSelect(false);
                        setCategoryInput('');
                        setSelectedCategory(null);
                        setCategorySku('');
                        return;
                      }
                      setCategoryInput(val);
                    }}
                  >
                    <option value="" disabled>Select a Category</option>
                    {Object.values(categories).map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                    <option value="__NEW__">➕ Create New Category</option>
                  </select>
                ) : (
                  <>
                    <input
                      id="category"
                      type="text"
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value)}
                      placeholder="Type a Category"
                    />
                    <div style={{ marginTop: 6 }}>
                      <button type="button" className="manage-btn" onClick={() => setUseSelect(true)}>
                        Back to List
                      </button>
                    </div>
                  </>
                )}
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
                  onChange={(e) => setFlavor(e.target.value)}
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
                    onChange={(e) => setFlavorSku(e.target.value)}
                    placeholder="e.g., BLURAS"
                  />
                </div>
              </div>
            </div>
          </div>

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
