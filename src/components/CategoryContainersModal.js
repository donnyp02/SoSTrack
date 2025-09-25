// src/components/CategoryContainersModal.js
import React, { useState } from 'react';
import './CategoryContainersModal.css';

const CategoryContainersModal = ({ category, onSave, onClose }) => {
  const [packageOptions, setPackageOptions] = useState(category.packageOptions || []);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [editingOptionId, setEditingOptionId] = useState(null);

  const handleEditClick = (option) => {
    setEditingOptionId(option.id);
    setNewName(option.name);
    setNewWeight(option.weightOz);
  };

  const handleFormSubmit = () => {
    if (!newName || !newWeight || parseFloat(newWeight) <= 0) {
      alert('Please enter a valid name and a weight greater than 0.');
      return;
    }

    if (editingOptionId) {
      const updatedOptions = packageOptions.map(opt => 
        opt.id === editingOptionId 
          ? { ...opt, name: newName, weightOz: parseFloat(newWeight) } 
          : opt
      );
      setPackageOptions(updatedOptions);
    } else {
      const newOption = {
        id: `pkg_${newName.toLowerCase().replace(/\s+/g, '_')}`,
        name: newName,
        weightOz: parseFloat(newWeight)
      };
      setPackageOptions([...packageOptions, newOption]);
    }
    
    cancelEdit();
  };
  
  const cancelEdit = () => {
    setEditingOptionId(null);
    setNewName('');
    setNewWeight('');
  };

  const handleSave = () => {
    onSave(packageOptions);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content small-modal">
        <div className="modal-header">
          <h3>Manage Containers for "{category.name}"</h3>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <div className="options-list">
            {packageOptions.length === 0 ? (
              <p className="no-options">No containers defined yet.</p>
            ) : (
              packageOptions.map(opt => (
                <div key={opt.id} className="option-item" onClick={() => handleEditClick(opt)}>
                  <span>{opt.name} ({opt.weightOz} oz)</span>
                </div>
              ))
            )}
          </div>

          <div className="add-new-option-container">
            <h4>{editingOptionId ? 'Edit Container' : 'Add New Container'}</h4>
            <div className="form-inputs">
              <input 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                placeholder="Package Name (e.g., 4oz Bag)" 
              />
              <input 
                type="number" 
                value={newWeight} 
                onChange={e => setNewWeight(e.target.value)}
                placeholder="Weight in Oz" 
              />
            </div>
            <div className="form-actions-inline">
              {editingOptionId && (
                <button onClick={cancelEdit} className="cancel-edit-btn">Cancel</button>
              )}
              <button onClick={handleFormSubmit} className="add-update-btn">
                {editingOptionId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={handleSave} className="save-btn">Save and Close</button>
        </div>
      </div>
    </div>
  );
};

export default CategoryContainersModal;