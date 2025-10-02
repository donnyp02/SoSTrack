// src/components/EditInventoryModal.js
import React, { useEffect, useMemo, useState } from "react";
import "./AddProductModal.css"; // share the same modern styles as Add modal

/**
 * Props
 * - product: {
 *     id, flavor, categoryId, packageOptions?: [{ id, name, weightOz, quantity? }]
 *   }
 * - categories: map/dict keyed by categoryId -> { id, name, sku, packageOptions? }
 * - selectedCategory: optional category object already selected higher up
 * - onManageContainers: (categoryObj) => void   // opens the category containers modal
 * - onSave: (newInventoryArray) => void         // [{ templateId, quantity }]
 * - onClose: () => void
 */
const EditInventoryModal = ({
  product,
  categories,
  selectedCategory,
  onManageContainers,
  onSave,
  onClose,
}) => {
  // ----- derive category name / sku robustly -----
  const categoryFromMap =
    product?.categoryId && categories ? categories[product.categoryId] : null;

  const category = useMemo(
    () => selectedCategory ?? categoryFromMap ?? null,
    [selectedCategory, categoryFromMap]
  );

  const categoryName =
    category?.name ??
    product?.categoryName ?? // legacy fallback if present
    product?.category ?? // legacy fallback if present
    "";

  const categorySku =
    category?.sku ?? product?.categorySku ?? ""; // legacy fallback if present

  // ----- inventory state comes from product.packageOptions -----
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    if (product?.packageOptions?.length) {
      const initial = product.packageOptions.map((opt) => ({
        ...opt,
        quantity: Number(opt.quantity) || 0,
      }));
      setInventory(initial);
    } else {
      setInventory([]); // no templates on product/category
    }
  }, [product]);

  // ----- interactions -----
  const handleQuantityChange = (index, value) => {
    const next = [...inventory];
    // clamp to non-negative integer
    const n = Math.max(0, Number(value));
    next[index].quantity = Number.isFinite(n) ? n : 0;
    setInventory(next);
  };

  const handleSave = (e) => {
    e?.preventDefault?.();
    // Only send items with quantity > 0 to keep data clean
    const payload = inventory
      .filter((i) => Number(i.quantity) > 0)
      .map((i) => ({
        templateId: i.id,
        quantity: Number(i.quantity),
      }));
    onSave?.(payload);
    onClose?.();
  };

  // If no product yet, don't render modal
  if (!product) return null;

  const canManage = Boolean(onManageContainers && category);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
      >
        <div className="modal-header">
          <h2>Edit Inventory</h2>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Category row (read-only) + Manage Containers */}
          <div className="category-group">
            <div className="form-group">
              <label>Category</label>
              <input value={categoryName} readOnly />
            </div>

            <button
              type="button"
              className="manage-btn"
              disabled={!canManage}
              onClick={() => onManageContainers?.(category)}
              title={
                canManage
                  ? "Manage Containers"
                  : "Select a valid category to manage containers"
              }
            >
              Manage Containers
            </button>

            <div className="form-group category-sku-group">
              <label htmlFor="category-sku">Category SKU</label>
              <input id="category-sku" value={categorySku} readOnly />
            </div>
          </div>

          {/* Flavor + Flavor SKU (read-only SKU prefix; you’re editing inventory here) */}
          <div className="tight-stack">
            <div className="form-group" id="flavor-group">
              <label htmlFor="flavor">Flavor</label>
              <input
                id="flavor"
                value={product.flavor ?? ""}
                readOnly
                placeholder="Flavor"
              />
            </div>

            <div className="form-group" id="flavor-sku-wrap">
              <label htmlFor="flavor-sku">Flavor SKU</label>
              <div className="flavor-sku-group">
                <span className="sku-prefix">
                  {categorySku ? `${categorySku}-` : "-"}
                </span>
                <input
                  id="flavor-sku"
                  value={product.flavorSku ?? ""}
                  readOnly
                  placeholder="e.g., BLURAS"
                />
              </div>
            </div>
          </div>

          {/* Inventory editor */}
          <div style={{ marginTop: 16 }}>
            <h4 style={{ margin: "12px 0 8px 0" }}>Container Inventory</h4>

            {inventory.length > 0 ? (
              inventory.map((item, idx) => (
                <div key={item.id} className="form-group">
                  <label htmlFor={`qty-${item.id}`}>
                    {item.name} {item.weightOz ? `(${item.weightOz} oz)` : ""}
                  </label>
                  <input
                    id={`qty-${item.id}`}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(idx, e.target.value)}
                    placeholder="0"
                  />
                </div>
              ))
            ) : (
              <p style={{ color: "#5b6470" }}>
                No container types have been defined for this product’s
                category.
              </p>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="submit" className="add-btn">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditInventoryModal;
