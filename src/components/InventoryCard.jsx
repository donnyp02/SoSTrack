import React, { useMemo, useRef } from 'react';
import { useInventory } from '../contexts/InventoryContext';
import './InventoryCard.css';

const formatWeight = (ounces) => {
  if (!ounces || Number.isNaN(ounces)) return '0 lbs 0 oz';
  const lbs = Math.floor(ounces / 16);
  const oz = Math.round(ounces % 16);
  return `${lbs} lbs ${oz} oz`;
};

const StatusChip = ({ rows }) => {
  let status = 'green';
  for (const row of rows) {
    const min = Number(row.minQty || 0);
    if (min <= 0) {
      continue;
    }
    if (row.qty < min) {
      status = 'critical';
      break;
    }
    if (row.qty === min && status !== 'critical') {
      status = 'warning';
    }
  }

  const label = status === 'critical' ? 'Needs Attention' : status === 'warning' ? 'Low' : 'Stocked';
  return <span className={`inventory-status-chip ${status}`}>{label}</span>;
};

const InventoryCard = ({ product, category, onPersistProduct, onOpenThresholds }) => {
  const { saveInventoryDelta } = useInventory();
  const inputsRef = useRef({});

  const rows = useMemo(() => {
    const templates = category?.containerTemplates || category?.packageOptions || [];
    const inv = product?.containerInventory || [];
    return templates.map((template) => {
      const found = inv.find((i) => i.templateId === template.id);
      return {
        id: template.id,
        name: template.name,
        weightOz: Number(template.weightOz || 0),
        minQty: Number(template.minQty || 0),
        qty: Number(found?.quantity || 0),
        sku: template.sku,
      };
    });
  }, [product, category]);

  const totals = useMemo(() => {
    const onHandOz = rows.reduce((sum, row) => sum + (row.qty * row.weightOz), 0);
    const totalPackages = rows.reduce((sum, row) => sum + row.qty, 0);
    return { onHandOz, totalPackages };
  }, [rows]);

  const resolveDelta = (templateId, direction) => {
    const input = inputsRef.current[templateId];
    const raw = input?.value;
    const parsed = raw === '' || raw == null ? NaN : Number(raw);
    const magnitude = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    if (input) {
      input.value = '';
    }
    return magnitude * Math.sign(direction || 1);
  };

  const applyDelta = async (templateId, direction) => {
    const delta = resolveDelta(templateId, direction);
    const before = rows.find((row) => row.id === templateId)?.qty || 0;
    saveInventoryDelta(product.id, templateId, delta, before);
    try {
      await onPersistProduct(product.id);
    } catch (error) {
      console.error('Persist failed', error);
    }
  };

  const handleKey = (event, templateId) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyDelta(templateId, 1);
    }
  };

  const tileState = (row) => {
    if (row.minQty <= 0) return '';
    if (row.qty < row.minQty) return 'critical';
    if (row.qty === row.minQty) return 'warning';
    return '';
  };

  return (
    <div className="inventory-touch-panel">
      <div className="inventory-touch-header">
        <div>
          <h3 className="inventory-touch-title">{product?.flavor}</h3>
          <div className="inventory-touch-subtitle">
            <span>{category?.name}</span>
            {category?.sku && (
              <span className="inventory-chip">{category.sku}</span>
            )}
            {product?.flavorSku && category?.sku && (
              <span className="inventory-chip">{category.sku}-{product.flavorSku}</span>
            )}
          </div>
        </div>
        <button type="button" className="inventory-gear-button" onClick={onOpenThresholds}>
          Edit thresholds
        </button>
      </div>

      <div className="inventory-touch-summary">
        <div className="summary-tile">
          <span className="summary-label">On hand</span>
          <span className="summary-value">{formatWeight(totals.onHandOz)}</span>
        </div>
        <div className="summary-tile">
          <span className="summary-label">Packages</span>
          <span className="summary-value">{totals.totalPackages}</span>
        </div>
        <div className="summary-tile status">
          <span className="summary-label">Status</span>
          <StatusChip rows={rows} />
        </div>
      </div>

      <div className="inventory-container-grid">
        {rows.length === 0 && (
          <div className="container-tile">No container templates defined yet.</div>
        )}
        {rows.map((row) => {
          const weightLabel = formatWeight(row.qty * row.weightOz);
          return (
            <div key={row.id} className={`container-tile ${tileState(row)}`}>
              <div className="container-tile-header">
                <h4>{row.name}</h4>
                <div className="container-tile-meta">
                  <span>Min {row.minQty}</span>
                  {row.sku && <span>{row.sku}</span>}
                </div>
              </div>
              <div className="container-tile-stats">
                <div>
                  <span className="meta-label">Qty</span>
                  <span className="meta-value">{row.qty}</span>
                </div>
                <div>
                  <span className="meta-label">Weight (per)</span>
                  <span className="meta-value">{row.weightOz} oz</span>
                </div>
                <div>
                  <span className="meta-label">On hand</span>
                  <span className="meta-value">{weightLabel}</span>
                </div>
              </div>
              <div className="container-tile-controls">
                <button
                  type="button"
                  className="container-action-btn minus"
                  onClick={() => applyDelta(row.id, -1)}
                  disabled={row.qty <= 0}
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  placeholder="Step"
                  ref={(el) => { inputsRef.current[row.id] = el; }}
                  onKeyDown={(event) => handleKey(event, row.id)}
                  className="container-step-input"
                />
                <button
                  type="button"
                  className="container-action-btn plus"
                  onClick={() => applyDelta(row.id, 1)}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryCard;
