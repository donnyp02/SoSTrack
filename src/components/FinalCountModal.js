import React, { useState } from 'react';
import './MakeRequestModal.css';

// It now correctly expects the 'product' prop
const FinalCountModal = ({ product, onSubmit, onClose }) => {
  const [counts, setCounts] = useState({});

  const handleCountChange = (packageId, value) => {
    const newCounts = { ...counts };
    newCounts[packageId] = parseInt(value, 10) || 0;
    setCounts(newCounts);
  };

  const handleSubmit = () => {
    const countedPackages = (product.packageOptions || [])
      .filter(pkg => counts[pkg.id] > 0)
      .map(pkg => ({
        packageId: pkg.id,
        quantity: counts[pkg.id],
      }));
    
    if (countedPackages.length === 0) {
      alert("Please enter a quantity for at least one package.");
      return;
    }
    onSubmit({ countedPackages });
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
            {(product?.packageOptions || []).map(pkg => (
              <div className="package-input-group" key={pkg.id}>
                <label>{pkg.name}</label>
                <input type="number" min="0" placeholder="0" onChange={(e) => handleCountChange(pkg.id, e.target.value)} />
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