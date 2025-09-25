// src/components/ProductCard.js
import React from 'react';
import './ProductCard.css';

// This object maps status names to their solid border colors.
const statusColors = {
  'Make': '#dc3545',    // Red
  'Package': '#ffc107', // Yellow
  'Ready': '#28a745',   // Green
  'Idle': '#6c757d',    // Grey
};

// --- NEW ---
// This object maps status names to their transparent gradient.
const statusGradients = {
  'Make': 'linear-gradient(to right, rgba(220, 53, 69, 0.25), transparent 15%)',
  'Package': 'linear-gradient(to right, rgba(255, 193, 7, 0.25), transparent 15%)',
  'Ready': 'linear-gradient(to right, rgba(40, 167, 69, 0.25), transparent 15%)',
  'Idle': 'linear-gradient(to right, rgba(108, 117, 125, 0.25), transparent 15%)',
};


const ProductCard = ({ product, categoryName, onClick }) => {
  // Get the color for the current product's status, or a default grey.
  const color = statusColors[product.status] || '#6c757d';
  // Get the gradient for the current product's status, or a default none.
  const gradient = statusGradients[product.status] || 'none';

  // --- UPDATED ---
  // Create a style object to apply both the border and the background gradient.
  const cardStyle = {
    borderLeftColor: color,
    background: gradient,
    backgroundColor: '#fff' // Fallback for the white background
  };

  return (
    // We now apply the combined style object here.
    <div className="product-card" style={cardStyle} onClick={onClick}>
      <div className="product-info">
        <h3 className="product-flavor">{categoryName} {product.flavor}</h3>
      </div>
      <div className="product-status">
        <span>{product.status}</span>
      </div>
    </div>
  );
};

export default ProductCard;