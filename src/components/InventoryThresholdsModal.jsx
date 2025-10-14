import React, { useState } from 'react';

const InventoryThresholdsModal = ({ category, onSave, onClose }) => {
  const templates = category?.containerTemplates || category?.packageOptions || [];
  const [rows, setRows] = useState(templates.map(t => ({ id: t.id, name: t.name, minQty: t.minQty || 0 })));

  const update = (id, val) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, minQty: Math.max(0, Number(val) || 0) } : r));
  };

  const handleSave = () => {
    onSave(rows);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Thresholds</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={{ textAlign: 'left' }}>Container</th><th>Min Qty</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td style={{ textAlign: 'center' }}>
                    <input type="number" min="0" value={r.minQty} onChange={e => update(r.id, e.target.value)} style={{ width: 100 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="modal-footer">
          <button className="add-btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default InventoryThresholdsModal;

