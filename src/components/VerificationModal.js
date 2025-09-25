// src/components/VerificationModal.js
import React from 'react';
import './VerificationModal.css';

const VerificationModal = ({ product, category, finalCountData, onVerify, onClose }) => {
  // Create a comparison table for easy display
  const comparisonData = category.packageOptions.map(pkg => {
    const requestedPkg = product.request?.requestedPackages?.find(rp => rp.packageId === pkg.id);
    const countedPkg = finalCountData.countedPackages.find(cp => cp.packageId === pkg.id);

    const requestedQty = requestedPkg?.quantity || 0;
    const producedQty = countedPkg?.quantity || 0;
    const difference = producedQty - requestedQty;

    return {
      name: pkg.name,
      requested: requestedQty,
      produced: producedQty,
      difference: difference
    };
  });

  const isOver = comparisonData.some(d => d.difference > 0);
  const isUnder = comparisonData.some(d => d.difference < 0);
  let summaryText = "On Count";
  let summaryClass = "on-count";
  if (isOver && !isUnder) { summaryText = "Over Count"; summaryClass = "over-count"; }
  if (isUnder && !isOver) { summaryText = "Under Count"; summaryClass = "under-count"; }
  if (isOver && isUnder) { summaryText = "Mixed Count"; summaryClass = "mixed-count"; }

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Verify Final Count</h3>
        </div>
        <div className="modal-body">
          <div className={`summary-box ${summaryClass}`}>
            {summaryText}
          </div>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Requested</th>
                <th>Produced</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map(row => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.requested}</td>
                  <td>{row.produced}</td>
                  <td className={row.difference !== 0 ? 'diff' : ''}>{row.difference > 0 ? `+${row.difference}` : row.difference}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-actions">
            <button onClick={onClose} className="btn-change">Change</button>
            <button onClick={onVerify} className="btn-verify">Verify</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;