// src/components/ProductCard.js
import React from 'react';
import './ProductCard.css';

const statusColors = { 'Make': '#dc3545', 'Package': '#ffc107', 'Ready': '#28a745', 'Idle': '#6c757d' };
const statusGradients = { 'Make': 'linear-gradient(to right, rgba(220, 53, 69, 0.25), transparent 40%)', 'Package': 'linear-gradient(to right, rgba(255, 193, 7, 0.25), transparent 40%)', 'Ready': 'linear-gradient(to right, rgba(40, 167, 69, 0.25), transparent 40%)', 'Idle': 'linear-gradient(to right, rgba(108, 117, 125, 0.15), transparent 40%)' };

const ProductCard = ({ product, category, onClick }) => {
  const color = statusColors[product.status] || '#6c757d';
  const gradient = statusGradients[product.status] || 'none';
  const cardStyle = { borderLeftColor: color, background: gradient, backgroundColor: '#fff' };

  // NEW: Read directly from the onHandOz field
  const formatInventory = () => {
    const totalOunces = product.onHandOz || 0;
    const lbs = Math.floor(totalOunces / 16);
    const oz = totalOunces % 16;
    return `${lbs} lbs ${oz} oz`;
  };

  return (
    <div className="product-card" style={cardStyle} onClick={onClick}>
      <div className="product-info">
        <h3 className="product-flavor">{category?.name} {product.flavor}</h3>
      </div>
      <div className="product-status">
        <span>{formatInventory()}</span>
      </div>
    </div>
  );
};

export default ProductCard;