// src/components/AddProductModal.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './AddProductModal.css';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import CategoryContainersModal from './CategoryContainersModal';
import { combineFlavorName, stripContainerSuffix, normalizeString } from '../utils/containerUtils';

const toArray = (value) => (Array.isArray(value) ? value : []);

const AddProductModal = ({
  categories,
  products,
  canDeleteCategory = false,
  onClose,
  onSubmit,
  onDataRefresh,
  productToEdit,
  categoryToEdit
}) => {
  const [categoryInput, setCategoryInput] = useState('');
  const [flavor, setFlavor] = useState('');
  const [categorySku, setCategorySku] = useState('');
  const [flavorSku, setFlavorSku] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isContainersModalOpen, setIsContainersModalOpen] = useState(false);
  const [skuTouched, setSkuTouched] = useState(false);
  const [selectedContainers, setSelectedContainers] = useState([]);
  const containerInitializedRef = useRef(false);

  const isEditMode = !!productToEdit;
  const containerTemplates = useMemo(() => {
    const templates = selectedCategory?.containerTemplates;
    return Array.isArray(templates) ? templates : [];
  }, [selectedCategory]);

  const selectedContainerId = selectedContainers[0] || '';
  const selectedContainer = useMemo(
    () => containerTemplates.find((template) => template?.id === selectedContainerId) || null,
    [containerTemplates, selectedContainerId]
  );

  const combinedFlavor = useMemo(
    () => combineFlavorName(flavor, selectedContainer?.name),
    [flavor, selectedContainer]
  );

  const containerSku = useMemo(
    () => normalizeString(selectedContainer?.sku),
    [selectedContainer]
  );

  const previewSku = useMemo(() => {
    const parts = [];
    const categoryPart = normalizeString(categorySku);
    const flavorPart = normalizeString(flavorSku);
    if (categoryPart) parts.push(categoryPart);
    if (flavorPart) parts.push(flavorPart);
    if (containerSku) parts.push(containerSku);
    return parts.join('-');
  }, [categorySku, flavorSku, containerSku]);

  useEffect(() => {
    containerInitializedRef.current = false;
    if (isEditMode) {
      setFlavor(productToEdit?.flavor || '');
      setFlavorSku(productToEdit?.flavorSku || '');
      setCategoryInput(categoryToEdit?.name || '');
      setCategorySku(categoryToEdit?.sku || '');
      setSelectedCategory(categoryToEdit || null);
      setSelectedContainers(toArray(productToEdit?.selectedContainers));
    } else {
      setCategoryInput('');
      setCategorySku('');
      setFlavor('');
      setFlavorSku('');
      setSelectedCategory(null);
      setSelectedContainers([]);
    }
  }, [isEditMode, productToEdit, categoryToEdit]);

  useEffect(() => {
    if (!categoryInput) {
      setSelectedCategory(null);
      return;
    }

    const norm = (s) => (s || '').toString().trim().toLowerCase();
    const base = (s) => {
      const normalized = norm(s);
      return normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
    };

    // First try exact match
    let found = Object.values(categories || {}).find(
      (cat) => norm(cat?.name) === norm(categoryInput)
    );

    // If no exact match, try base comparison (with plural handling)
    if (!found) {
      found = Object.values(categories || {}).find(
        (cat) => base(cat?.name) === base(categoryInput)
      );
    }

    setSelectedCategory(found || null);
    if (found) setCategorySku((found.sku || '').toUpperCase());
  }, [categoryInput, categories]);

  useEffect(() => {
    if (!selectedCategory) {
      if (selectedContainers.length) setSelectedContainers([]);
      return;
    }

    if (!containerTemplates.length) {
      if (selectedContainers.length) setSelectedContainers([]);
      return;
    }

    const currentId = selectedContainers[0];
    if (currentId && !containerTemplates.some((template) => template?.id === currentId)) {
      setSelectedContainers([]);
    }
  }, [selectedCategory, containerTemplates, selectedContainers]);

  useEffect(() => {
    if (!isEditMode) {
      containerInitializedRef.current = false;
      return;
    }

    if (containerInitializedRef.current) return;
    if (!selectedCategory) return;
    if (!productToEdit) return;

    if (selectedContainers.length > 0) {
      containerInitializedRef.current = true;
      return;
    }

    if (!containerTemplates.length) {
      containerInitializedRef.current = true;
      return;
    }

    const existingFlavor = normalizeString(productToEdit.flavor);
    if (!existingFlavor) {
      containerInitializedRef.current = true;
      return;
    }

    const match = containerTemplates.find((template) => {
      const templateName = normalizeString(template?.name);
      if (!templateName) return false;
      const flavorLower = existingFlavor.toLowerCase();
      const templateLower = templateName.toLowerCase();
      return (
        flavorLower === templateLower ||
        flavorLower.endsWith(` ${templateLower}`) ||
        flavorLower.endsWith(templateLower)
      );
    });

    if (match) {
      setSelectedContainers([match.id]);
      const stripped = normalizeString(
        stripContainerSuffix(existingFlavor, containerTemplates, match.id)
      );
      if (stripped !== flavor) {
        setFlavor(stripped);
      }
    } else {
      const stripped = normalizeString(stripContainerSuffix(existingFlavor, containerTemplates));
      if (stripped && stripped !== flavor) {
        setFlavor(stripped);
      }
    }

    containerInitializedRef.current = true;
  }, [
    isEditMode,
    selectedCategory,
    productToEdit,
    containerTemplates,
    selectedContainers.length,
    flavor,
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalCategory = normalizeString(categoryInput);
    const finalFlavor = normalizeString(combinedFlavor);

    if (!finalCategory || !finalFlavor) {
      alert('Please fill out both category and flavor.');
      return;
    }

    onSubmit({
      category: finalCategory,
      flavor: finalFlavor,
      categorySku: normalizeString(categorySku),
      flavorSku: normalizeString(flavorSku),
      selectedContainers,
      containerName: normalizeString(selectedContainer?.name),
      containerSku,
    });
  };

  const handleSaveContainers = async (payload) => {
    if (!selectedCategory) {
      alert('Please create the main product first before managing containers for a new category.');
      return;
    }

    const newPackageOptions = Array.isArray(payload)
      ? payload
      : payload?.templates || [];
    const nextSelectedId = Array.isArray(payload)
      ? null
      : payload?.selectedTemplateId || null;
    const currentCombinedFlavor = combineFlavorName(flavor, selectedContainer?.name);

    const categoryDocRef = doc(db, 'categories', selectedCategory.id);
    try {
      await updateDoc(categoryDocRef, { containerTemplates: newPackageOptions });
      setSelectedCategory((prev) =>
        prev ? { ...prev, containerTemplates: newPackageOptions } : prev
      );

      const candidateId = nextSelectedId || selectedContainerId || null;
      const hasCandidate =
        candidateId && newPackageOptions.some((opt) => opt.id === candidateId);

      if (hasCandidate) {
        setSelectedContainers([candidateId]);
      } else if (newPackageOptions.length > 0) {
        setSelectedContainers([newPackageOptions[0].id]);
      } else {
        setSelectedContainers([]);
      }

      const recalculatedBase = normalizeString(
        stripContainerSuffix(
          currentCombinedFlavor,
          newPackageOptions,
          hasCandidate ? candidateId : null
        )
      );
      if (recalculatedBase !== flavor) {
        setFlavor(recalculatedBase);
      }

      setIsContainersModalOpen(false);
      onDataRefresh && onDataRefresh();
    } catch (error) {
      console.error('Error updating containers: ', error);
      alert('Failed to update containers.');
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    const catId = selectedCategory.id;
    const inUseCount = Object.values(products || {}).filter(p => p.categoryId === catId).length;
    if (inUseCount > 0) {
      alert(`Cannot delete category in use by ${inUseCount} product(s). Move or delete those products first.`);
      return;
    }
    if (!window.confirm(`Delete category "${selectedCategory.name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'categories', catId));
      setSelectedCategory(null);
      setCategoryInput('');
      setCategorySku('');
      onDataRefresh && onDataRefresh();
      alert('Category deleted.');
    } catch (err) {
      console.error('Failed to delete category', err);
      alert('Failed to delete category.');
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
          <div className="modal-header">
            <h2>{isEditMode ? 'Edit Product' : 'Add New Product'}</h2>
            <button type="button" onClick={onClose} className="close-button">&times;</button>
          </div>

          <div className="modal-body">
            {/* Category row */}
            <div className="category-group">
              <div className="form-group">
                <div className="category-label-row">
                  <label htmlFor="category">Category</label>
                  {canDeleteCategory && !isEditMode && selectedCategory?.id && (
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Delete Category"
                      onClick={handleDeleteCategory}
                    >
                      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" strokeWidth="2"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
                <input
                  id="category"
                  type="text"
                  list="category-list"
                  value={categoryInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategoryInput(val);
                    // The useEffect will handle finding and setting the selected category
                  }}
                  onBlur={async (e) => {
                    const newName = e.target.value.toString().trim();
                    if (!newName) return;
                    const norm = (s) => (s || '').toString().trim().toLowerCase();
                    const base = (s) => { const n = norm(s); return n.endsWith('s') ? n.slice(0, -1) : n; };
                    const found = Object.values(categories || {}).find(c => base(c.name) === base(newName));
                    if (found && found.name !== newName) {
                      try {
                        await updateDoc(doc(db, 'categories', found.id), { name: newName });
                        setSelectedCategory({ ...found, name: newName });
                      } catch (err) { console.error('Failed to rename category', err); }
                    }
                  }}
                  placeholder="Type or choose a Category"
                />
                <datalist id="category-list">
                  {Object.values(categories || {}).map((cat) => (
                    <option key={cat.id} value={cat.name} />
                  ))}
                </datalist>
              </div>

              <div className="form-group category-sku-group">
                <label htmlFor="category-sku">Category SKU</label>
                <input
                  id="category-sku"
                  type="text"
                  value={categorySku}
                  onChange={(e) => setCategorySku(e.target.value)}
                  placeholder="e.g., SK"
                />
              </div>
            </div>

            {/* Container row - condensed inline layout */}
            <div className="container-row">
              <div className="form-group">
                <label htmlFor="container-select">Container</label>
                <select
                  id="container-select"
                  className="container-select"
                  value={selectedContainerId}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === selectedContainerId) return;

                    const stripped = stripContainerSuffix(
                      combineFlavorName(flavor, selectedContainer?.name),
                      containerTemplates,
                      selectedContainerId
                    );
                    if (stripped !== flavor) {
                      setFlavor(stripped);
                    }

                    if (value) {
                      setSelectedContainers([value]);
                    } else {
                      setSelectedContainers([]);
                    }
                  }}
                  disabled={!selectedCategory || containerTemplates.length === 0}
                >
                  <option value="">
                    {selectedCategory
                      ? containerTemplates.length
                        ? 'Select a container...'
                        : 'No containers defined'
                      : 'Select a category first'}
                  </option>
                  {containerTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.weightOz} oz)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="manage-btn"
                disabled={!selectedCategory}
                onClick={() => setIsContainersModalOpen(true)}
              >
                Manage Containers
              </button>
            </div>

            {/* TIGHT STACK: Flavor + Flavor SKU are controlled together */}
            <div className="tight-stack">
              <div className="form-group" id="flavor-group">
                <label htmlFor="flavor">Flavor</label>
                <input
                  id="flavor"
                  type="text"
                  value={flavor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFlavor(val);
                    if (!skuTouched && /sour/i.test(val)) {
                      setFlavorSku(prev => (prev && prev.length ? prev : 'SOUR-'));
                    }
                  }}
                  placeholder="e.g., Blue Raspberry"
                />
              </div>

              <div className="form-group" id="flavor-sku-wrap">
                <label htmlFor="flavor-sku">Flavor SKU</label>
                <div className="flavor-sku-group">
                  <span className="sku-prefix">{categorySku ? `${categorySku}-` : '-'}</span>
                  <input
                    id="flavor-sku"
                    type="text"
                    value={flavorSku}
                    onChange={(e) => { setFlavorSku(e.target.value); setSkuTouched(true); }}
                    placeholder="e.g., BLURAS"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Consolidated preview (no label) */}
          {(() => {
            const mainParts = [];
            if (categoryInput) mainParts.push(categoryInput.trim());
            if (combinedFlavor) mainParts.push(combinedFlavor);
            const mainText = mainParts.join(' ').replace(/\s+/g, ' ').trim();
            return (
              <div className="product-preview">
                <div className="preview-value">
                  <span className="preview-main">{mainText || '-'}</span>
                  {previewSku && (
                    <span className="preview-sku"> {previewSku}</span>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="modal-footer">
            <button type="submit" className="add-btn">
              {isEditMode ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>

      {isContainersModalOpen && selectedCategory && (
        <CategoryContainersModal
          category={selectedCategory}
          selectedTemplateId={selectedContainerId || null}
          onClose={() => setIsContainersModalOpen(false)}
          onSave={handleSaveContainers}
        />
      )}
    </>
  );
};

export default AddProductModal;

