import React, { useMemo } from 'react';
import './ManagementModal.css'; // Reuse existing modal styles

/**
 * CSV Import Preview Modal - Shows inventory changes before committing
 * Displays current inventory, deductions, and final inventory for each affected product
 */
function CsvImportPreviewModal({ rows, products, categories, onConfirm, onCancel }) {
  // Calculate inventory deltas for all affected products
  const inventoryChanges = useMemo(() => {
    const changes = {};

    rows.forEach(row => {
      if (!row.assignedProduct) return;

      const product = Object.values(products || {}).find(p => p.id === row.assignedProduct);
      if (!product) return;

      const category = categories[product.categoryId];
      let container = null;

      // Find container by ID or SKU
      if (row.assignedContainerId) {
        container = (category?.containerTemplates || []).find(ct => ct.id === row.assignedContainerId);
      }
      if (!container) {
        const skuTail = (row.sku || '').toString().split('-').pop();
        container = (category?.containerTemplates || []).find(ct => ct.sku === skuTail);
      }

      if (!container) return;

      const quantity = parseInt(row['product quantity'], 10);
      if (isNaN(quantity)) return;

      const productKey = product.id;
      if (!changes[productKey]) {
        changes[productKey] = {
          product,
          category,
          containers: {}
        };
      }

      const containerKey = container.id;
      if (!changes[productKey].containers[containerKey]) {
        const currentInventory = (product.containerInventory || []).find(inv => inv.templateId === container.id);
        changes[productKey].containers[containerKey] = {
          container,
          currentQty: currentInventory?.quantity || 0,
          deduction: 0,
          finalQty: currentInventory?.quantity || 0
        };
      }

      changes[productKey].containers[containerKey].deduction += quantity;
      changes[productKey].containers[containerKey].finalQty -= quantity;
    });

    return Object.values(changes);
  }, [rows, products, categories]);

  const hasNegativeInventory = inventoryChanges.some(change =>
    Object.values(change.containers).some(c => c.finalQty < 0)
  );

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-content wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirm CSV Import</h2>
          <button onClick={onCancel} className="close-button">&times;</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {hasNegativeInventory && (
            <div style={{
              padding: '12px',
              marginBottom: '16px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              color: '#856404'
            }}>
              <strong>⚠️ Warning:</strong> Some products will have negative inventory after this import!
            </div>
          )}

          <p style={{ marginBottom: '16px', color: '#666' }}>
            This import will deduct <strong>{rows.length} items</strong> from inventory.
            Review the changes below and click <strong>Commit Import</strong> to proceed.
          </p>

          {inventoryChanges.map((change, idx) => (
            <div key={idx} style={{
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1em', color: '#333' }}>
                {change.category?.name} {change.product.flavor}
              </h3>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600' }}>Container</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>Current</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontWeight: '600', color: '#dc3545' }}>Deduct</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>Final</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(change.containers).map((containerChange, cIdx) => {
                    const isNegative = containerChange.finalQty < 0;
                    return (
                      <tr key={cIdx} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '8px' }}>{containerChange.container.name}</td>
                        <td style={{ textAlign: 'right', padding: '8px' }}>{containerChange.currentQty}</td>
                        <td style={{ textAlign: 'right', padding: '8px', color: '#dc3545', fontWeight: '600' }}>
                          -{containerChange.deduction}
                        </td>
                        <td style={{
                          textAlign: 'right',
                          padding: '8px',
                          fontWeight: '600',
                          color: isNegative ? '#dc3545' : '#28a745'
                        }}>
                          {containerChange.finalQty}
                          {isNegative && ' ⚠️'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {inventoryChanges.length === 0 && (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
              No inventory changes detected. Make sure products are assigned in the CSV.
            </p>
          )}
        </div>

        <div className="modal-footer" style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid #dee2e6'
        }}>
          <button
            className="status-btn grey"
            onClick={onCancel}
            style={{ flex: '0 0 auto', minWidth: '100px' }}
          >
            Cancel
          </button>
          <button
            className="status-btn green"
            onClick={onConfirm}
            disabled={inventoryChanges.length === 0}
            style={{ flex: '0 0 auto', minWidth: '150px' }}
          >
            Commit Import
          </button>
        </div>
      </div>
    </div>
  );
}

export default CsvImportPreviewModal;
