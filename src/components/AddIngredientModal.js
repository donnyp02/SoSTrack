import React, { useEffect, useMemo, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import './AddIngredientModal.css';

const DEFAULT_UNITS = {
  weight: 'lbs',
  count: 'each',
  volume: 'gal'
};

const trackingOptions = [
  { value: 'weight', label: 'Tracked by weight' },
  { value: 'count', label: 'Tracked by count' },
  { value: 'volume', label: 'Tracked by volume' }
];

const AddIngredientModal = ({
  isOpen,
  onClose,
  onSubmit,
  categories = {},
  initialCategory = '',
  mode = 'create',
  ingredient = null
}) => {
  const isEditMode = mode === 'edit';
  const [name, setName] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [trackingType, setTrackingType] = useState('weight');
  const [defaultUnit, setDefaultUnit] = useState(DEFAULT_UNITS.weight);
  const [notes, setNotes] = useState('');
  const [startIntakeAfterSave, setStartIntakeAfterSave] = useState(false);
  const [unitTouched, setUnitTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const categoryOptions = useMemo(() => {
    const names = Object.values(categories || {})
      .map((cat) => cat?.name)
      .filter(Boolean);
    const unique = Array.from(new Set(names));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [categories]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (isEditMode && ingredient) {
      const tracking = ingredient.trackingType || 'weight';
      setName(ingredient.name || '');
      setCategory(ingredient.category || '');
      setTrackingType(tracking);
      setDefaultUnit(ingredient.defaultUnit || DEFAULT_UNITS[tracking] || 'units');
      setNotes(ingredient.notes || '');
      setStartIntakeAfterSave(false);
      setUnitTouched(true);
    } else {
      setName('');
      setCategory(initialCategory || '');
      setTrackingType('weight');
      setDefaultUnit(DEFAULT_UNITS.weight);
      setNotes('');
      setStartIntakeAfterSave(false);
      setUnitTouched(false);
    }

    setSubmitting(false);
    setError('');
  }, [isOpen, initialCategory, ingredient, isEditMode]);

  useEffect(() => {
    if (!unitTouched) {
      setDefaultUnit(DEFAULT_UNITS[trackingType] || 'units');
    }
  }, [trackingType, unitTouched]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !submitting) {
      onClose();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedUnit = defaultUnit.trim();

    if (!trimmedName) {
      setError('Ingredient name is required.');
      return;
    }

    if (!trimmedUnit) {
      setError('Default unit is required.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await onSubmit({
        id: ingredient?.id,
        name: trimmedName,
        category: category.trim(),
        trackingType,
        defaultUnit: trimmedUnit,
        notes: notes.trim(),
        startIntakeAfterSave
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to add ingredient.');
    } finally {
      setSubmitting(false);
    }
  };

  const dialogTitle = isEditMode ? 'Edit Ingredient' : 'Add Ingredient';
  const submitLabel = isEditMode ? 'Save Changes' : 'Save Ingredient';

  return (
    <div className="add-ingredient-modal-backdrop" onClick={handleBackdropClick}>
      <div className="add-ingredient-modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <h2>{dialogTitle}</h2>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close"
            disabled={submitting}
          >
            <FaTimes aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </header>
        <form className="add-ingredient-form" onSubmit={handleSubmit}>
          <div className="modal-body">
            <label>
              <span>Ingredient name</span>
              <small className="field-hint">Shown anywhere this ingredient appears (dashboards, lot cards, recipes). Use the exact phrasing your team recognizes.</small>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Freeze-Dried Strawberries"
                autoFocus
                disabled={submitting}
              />
            </label>

            <label>
              <span>Category</span>
              <small className="field-hint">Optional tag that groups ingredients on the inventory dashboard. This is separate from product container categories.</small>
              <input
                type="text"
                list="ingredient-category-options"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Fruit"
                disabled={submitting}
              />
              <datalist id="ingredient-category-options">
                {categoryOptions.map((option) => (
                  <option value={option} key={option} />
                ))}
              </datalist>
            </label>

            <fieldset className="tracking-type-fieldset">
              <legend>Tracking type</legend>
              <div className="tracking-type-options">
                {trackingOptions.map((option) => (
                  <label key={option.value} className={trackingType === option.value ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="trackingType"
                      value={option.value}
                      checked={trackingType === option.value}
                      onChange={(e) => {
                        setTrackingType(e.target.value);
                        setUnitTouched(false);
                      }}
                      disabled={submitting}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label>
              <span>Default unit</span>
              <input
                type="text"
                value={defaultUnit}
                onChange={(e) => {
                  setDefaultUnit(e.target.value);
                  setUnitTouched(true);
                }}
                placeholder={DEFAULT_UNITS[trackingType] || 'units'}
                disabled={submitting}
              />
            </label>

            <label>
              <span>Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any quick reference details or sourcing info"
                rows={3}
                disabled={submitting}
              />
            </label>

            {!isEditMode && (
              <label className="inline-toggle">
                <input
                  type="checkbox"
                  checked={startIntakeAfterSave}
                  onChange={(e) => setStartIntakeAfterSave(e.target.checked)}
                  disabled={submitting}
                />
                <span>Open intake workflow after saving</span>
              </label>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}
          </div>
          <footer className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !name.trim()}
            >
              {submitting ? 'Saving...' : submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default AddIngredientModal;
