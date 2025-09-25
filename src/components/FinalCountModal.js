// src/components/FinalCountModal.js
import React, { useState } from 'react';
// We can reuse the same CSS from our other modal!
import './MakeRequestModal.css';

const FinalCountModal = ({ category, onSubmit, onClose }) => {
  // State to hold the final count for each package option
  const [counts, setCounts] = useState({});

  const handleCountChange = (packageId, value) => {
    const newCounts = { ...counts };
    newCounts[packageId] = parseInt(value, 10) || 0;
    setCounts(newCounts);
  };

  const handleSubmit = () => {
    // Filter out any packages with 0 quantity
    const countedPackages = category.packageOptions
      .filter(pkg => counts[pkg.id] > 0)
      .map(pkg => ({
        packageId: pkg.id,
        quantity: counts[pkg.id],
      }));
    
    const finalCountData = { countedPackages };
    onSubmit(finalCountData);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content small-modal">
        <div className="modal-header">
          <h3>Final Production Count</h3>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <p>Enter the final number of retail packages produced.</p>
          <div className="package-inputs">
            {category?.packageOptions?.map(pkg => (
              <div className="package-input-group" key={pkg.id}>
                <label>{pkg.name}</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  onChange={(e) => handleCountChange(pkg.id, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button onClick={onClose} className="btn-cancel">Cancel</button>
            <button onClick={handleSubmit} className="btn-submit">Finalize</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalCountModal;