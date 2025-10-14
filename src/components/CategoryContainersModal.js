import React, { useState } from 'react';
import './CategoryContainersModal.css';

// It now correctly expects a 'category' prop
const CategoryContainersModal = ({ category, onSave, onClose }) => {
  const templates = category?.containerTemplates || [];
  const [packageOptions, setPackageOptions] = useState(templates);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newSku, setNewSku] = useState('');
  const [editingOptionId, setEditingOptionId] = useState(null);

  const handleEditClick = (option) => {
    setEditingOptionId(option.id);
    setNewName(option.name);
    setNewWeight(option.weightOz);
    setNewSku(option.sku || '');
  };

  const handleFormSubmit = () => {
    if (!newName || !newWeight || parseFloat(newWeight) <= 0) {
      alert('Please enter a valid name and a weight greater than 0.');
      return;
    }
    if (editingOptionId) {
      const updatedOptions = packageOptions.map(opt => 
        opt.id === editingOptionId 
          ? { ...opt, name: newName, weightOz: parseFloat(newWeight), sku: newSku } 
          : opt
      );
      setPackageOptions(updatedOptions);
    } else {
      const newOption = {
        id: `pkg_${newName.toLowerCase().replace(/\s+/g, '_')}`,
        name: newName,
        weightOz: parseFloat(newWeight),
        sku: newSku
      };
      setPackageOptions([...packageOptions, newOption]);
    }
    cancelEdit();
  };
  
  const cancelEdit = () => {
    setEditingOptionId(null);
    setNewName('');
    setNewWeight('');
    setNewSku('');
  };

  const handleSave = () => {
    onSave(packageOptions);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content small-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Manage Templates for "{category?.name || 'Unnamed Category'}"</h3>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <div className="options-list">
            {packageOptions.length === 0 ? (
              <p className="no-options">No container templates defined yet.</p>
            ) : (
              packageOptions.map(opt => (
                <div key={opt.id} className="option-item" onClick={() => handleEditClick(opt)}>
                  <span>{opt.name} ({opt.weightOz} oz) - SKU: {opt.sku}</span>
                </div>
              ))
            )}
          </div>
          <div className="add-new-option-container">
            <h4>{editingOptionId ? 'Edit Template' : 'Add New Template'}</h4>
            <div className="form-inputs">
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Template Name (e.g., 4oz Bag)" />
              <input type="number" value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="Weight in Oz" />
              <input type="text" value={newSku} onChange={e => setNewSku(e.target.value)} placeholder="SKU Suffix (e.g., 4)" />
            </div>
            <div className="form-actions-inline">
              {editingOptionId && (<button onClick={cancelEdit} className="cancel-edit-btn">Cancel</button>)}
              <button onClick={handleFormSubmit} className="add-update-btn">{editingOptionId ? 'Update' : 'Add'}</button>
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
