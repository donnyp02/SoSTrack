// src/components/MakeRequestModal.js
import React, { useState, useMemo } from 'react';
import './MakeRequestModal.css';

const MakeRequestModal = ({ category, onSubmit, onClose }) => {
  // State to hold the quantity for each package option, e.g., { pkg_4oz: 10, pkg_8oz: 5 }
  const [quantities, setQuantities] = useState({});

  const handleQuantityChange = (packageId, value) => {
    const newQuantities = { ...quantities };
    // Ensure we're dealing with numbers, default to 0 if input is empty/invalid
    newQuantities[packageId] = parseInt(value, 10) || 0;
    setQuantities(newQuantities);
  };

  // useMemo will re-calculate the weight only when the 'quantities' change.
  const totalWeightLbs = useMemo(() => {
    let totalOunces = 0;
    for (const packageId in quantities) {
      const pkg = category.packageOptions.find(p => p.id === packageId);
      if (pkg && quantities[packageId] > 0) {
        totalOunces += pkg.weightOz * quantities[packageId];
      }
    }
    return (totalOunces / 16).toFixed(2); // Convert ounces to pounds
  }, [quantities, category.packageOptions]);

  const handleSubmit = () => {
    // Filter out any packages with 0 quantity
    const requestedPackages = category.packageOptions
      .filter(pkg => quantities[pkg.id] > 0)
      .map(pkg => ({
        packageId: pkg.id,
        quantity: quantities[pkg.id],
      }));

    const requestData = {
      requestedPackages,
      calculatedWeightLbs: parseFloat(totalWeightLbs)
    };
    onSubmit(requestData);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content small-modal">
        <div className="modal-header">
          <h3>New Make Request</h3>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <p>Enter the number of retail packages needed.</p>
          <div className="package-inputs">
            {category.packageOptions.map(pkg => (
              <div className="package-input-group" key={pkg.id}>
                <label>{pkg.name}</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  onChange={(e) => handleQuantityChange(pkg.id, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="weight-display">
            <h4>Total Weight Required</h4>
            <span>{totalWeightLbs} lbs</span>
          </div>
          <div className="form-actions">
            <button onClick={onClose} className="btn-cancel">Cancel</button>
            <button onClick={handleSubmit} className="btn-submit">Submit Request</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MakeRequestModal;