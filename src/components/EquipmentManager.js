import React, { useState, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaQrcode, FaTimes } from 'react-icons/fa';
import { useConfirm } from '../hooks/useConfirm';
import './EquipmentManager.css';

const EQUIPMENT_TYPES = [
  { value: 'freezeDryer', label: 'Freeze Dryer' },
  { value: 'scale', label: 'Scale' },
  { value: 'mixer', label: 'Mixer' },
  { value: 'packaging', label: 'Packaging Station' },
  { value: 'storage', label: 'Storage Area' },
  { value: 'other', label: 'Other' }
];

const EquipmentManager = ({ equipment = {}, onClose }) => {
  const { showConfirm, ConfirmDialog } = useConfirm();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    machineId: '',
    name: '',
    type: 'freezeDryer',
    location: '',
    status: 'active',
    notes: ''
  });

  const equipmentList = useMemo(() => {
    return Object.entries(equipment).map(([id, data]) => ({
      id,
      ...data
    })).sort((a, b) => (a.machineId || '').localeCompare(b.machineId || ''));
  }, [equipment]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      machineId: '',
      name: '',
      type: 'freezeDryer',
      location: '',
      status: 'active',
      notes: ''
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleStartEdit = (item) => {
    setFormData({
      machineId: item.machineId || '',
      name: item.name || '',
      type: item.type || 'freezeDryer',
      location: item.location || '',
      status: item.status || 'active',
      notes: item.notes || ''
    });
    setEditingId(item.id);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formData.machineId.trim()) {
      toast.error('Machine ID is required');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    // Check for duplicate machine ID
    const isDuplicate = equipmentList.some(item =>
      item.machineId === formData.machineId.trim() &&
      item.id !== editingId
    );
    if (isDuplicate) {
      toast.error('Machine ID already exists');
      return;
    }

    try {
      const equipmentData = {
        machineId: formData.machineId.trim(),
        name: formData.name.trim(),
        type: formData.type,
        location: formData.location.trim(),
        status: formData.status,
        notes: formData.notes.trim(),
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        // Update existing
        await updateDoc(doc(db, 'equipment', editingId), equipmentData);
        toast.success('Equipment updated successfully');
      } else {
        // Add new
        equipmentData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'equipment'), equipmentData);
        toast.success('Equipment added successfully');
      }

      resetForm();
    } catch (error) {
      console.error('Error saving equipment:', error);
      toast.error(`Failed to save: ${error.message}`);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = await showConfirm({
      title: 'Delete Equipment?',
      message: `Delete ${item.name} (${item.machineId})? This cannot be undone.`,
      confirmText: 'Delete',
      confirmColor: 'red',
      icon: <FaExclamationTriangle />
    });

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'equipment', item.id));
      toast.success('Equipment deleted');
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const generateQRCode = (machineId, name) => {
    // Generate QR code data (format: "machineId|name")
    const qrData = `${machineId}|${name}`;

    // Open QR code generator (you can use a service like qr-code-generator.com)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
    window.open(qrUrl, '_blank');
  };

  return (
    <>
      <ConfirmDialog />
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content equipment-manager-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h2>Equipment Manager</h2>
              <p>Manage freeze dryers, scales, and other equipment</p>
            </div>
            <button className="close-button" onClick={onClose}>
              <FaTimes />
            </button>
          </div>

          <div className="modal-body">
            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
              <div className="equipment-form">
                <h3>{editingId ? 'Edit Equipment' : 'Add New Equipment'}</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Machine ID *</label>
                    <input
                      type="text"
                      placeholder="e.g., FD-01"
                      value={formData.machineId}
                      onChange={(e) => handleInputChange('machineId', e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label>Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Big Bertha"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label>Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                    >
                      {EQUIPMENT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Location</label>
                    <input
                      type="text"
                      placeholder="e.g., Production Room A"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="retired">Retired</option>
                    </select>
                  </div>

                  <div className="form-field full-width">
                    <label>Notes</label>
                    <textarea
                      placeholder="Additional notes..."
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                  <button className="btn-primary" onClick={handleSave}>
                    {editingId ? 'Update' : 'Add'} Equipment
                  </button>
                </div>
              </div>
            )}

            {/* Equipment List */}
            <div className="equipment-list-section">
              <div className="list-header">
                <h3>Equipment ({equipmentList.length})</h3>
                {!isAdding && !editingId && (
                  <button className="btn-add" onClick={handleStartAdd}>
                    <FaPlus /> Add Equipment
                  </button>
                )}
              </div>

              {equipmentList.length === 0 ? (
                <div className="empty-state">
                  <p>No equipment registered yet.</p>
                  <button className="btn-primary" onClick={handleStartAdd}>
                    <FaPlus /> Add Your First Equipment
                  </button>
                </div>
              ) : (
                <div className="equipment-cards">
                  {equipmentList.map(item => (
                    <div key={item.id} className={`equipment-card ${item.status}`}>
                      <div className="card-header">
                        <div className="card-title">
                          <strong>{item.name}</strong>
                          <span className="machine-id">{item.machineId}</span>
                        </div>
                        <span className={`status-badge ${item.status}`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="card-body">
                        <div className="card-detail">
                          <span className="label">Type:</span>
                          <span>{EQUIPMENT_TYPES.find(t => t.value === item.type)?.label || item.type}</span>
                        </div>
                        {item.location && (
                          <div className="card-detail">
                            <span className="label">Location:</span>
                            <span>{item.location}</span>
                          </div>
                        )}
                        {item.notes && (
                          <div className="card-detail">
                            <span className="label">Notes:</span>
                            <span>{item.notes}</span>
                          </div>
                        )}
                      </div>

                      <div className="card-actions">
                        <button
                          className="btn-icon btn-qr"
                          onClick={() => generateQRCode(item.machineId, item.name)}
                          title="Generate QR Code"
                        >
                          <FaQrcode /> QR Code
                        </button>
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => handleStartEdit(item)}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(item)}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EquipmentManager;
