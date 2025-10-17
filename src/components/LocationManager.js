import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import './LocationManager.css';

/**
 * LocationManager component
 * Manages the list of storage locations/areas in the warehouse
 */
const LocationManager = ({
  locations = [],
  onAddLocation,
  onEditLocation,
  onDeleteLocation,
  isOpen = true
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    area: '',
    type: 'storage', // 'machine', 'storage', 'staging', 'packing'
    capacity: '',
    notes: ''
  });

  const locationTypes = [
    { value: 'machine', label: 'Machine (Freeze Dryer)' },
    { value: 'storage', label: 'Storage Area' },
    { value: 'staging', label: 'Staging/Holding' },
    { value: 'packing', label: 'Packing Station' },
    { value: 'shipping', label: 'Shipping Area' },
    { value: 'other', label: 'Other' }
  ];

  const handleAddClick = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData({
      name: '',
      area: '',
      type: 'storage',
      capacity: '',
      notes: ''
    });
  };

  const handleEditClick = (location) => {
    setEditingId(location.id);
    setIsAddingNew(false);
    setFormData({
      name: location.name || '',
      area: location.area || '',
      type: location.type || 'storage',
      capacity: location.capacity || '',
      notes: location.notes || ''
    });
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData({
      name: '',
      area: '',
      type: 'storage',
      capacity: '',
      notes: ''
    });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Please enter a location name');
      return;
    }

    if (editingId) {
      onEditLocation(editingId, formData);
    } else {
      onAddLocation(formData);
    }

    handleCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="location-manager">
      <div className="location-manager-header">
        <h3>Manage Storage Locations</h3>
        <button onClick={handleAddClick} className="btn-add-location">
          <FaPlus /> Add Location
        </button>
      </div>

      {/* Add/Edit Form */}
      {(isAddingNew || editingId) && (
        <div className="location-form">
          <h4>{editingId ? 'Edit Location' : 'Add New Location'}</h4>
          
          <div className="form-group">
            <label>Location Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Machine FD-01, Tray Racks Area C"
            />
          </div>

          <div className="form-group">
            <label>Area/Zone</label>
            <input
              type="text"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              placeholder="e.g., Production - Freezer, Packaging - Main"
            />
          </div>

          <div className="form-group">
            <label>Location Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              {locationTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Capacity (optional)</label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="e.g., 200 units"
            />
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g., Temperature controlled, accessible until 6pm"
              rows="2"
            />
          </div>

          <div className="form-actions">
            <button onClick={handleCancel} className="btn-cancel">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-save">
              {editingId ? 'Update' : 'Add'} Location
            </button>
          </div>
        </div>
      )}

      {/* Locations List */}
      <div className="locations-list">
        {locations.length === 0 ? (
          <div className="empty-state">
            <p>No locations created yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="locations-grid">
            {locations.map(location => (
              <div key={location.id} className="location-card">
                <div className="location-card-header">
                  <h4>{location.name}</h4>
                  <div className="location-card-actions">
                    <button
                      onClick={() => handleEditClick(location)}
                      className="btn-edit"
                      title="Edit location"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete location "${location.name}"? This cannot be undone.`)) {
                          onDeleteLocation(location.id);
                        }
                      }}
                      className="btn-delete"
                      title="Delete location"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>

                {location.area && (
                  <p className="location-area">
                    <strong>Area:</strong> {location.area}
                  </p>
                )}

                <p className="location-type">
                  <strong>Type:</strong> {locationTypes.find(t => t.value === location.type)?.label || location.type}
                </p>

                {location.capacity && (
                  <p className="location-capacity">
                    <strong>Capacity:</strong> {location.capacity}
                  </p>
                )}

                {location.notes && (
                  <p className="location-notes">
                    <strong>Notes:</strong> {location.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationManager;
