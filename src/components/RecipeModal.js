import React, { useEffect, useMemo, useState } from 'react';
import './RecipeModal.css';

const defaultRow = (ingredientId, ingredient) => {
  const trackingType = ingredient?.trackingType || 'weight';
  const lbs = trackingType === 'weight' ? (ingredient?.defaultRecipeLbs || 0) : 0;
  const oz = trackingType === 'weight' ? (ingredient?.defaultRecipeOz || 0) : 0;
  const count = trackingType === 'count' ? 0 : 0;
  const amount = trackingType === 'weight' ? lbs + oz / 16 : count;
  return {
    id: Date.now() + Math.random(),
    ingredientId: ingredientId || '',
    ingredientName: ingredient?.name || '',
    trackingType,
    lbs: trackingType === 'weight' ? lbs : 0,
    oz: trackingType === 'weight' ? oz : 0,
    count: trackingType === 'count' ? count : 0,
    amount: amount,
  };
};

const convertRecipeItemToRow = (item, ingredientLookup) => {
  const ingredient = ingredientLookup[item.ingredientId] || {};
  const trackingType = item.trackingType || ingredient.trackingType || 'weight';
  if (trackingType === 'count') {
    const count = Number.isFinite(item.requiredAmount) ? Math.round(item.requiredAmount) : (item.requiredCount || 0);
    return {
      id: Date.now() + Math.random(),
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName || ingredient.name || '',
      trackingType,
      lbs: 0,
      oz: 0,
      count: count,
      amount: count,
    };
  }
  const rawAmount = Number.isFinite(item.requiredAmount) ? item.requiredAmount : 0;
  const lbs = Math.floor(rawAmount);
  let oz = Math.round((rawAmount - lbs) * 16);
  if (oz === 16) {
    return {
      id: Date.now() + Math.random(),
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName || ingredient.name || '',
      trackingType,
      lbs: lbs + 1,
      oz: 0,
      count: 0,
      amount: rawAmount,
    };
  }
  return {
    id: Date.now() + Math.random(),
    ingredientId: item.ingredientId,
    ingredientName: item.ingredientName || ingredient.name || '',
    trackingType,
    lbs,
    oz,
    count: 0,
    amount: rawAmount,
  };
};

const RecipeModal = ({
  isOpen,
  product,
  ingredients = {},
  recipe = null,
  onClose,
  onSave,
}) => {
  const [rows, setRows] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const ingredientList = useMemo(() => {
    return Object.values(ingredients).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [ingredients]);

  useEffect(() => {
    if (!isOpen) {
      setRows([]);
      return;
    }
    if (recipe?.ingredients?.length) {
      const initialRows = recipe.ingredients.map((item) => convertRecipeItemToRow(item, ingredients));
      setRows(initialRows);
    } else {
      setRows([]);
    }
  }, [isOpen, recipe, ingredients]);

  const usedIngredientIds = useMemo(() => rows.map((row) => row.ingredientId).filter(Boolean), [rows]);

  const handleAddRow = () => {
    const nextIngredient = ingredientList.find((ing) => !usedIngredientIds.includes(ing.id));
    const newRow = defaultRow(nextIngredient?.id || '', nextIngredient);
    setRows((prev) => [...prev, newRow]);
  };

  const handleRowUpdate = (rowId, patch) => {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  const handleIngredientChange = (rowId, ingredientId) => {
    const ingredient = ingredients[ingredientId];
    const trackingType = ingredient?.trackingType || 'weight';
    handleRowUpdate(rowId, {
      ingredientId,
      ingredientName: ingredient?.name || '',
      trackingType,
      lbs: trackingType === 'weight' ? 0 : 0,
      oz: trackingType === 'weight' ? 0 : 0,
      count: trackingType === 'count' ? 0 : 0,
      amount: 0,
    });
  };

  const handleWeightChange = (row, field, value) => {
    const safeValue = Math.max(0, parseInt(value || '0', 10) || 0);
    let lbs = row.lbs;
    let oz = row.oz;
    if (field === 'lbs') {
      lbs = safeValue;
    } else {
      oz = Math.min(15, safeValue);
    }
    const decimal = lbs + oz / 16;
    handleRowUpdate(row.id, { lbs, oz, amount: decimal });
  };

  const handleCountChange = (rowId, value) => {
    const safe = Math.max(0, parseInt(value || '0', 10) || 0);
    handleRowUpdate(rowId, { count: safe, amount: safe });
  };

  const handleRemoveRow = (rowId) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const handleSave = async () => {
    const validRows = rows.filter((row) => row.ingredientId);
    const payload = {
      productName: product?.flavor || product?.displayName || product?.name || '',
      ingredients: validRows.map((row) => ({
        ingredientId: row.ingredientId,
        ingredientName: row.ingredientName,
        trackingType: row.trackingType,
        requiredAmount: row.amount || 0,
        requiredLbs: row.trackingType === 'weight' ? row.lbs : undefined,
        requiredOz: row.trackingType === 'weight' ? row.oz : undefined,
        requiredCount: row.trackingType === 'count' ? row.count : undefined,
      })),
    };
    setIsSaving(true);
    try {
      await onSave?.(payload);
      onClose?.();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const allIngredientsUsed = ingredientList.length > 0 && usedIngredientIds.length >= ingredientList.length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content recipe-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Recipe for {product?.flavor || product?.displayName || product?.name || 'Product'}</h2>
          <button className="close-button" onClick={onClose} aria-label="Close recipe modal">&times;</button>
        </div>
        <div className="modal-body">
          <p className="recipe-description">Define the standard ingredients and quantities required for a single batch. Amounts remain editable during production runs.</p>
          {rows.length === 0 && (
            <div className="empty-state">No ingredients have been added yet.</div>
          )}
          <div className="recipe-table">
            {rows.map((row) => {
              const ingredient = ingredients[row.ingredientId];
              const currentTracking = row.trackingType || ingredient?.trackingType || 'weight';
              const rowOptions = ingredientList.filter((ing) => ing.id === row.ingredientId || !usedIngredientIds.includes(ing.id));
              return (
                <div key={row.id} className="recipe-row">
                  <div className="recipe-cell ingredient-selector">
                    <label>Ingredient</label>
                    <select
                      value={row.ingredientId}
                      onChange={(e) => handleIngredientChange(row.id, e.target.value)}
                    >
                      <option value="">-- Select ingredient --</option>
                      {rowOptions.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} {ing.category ? `(${ing.category})` : '(Uncategorized)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="recipe-cell quantity">
                    <label>Amount {currentTracking === 'weight' ? '(lbs & oz)' : '(count)'}</label>
                    {currentTracking === 'weight' ? (
                      <div className="weight-inputs">
                        <input
                          type="number"
                          min="0"
                          value={row.lbs}
                          onChange={(e) => handleWeightChange(row, 'lbs', e.target.value)}
                        />
                        <span>lbs</span>
                        <input
                          type="number"
                          min="0"
                          max="15"
                          value={row.oz}
                          onChange={(e) => handleWeightChange(row, 'oz', e.target.value)}
                        />
                        <span>oz</span>
                      </div>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={row.count}
                        onChange={(e) => handleCountChange(row.id, e.target.value)}
                      />
                    )}
                  </div>
                  <div className="recipe-cell actions">
                    <button type="button" className="btn-text" onClick={() => handleRemoveRow(row.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="recipe-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAddRow}
              disabled={ingredientList.length === 0 || allIngredientsUsed}
            >
              + Add Ingredient
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button className="btn-submit" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeModal;
