// src/components/ProductCard.js
import React, { useMemo, memo } from 'react';
import './ProductCard.css';

const statusColors = { 'Make': '#dc3545', 'Package': '#ffc107', 'Ready': '#28a745', 'Idle': '#6c757d', 'Completed': '#6c757d' };
const statusGradients = { 'Make': 'linear-gradient(to right, rgba(220, 53, 69, 0.25), transparent 40%)', 'Package': 'linear-gradient(to right, rgba(255, 193, 7, 0.25), transparent 40%)', 'Ready': 'linear-gradient(to right, rgba(40, 167, 69, 0.25), transparent 40%)', 'Idle': 'linear-gradient(to right, rgba(108, 117, 125, 0.15), transparent 40%)', 'Completed': 'linear-gradient(to right, rgba(108, 117, 125, 0.15), transparent 40%)' };

const ProductCard = memo(({ product, category, onClick }) => {
  const { stripedBarStyle, cardBackgroundStyle, statusBadges, inventoryLevel } = useMemo(() => {
    const batches = product.batches || [];
    const activeStatuses = [...new Set(
        batches
            .filter(b => b.status !== 'Completed' && b.status !== 'Idle')
            .map(b => b.status)
    )];

    // Count batches by status
    const statusCounts = batches.reduce((acc, batch) => {
      if (batch.status !== 'Completed' && batch.status !== 'Idle') {
        acc[batch.status] = (acc[batch.status] || 0) + 1;
      }
      return acc;
    }, {});

    const statusOrder = ['Make', 'Package', 'Ready'];
    activeStatuses.sort((a, b) => statusOrder.indexOf(a) - statusOrder.indexOf(b));

    const topStatus = activeStatuses[0] || product.status || 'Idle';

    const cardBackgroundStyle = { background: statusGradients[topStatus] || 'none' };

    let stripedBarStyle = {};
    if (activeStatuses.length > 1) {
        const colorStops = activeStatuses.map((status, index) => {
            const color = statusColors[status];
            const start = (100 / activeStatuses.length) * index;
            const end = start + (100 / activeStatuses.length);
            return `${color} ${start}%, ${color} ${end}%`;
        }).join(', ');
        stripedBarStyle = { background: `linear-gradient(to bottom, ${colorStops})` };
    } else {
        stripedBarStyle = { background: statusColors[topStatus] };
    }

    // Create status badges with counts
    const statusBadges = statusOrder
      .filter(status => statusCounts[status])
      .map(status => ({
        status,
        count: statusCounts[status],
        color: statusColors[status]
      }));

    // Check inventory level based on package options thresholds
    let inventoryLevel = 'good'; // good, low, critical
    const packageOptions = product.packageOptions || [];
    if (packageOptions.length > 0) {
      const hasLowStock = packageOptions.some(opt => {
        const quantity = opt.quantity || 0;
        const minQty = opt.minQty || 0;
        return minQty > 0 && quantity < minQty;
      });

      const hasCriticalStock = packageOptions.some(opt => {
        const quantity = opt.quantity || 0;
        const minQty = opt.minQty || 0;
        return minQty > 0 && quantity < minQty * 0.5; // Critical if below 50% of minimum
      });

      if (hasCriticalStock) {
        inventoryLevel = 'critical';
      } else if (hasLowStock) {
        inventoryLevel = 'low';
      }
    }

    return { stripedBarStyle, cardBackgroundStyle, statusBadges, inventoryLevel };
  }, [product]);

  const formatInventory = () => {
    const totalOunces = product.onHandOz || 0;
    const lbs = Math.floor(totalOunces / 16);
    const oz = totalOunces % 16;
    return `${lbs} lbs ${oz} oz`;
  };

  return (
    <div className={`product-card ${statusBadges.length === 0 ? 'idle' : ''}`} onClick={onClick}>
      <div className="striped-bar" style={stripedBarStyle}></div>
      <div className="card-background" style={cardBackgroundStyle}></div>
      <div className="product-info">
        <div className="product-header">
          <h3 className="product-flavor">{category?.name} {product.flavor}</h3>
          {statusBadges.length > 0 && (
            <div className="status-badges-inline">
              {statusBadges.map((badge, idx) => (
                <span
                  key={idx}
                  className="status-badge-inline"
                  style={{ backgroundColor: badge.color, color: badge.color === '#ffc107' ? '#333' : 'white' }}
                >
                  {badge.count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="product-status">
        <span className="inventory-amount">{formatInventory()}</span>
      </div>
    </div>
  );
});

export default ProductCard;