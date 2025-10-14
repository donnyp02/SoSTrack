import React from 'react';
import { List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import ProductCard from './ProductCard';

const VirtualizedProductList = ({ products = [], categories = {}, onProductClick }) => {
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = (categories && typeof categories === 'object') ? categories : {};

  const CARD_HEIGHT = 100;
  const GAP = 10;

  const Row = ({ index, style }) => {
    const product = safeProducts[index];
    const category = product ? safeCategories[product.categoryId] : undefined;
    if (!product) return null;
    return (
      <div style={{ ...style, paddingBottom: GAP }}>
        <ProductCard
          product={product}
          category={category}
          onClick={() => onProductClick && onProductClick(product.id)}
        />
      </div>
    );
  };

  if (safeProducts.length === 0) {
    return (
      <div className="empty-state">
        <p>No products found</p>
      </div>
    );
  }

  return (
    <div className="virtualized-list-container">
      <AutoSizer>
        {({ height, width }) => {
          if (!height || !width) return null;
          return (
            <List
              height={height}
              itemCount={safeProducts.length}
              itemSize={CARD_HEIGHT + GAP}
              width={width}
              overscanCount={5}
            >
              {Row}
            </List>
          );
        }}
      </AutoSizer>
    </div>
  );
};

export default VirtualizedProductList;
