import React, { useState, useMemo } from 'react';
import { FaTimes } from 'react-icons/fa';
import './LocationSelector.css';

/**
 * LocationSelector component
 * Allows users to select a destination location for batch movement
 * and optionally split quantities across multiple locations
 */
const LocationSelector = ({
  isOpen,
  onClose,
  onConfirm,
  currentLocation = null,
  currentQuantity = 0,
  locations = [],
  title = 'Move Batch to Location'
}) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [notes, setNotes] = useState('');
  const [splitQuantity, setSplitQuantity] = useState(null);
  const [multipleDestinations, setMultipleDestinations] = useState(false);
  const [destinations, setDestinations] = useState([]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedLocation) {
      alert('Please select a destination location');
      return;
    }

    const quantityToMove = multipleDestinations
      ? destinations.reduce((sum, d) => sum + (d.quantity || 0), 0)
      : (splitQuantity || currentQuantity);

    if (quantityToMove <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (quantityToMove > currentQuantity) {
      alert(`Cannot move ${quantityToMove} units - only ${currentQuantity} units available`);
      return;
    }

    const movement = {
      fromLocation: currentLocation || 'Unknown',
      toLocation: selectedLocation,
      quantity: quantityToMove,
      notes: notes || ''
    };

    if (multipleDestinations && destinations.length > 1) {
      movement.destinations = destinations;
    }

    onConfirm(movement);
  };

  const handleAddDestination = () => {
    setDestinations([...destinations, { location: null, quantity: 0 }]);
  };

  const handleUpdateDestination = (index, field, value) => {
    const updated = [...destinations];
    updated[index] = { ...updated[index], [field]: value };
    setDestinations(updated);
  };

  const handleRemoveDestination = (index) => {
    setDestinations(destinations.filter((_, i) => i !== index));
  };

  return (
    <div className="modal-backdrop" onClick={() => onClose()}>
      <div className="modal-content location-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>

        <div className="modal-body">
          <div className="location-info">
            {currentLocation && (
              <div className="current-location">
                <label>Current Location:</label>
                <strong>{currentLocation}</strong>
              </div>
            )}
            <div className="quantity-info">
              <label>Quantity Available:</label>
              <strong>{currentQuantity}</strong>
            </div>
          </div>

          <div className="location-selection">
            <label>Move To Location:</label>
            <select
              value={selectedLocation || ''}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="location-select"
            >
              <option value="">-- Select a location --</option>
              {locations.map((loc) => (
                <option key={loc.id || loc.name} value={loc.name || loc.id}>
                  {loc.name || loc.id} {loc.area ? `(${loc.area})` : ''}
                </option>
              ))}
            </select>
          </div>

          {!multipleDestinations && (
            <div className="quantity-input-group">
              <label>Quantity to Move:</label>
              <input
                type="number"
                min="0"
                max={currentQuantity}
                value={splitQuantity || currentQuantity}
                onChange={(e) => setSplitQuantity(parseInt(e.target.value) || 0)}
                placeholder="Enter quantity"
              />
              <span className="qty-note">(leave blank to move all)</span>
            </div>
          )}

          <div className="notes-section">
            <label>Notes (optional):</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., 'Unloaded after 6hr freeze dry cycle'"
              rows="3"
            />
          </div>

          <div className="multiple-destinations-toggle">
            <input
              type="checkbox"
              id="multi-dest"
              checked={multipleDestinations}
              onChange={(e) => {
                setMultipleDestinations(e.target.checked);
                if (e.target.checked) {
                  setDestinations([]);
                } else {
                  setDestinations([]);
                }
              }}
            />
            <label htmlFor="multi-dest">Split across multiple locations</label>
          </div>

          {multipleDestinations && destinations.length > 0 && (
            <div className="destinations-list">
              <h4>Destinations:</h4>
              {destinations.map((dest, idx) => (
                <div key={idx} className="destination-row">
                  <input
                    type="number"
                    min="0"
                    max={currentQuantity}
                    placeholder="Qty"
                    value={dest.quantity || ''}
                    onChange={(e) => handleUpdateDestination(idx, 'quantity', parseInt(e.target.value) || 0)}
                    className="dest-qty"
                  />
                  <select
                    value={dest.location || ''}
                    onChange={(e) => handleUpdateDestination(idx, 'location', e.target.value)}
                    className="dest-location"
                  >
                    <option value="">Select location...</option>
                    {locations.map((loc) => (
                      <option key={loc.id || loc.name} value={loc.name || loc.id}>
                        {loc.name || loc.id}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemoveDestination(idx)}
                    className="btn-remove-dest"
                    title="Remove this destination"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
              <button onClick={handleAddDestination} className="btn-add-dest">
                + Add Location
              </button>
            </div>
          )}

          <div className="form-actions">
            <button onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button onClick={handleConfirm} className="btn-submit">
              Confirm Move
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSelector;
