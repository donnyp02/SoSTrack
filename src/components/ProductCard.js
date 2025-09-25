// src/components/ProductCard.js
import React from 'react';
import './ProductCard.css';

// This object maps status names to their colors.
const statusColors = {
  'Make': '#dc3545', // Red
  'Package': '#ffc107', // Yellow
  'Ready': '#28a745', // Green
  'Idle': '#6c757d', // Grey
};

// Our component function. It receives a 'product' object as a "prop".
const ProductCard = ({ product, categoryName, onClick }) => {
  // Get the color for the current product's status, or a default grey.
  const color = statusColors[product.status] || '#6c757d';

  return (
    // We use an inline style to set the colored border on the left.
    <div className="product-card" onClick={onClick} style={{ borderLeftColor: color }}>
      <div className="product-info">
        <h3 className="product-flavor">{categoryName} {product.flavor}</h3>
        {/* We will add category name here later */}
      </div>
      <div className="product-status">
        <span>{product.status}</span>
      </div>
    </div>
  );
};

export default ProductCard;