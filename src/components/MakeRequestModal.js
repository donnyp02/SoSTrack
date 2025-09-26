import React, { useState, useMemo } from 'react';
import './MakeRequestModal.css';

// It now correctly expects the 'product' prop
const MakeRequestModal = ({ product, onSubmit, onClose }) => {
  const [quantities, setQuantities] = useState({});

  const handleQuantityChange = (packageId, value) => {
    const newQuantities = { ...quantities };
    newQuantities[packageId] = parseInt(value, 10) || 0;
    setQuantities(newQuantities);
  };
  
  const packageOptions = product?.packageOptions || [];

  const totalWeightLbs = useMemo(() => {
    let totalOunces = 0;
    for (const packageId in quantities) {
      const pkg = packageOptions.find(p => p.id === packageId);
      if (pkg && quantities[packageId] > 0) {
        totalOunces += pkg.weightOz * quantities[packageId];
      }
    }
    return (totalOunces / 16).toFixed(2);
  }, [quantities, packageOptions]);

  const handleSubmit = () => {
    const requestedPackages = packageOptions
      .filter(pkg => quantities[pkg.id] > 0)
      .map(pkg => ({
        packageId: pkg.id,
        quantity: quantities[pkg.id],
      }));

    if (requestedPackages.length === 0) {
        alert("Please enter a quantity for at least one package type.");
        return;
    }

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
        <div className="modal-body" style={{display: 'block'}}>
          {packageOptions.length > 0 ? (
            <>
              <p>Enter the number of retail packages needed.</p>
              <div className="package-inputs">
                {packageOptions.map(pkg => (
                  <div className="package-input-group" key={pkg.id}>
                    <label>{pkg.name}</label>
                    <input type="number" min="0" placeholder="0" onChange={(e) => handleQuantityChange(pkg.id, e.target.value)} />
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
            </>
          ) : (
            <div style={{textAlign: 'center'}}>
              <p>There are no container templates defined for this product's category.</p>
              <button onClick={onClose} className="btn-cancel" style={{marginTop: '10px'}}>OK</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MakeRequestModal;