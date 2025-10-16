import React, { useState, useMemo } from 'react';
import { FaQrcode, FaTimes } from 'react-icons/fa';
import './MakeRequestModal.css';
import QRScanner from './QRScanner';

// Generate production lot number
const generateProductionLotNumber = () => {
  const now = new Date();
  const date = now.toISOString().split('T')[0].replace(/-/g, '');
  const time = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `PROD-${date}-${time}${random}`;
};

// It now correctly expects the 'product' prop
const MakeRequestModal = ({ product, onSubmit, onClose }) => {
  const [quantities, setQuantities] = useState({});
  const [freezeDryerInfo, setFreezeDryerInfo] = useState({
    machineId: '',
    machineName: '',
    manualEntry: false
  });
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [productionLotNumber] = useState(generateProductionLotNumber());

  const productName = useMemo(() => {
    if (!product) return '';
    const candidates = [
      product.displayName,
      product.name,
      product.flavor,
      product.label,
      product.title
    ].filter(Boolean);
    if (candidates.length > 0) return candidates[0];
    const categoryPieces = [product.categoryLabel, product.categoryName]
      .filter(Boolean)
      .join(' ');
    return categoryPieces || 'Selected product';
  }, [product]);

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

  const handleQRScan = (scannedData) => {
    // Parse scanned QR code
    // Expected format: "FD-01" or "FD-01|Freeze Dryer #1"
    const parts = scannedData.split('|');
    const machineId = parts[0];
    const machineName = parts[1] || `Freeze Dryer ${machineId}`;

    setFreezeDryerInfo({
      machineId,
      machineName,
      manualEntry: false
    });
    setShowQRScanner(false);
  };

  const handleManualFreezeDryerEntry = (value) => {
    setFreezeDryerInfo({
      machineId: value,
      machineName: value ? `Freeze Dryer ${value}` : '',
      manualEntry: true
    });
  };

  const clearFreezeDryer = () => {
    setFreezeDryerInfo({
      machineId: '',
      machineName: '',
      manualEntry: false
    });
  };

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
      calculatedWeightLbs: parseFloat(totalWeightLbs),
      // Add production lot number
      productionLotNumber,
      // Add freeze dryer info if provided
      freezeDryer: freezeDryerInfo.machineId ? {
        machineId: freezeDryerInfo.machineId,
        machineName: freezeDryerInfo.machineName,
        startTime: new Date()
      } : null,
      // Placeholder for ingredient lots (will implement next)
      ingredientLotConsumption: []
    };
    onSubmit(requestData);
  };

  return (
    <>
      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
        title="Scan Freeze Dryer QR Code"
        subtitle="Point camera at QR code on freeze dryer"
      />
      <div className="modal-backdrop">
        <div className="modal-content small-modal">
          <div className="modal-header">
            <div className="modal-title-block">
              <h3>New Production Run</h3>
              {productName && (
                <p className="production-product-name">{productName}</p>
              )}
            </div>
            <button onClick={onClose} className="close-button">&times;</button>
          </div>
          <div className="modal-body" style={{display: 'block'}}>
            {packageOptions.length > 0 ? (
              <>
                {/* Production Lot Number */}
                <div className="lot-number-display">
                  <label>Production Lot #</label>
                  <div className="lot-number-badge">{productionLotNumber}</div>
                </div>

                {/* Freeze Dryer Scanner */}
                <div className="freeze-dryer-section">
                  <label>Freeze Dryer (Optional)</label>
                  {!freezeDryerInfo.machineId ? (
                    <div className="scanner-buttons">
                      <button
                        type="button"
                        className="btn-scan-qr"
                        onClick={() => setShowQRScanner(true)}
                      >
                        <FaQrcode /> Scan QR Code
                      </button>
                      <span style={{margin: '0 8px', color: '#9ca3af'}}>or</span>
                      <input
                        type="text"
                        placeholder="Enter machine ID manually"
                        onChange={(e) => handleManualFreezeDryerEntry(e.target.value)}
                        className="manual-entry-input"
                      />
                    </div>
                  ) : (
                    <div className="freeze-dryer-selected">
                      <div className="machine-info">
                        <strong>{freezeDryerInfo.machineName}</strong>
                        <small>{freezeDryerInfo.machineId}</small>
                      </div>
                      <button
                        type="button"
                        className="btn-clear"
                        onClick={clearFreezeDryer}
                        title="Clear freeze dryer"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  )}
                </div>

                {/* Package Quantities */}
                <div className="package-section">
                  <label>Package Quantities</label>
                  <p style={{fontSize: '0.9rem', color: '#6b7280', margin: '4px 0 12px'}}>
                    Enter the number of retail packages needed.
                  </p>
                  <div className="package-inputs">
                    {packageOptions.map(pkg => (
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
                </div>

                <div className="weight-display">
                  <h4>Total Weight Required</h4>
                  <span>{totalWeightLbs} lbs</span>
                </div>

                <div className="form-actions">
                  <button onClick={onClose} className="btn-cancel">Cancel</button>
                  <button onClick={handleSubmit} className="btn-submit">Start Production Run</button>
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
    </>
  );
};

export default MakeRequestModal;
