// src/components/ProductCard.js
import React, { useMemo } from 'react';
import './ProductCard.css';

const statusColors = { 'Make': '#dc3545', 'Package': '#ffc107', 'Ready': '#28a745', 'Idle': '#6c757d', 'Completed': '#6c757d' };
const statusGradients = { 'Make': 'linear-gradient(to right, rgba(220, 53, 69, 0.25), transparent 40%)', 'Package': 'linear-gradient(to right, rgba(255, 193, 7, 0.25), transparent 40%)', 'Ready': 'linear-gradient(to right, rgba(40, 167, 69, 0.25), transparent 40%)', 'Idle': 'linear-gradient(to right, rgba(108, 117, 125, 0.15), transparent 40%)', 'Completed': 'linear-gradient(to right, rgba(108, 117, 125, 0.15), transparent 40%)' };

const ProductCard = ({ product, category, onClick }) => {
  const { stripedBarStyle, cardBackgroundStyle } = useMemo(() => {
    const activeStatuses = [...new Set(
        (product.batches || [])
            .filter(b => b.status !== 'Completed' && b.status !== 'Idle')
            .map(b => b.status)
    )];

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

    return { stripedBarStyle, cardBackgroundStyle };
  }, [product]);

  const formatInventory = () => {
    const totalOunces = product.onHandOz || 0;
    const lbs = Math.floor(totalOunces / 16);
    const oz = totalOunces % 16;
    return `${lbs} lbs ${oz} oz`;
  };

  return (
    <div className="product-card" onClick={onClick}>
      <div className="striped-bar" style={stripedBarStyle}></div>
      <div className="card-background" style={cardBackgroundStyle}></div>
      <div className="product-info">
        <h3 className="product-flavor">{category?.name} {product.flavor} <span className="sku-display">{category?.sku}-{product.flavorSku}</span></h3>
      </div>
      <div className="product-status">
        <span>{formatInventory()}</span>
      </div>
    </div>
  );
};

export default ProductCard;