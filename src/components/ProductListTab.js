import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import ProductCard from './ProductCard';
import VirtualizedProductList from './VirtualizedProductList';

/**
 * Reusable tab component for Production, Packaging, and Shipping tabs
 * Displays filtered product list with search and category filter
 */
function ProductListTab({
  displayList,
  categories,
  loading,
  searchTerm,
  setSearchTerm,
  selectedCategoryId,
  setSelectedCategoryId,
  onProductClick,
  showImportButton = false,
  showReportsButton = false,
  onImportClick,
  onReportsClick
}) {
  return (
    <>
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by flavor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
        >
          <option value="">All Categories</option>
          {Object.values(categories || {})
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
        </select>
        <button
          className="clear-btn"
          onClick={() => {
            setSearchTerm('');
            setSelectedCategoryId('');
          }}
        >
          Clear
        </button>
        {showReportsButton && (
          <button
            className="btn-secondary"
            style={{ marginLeft: 'auto' }}
            onClick={onReportsClick}
          >
            Reports
          </button>
        )}
        {showImportButton && (
          <button
            className="btn-primary"
            style={{ marginLeft: showReportsButton ? '12px' : 'auto' }}
            onClick={onImportClick}
          >
            Import CSV
          </button>
        )}
      </div>
      <div className="inventory-list">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ErrorBoundary>
            {/* Use virtualization for large lists (50+ products) for better performance */}
            {displayList && displayList.length >= 50 ? (
              <VirtualizedProductList
                products={displayList}
                categories={categories}
                onProductClick={onProductClick}
              />
            ) : (
              <div className="simple-list">
                {(displayList || []).map((product) => (
                  <div key={product.id} style={{ paddingBottom: 6 }}>
                    <ProductCard
                      product={product}
                      category={categories[product.categoryId]}
                      onClick={() => onProductClick(product.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </ErrorBoundary>
        )}
      </div>
    </>
  );
}

export default ProductListTab;
