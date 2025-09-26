// src/components/AddProductModal.js
import React, { useState, useEffect } from 'react';
import './AddProductModal.css';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import CategoryContainersModal from './CategoryContainersModal';

const AddProductModal = ({ categories, onClose, onSubmit, onDataRefresh, productToEdit, categoryToEdit }) => {
  const [categoryInput, setCategoryInput] = useState('');
  const [flavor, setFlavor] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isContainersModalOpen, setIsContainersModalOpen] = useState(false);
  const isEditMode = !!productToEdit;

  useEffect(() => {
    if (isEditMode) {
      setFlavor(productToEdit.flavor);
      setCategoryInput(categoryToEdit?.name || '');
    }
  }, [isEditMode, productToEdit, categoryToEdit]);
  
  useEffect(() => {
    const foundCategory = Object.values(categories).find(cat => cat.name?.toLowerCase() === categoryInput?.toLowerCase());
    setSelectedCategory(foundCategory || null);
  }, [categoryInput, categories]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!categoryInput || !flavor) {
      alert('Please fill out both category and flavor.');
      return;
    }
    onSubmit({ category: categoryInput.trim(), flavor: flavor.trim() });
  };

  const handleSaveContainers = async (newPackageOptions) => {
    if (!selectedCategory) {
      alert("Please create the main product first before managing containers for a new category.");
      return;
    }
    const categoryDocRef = doc(db, "categories", selectedCategory.id);
    try {
      await updateDoc(categoryDocRef, { packageOptions: newPackageOptions });
      setIsContainersModalOpen(false);
      onDataRefresh();
    } catch (error) {
      console.error("Error updating containers: ", error);
      alert("Failed to update containers.");
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
          <div className="modal-header">
            <h2>{isEditMode ? 'Edit Product' : 'Add New Product'}</h2>
            <button type="button" onClick={onClose} className="close-button">&times;</button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <div className="category-input-group">
                <input id="category" list="category-options" value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)} placeholder="Select or Type a Category" />
                <datalist id="category-options">
                  {Object.values(categories).map(cat => ( <option key={cat.id} value={cat.name} /> ))}
                </datalist>
                <button type="button" className="manage-btn" disabled={!selectedCategory} onClick={() => setIsContainersModalOpen(true)}>Manage Containers</button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="flavor">Flavor</label>
              <input id="flavor" type="text" value={flavor} onChange={(e) => setFlavor(e.target.value)} placeholder="e.g., Blue Raspberry" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="submit" className="add-btn">{isEditMode ? 'Save Changes' : 'Add Product'}</button>
          </div>
        </form>
      </div>
      {isContainersModalOpen && selectedCategory && (
        <CategoryContainersModal category={selectedCategory} onClose={() => setIsContainersModalOpen(false)} onSave={handleSaveContainers} />
      )}
    </>
  );
};

export default AddProductModal;