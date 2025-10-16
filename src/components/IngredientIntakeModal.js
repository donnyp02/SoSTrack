import { useEffect, useMemo, useState } from 'react';
import './IngredientIntakeModal.css';

const STEP_FLOW = [
  { id: 'ingredient', label: 'Ingredient' },
  { id: 'supplier', label: 'Supplier & Paperwork' },
  { id: 'quantity', label: 'Quantity & Dating' },
  { id: 'storage', label: 'Storage & QA' },
  { id: 'review', label: 'Review' }
];

const generateLotCode = () => {
  const now = new Date();
  const iso = now.toISOString().split('T')[0].replace(/-/g, '');
  const suffix = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
  return `ING-${iso}-${suffix}`;
};

const defaultFormState = (ingredientId = '', defaultUnit = 'units') => ({
  ingredientId,
  creatingIngredient: ingredientId ? false : true,
  ingredientDraft: {
    name: '',
    category: 'Candy',
    defaultUnit: defaultUnit
  },
  supplier: {
    name: '',
    contact: '',
    orderRef: ''
  },
  supplierLotNumber: '',
  internalLotNumber: generateLotCode(),
  quantity: {
    amount: '',
    unit: defaultUnit,
    originalAmount: ''
  },
  cost: {
    total: '',
    perUnit: ''
  },
  intakeDate: new Date().toISOString().split('T')[0],
  expirationDate: '',
  status: 'Pending QA',
  storageLocation: {
    area: '',
    bin: ''
  },
  qaChecks: {
    tempOk: false,
    packagingIntact: false,
    coaReceived: false
  },
  notes: ''
});

const IngredientIntakeModal = ({
  isOpen,
  onClose,
  onSubmit,
  ingredients = {},
  defaultIngredientId = null
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [formState, setFormState] = useState(() =>
    defaultFormState(defaultIngredientId || '', '')
  );

  useEffect(() => {
    if (defaultIngredientId) {
      const target = ingredients[defaultIngredientId];
      setFormState((prev) =>
        defaultFormState(defaultIngredientId, target?.defaultUnit || prev.quantity.unit || 'units')
      );
      setActiveStep(0);
    }
  }, [defaultIngredientId, ingredients]);

  useEffect(() => {
    if (!isOpen) {
      setActiveStep(0);
      setSearchTerm('');
      setFormState(defaultFormState(defaultIngredientId || '', 'units'));
    }
  }, [isOpen, defaultIngredientId]);

  const ingredientList = useMemo(() => {
    return Object.values(ingredients).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
  }, [ingredients]);

  const filteredIngredients = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return ingredientList;
    return ingredientList.filter((ingredient) => {
      const hay = `${ingredient.name || ''} ${ingredient.category || ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [ingredientList, searchTerm]);

  const selectedIngredient = useMemo(() => {
    if (!formState.ingredientId) return null;
    return ingredients[formState.ingredientId] || null;
  }, [formState.ingredientId, ingredients]);

  const handleSelectIngredient = (id) => {
    const ingredient = ingredients[id];
    setFormState((prev) => ({
      ...prev,
      ingredientId: id,
      creatingIngredient: false,
      ingredientDraft: {
        name: '',
        category: ingredient?.category || 'Candy',
        defaultUnit: ingredient?.defaultUnit || 'units'
      },
      quantity: {
        ...prev.quantity,
        unit: ingredient?.defaultUnit || prev.quantity.unit || 'units'
      }
    }));
  };

  const handleDraftChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      ingredientDraft: {
        ...prev.ingredientDraft,
        [field]: value
      }
    }));
  };

  const handleSupplierChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      supplier: {
        ...prev.supplier,
        [field]: value
      }
    }));
  };

  const handleQuantityChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      quantity: {
        ...prev.quantity,
        [field]: value
      }
    }));
  };

  const handleCostChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      cost: {
        ...prev.cost,
        [field]: value
      }
    }));
  };

  const handleLocationChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      storageLocation: {
        ...prev.storageLocation,
        [field]: value
      }
    }));
  };

  const toggleQaCheck = (field) => {
    setFormState((prev) => ({
      ...prev,
      qaChecks: {
        ...prev.qaChecks,
        [field]: !prev.qaChecks[field]
      }
    }));
  };

  const handleFieldChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const goNext = () => {
    setActiveStep((step) => Math.min(step + 1, STEP_FLOW.length - 1));
  };

  const goBack = () => {
    setActiveStep((step) => Math.max(step - 1, 0));
  };

  const handleSubmit = () => {
    const payload = {
      ...formState,
      intakeDate: formState.intakeDate ? new Date(formState.intakeDate) : null,
      expirationDate: formState.expirationDate ? new Date(formState.expirationDate) : null,
      ingredient: selectedIngredient
    };
    onSubmit?.(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop ingredient-intake" onClick={onClose}>
      <div className="modal-content intake-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <h2>Log Ingredient Intake</h2>
            <p>Capture a new raw material lot, supplier paperwork, and quality checks.</p>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close intake modal">
            &times;
          </button>
        </div>

        <div className="intake-steps">
          {STEP_FLOW.map((step, index) => (
            <button
              key={step.id}
              className={`intake-step ${index === activeStep ? 'active' : ''} ${index < activeStep ? 'complete' : ''}`}
              onClick={() => setActiveStep(index)}
              type="button"
            >
              <span className="step-index">{index + 1}</span>
              <span>{step.label}</span>
            </button>
          ))}
        </div>

        <div className="modal-body intake-body">
          {STEP_FLOW[activeStep].id === 'ingredient' && (
            <div className="step-grid">
              <section>
                <h3>Select ingredient</h3>
                <div className="search-field">
                  <input
                    type="text"
                    placeholder="Search ingredients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="ingredient-list">
                  {filteredIngredients.length === 0 ? (
                    <div className="empty-state">
                      <p>No ingredients match that search.</p>
                    </div>
                  ) : (
                    filteredIngredients.map((ingredient) => {
                      const active = formState.ingredientId === ingredient.id;
                      return (
                        <button
                          key={ingredient.id}
                          className={`ingredient-option ${active ? 'active' : ''}`}
                          onClick={() => handleSelectIngredient(ingredient.id)}
                        >
                          <div>
                            <strong>{ingredient.name}</strong>
                            <small>{ingredient.category || 'Uncategorized'}</small>
                          </div>
                          <span>{ingredient.defaultUnit || 'units'}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <section>
                <div className="section-header">
                  <h3>{formState.creatingIngredient ? 'New ingredient' : 'Defaults'}</h3>
                  <button
                    className="btn-text"
                    type="button"
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,
                        creatingIngredient: !prev.creatingIngredient,
                        ingredientId: prev.creatingIngredient ? prev.ingredientId : ''
                      }))
                    }
                  >
                    {formState.creatingIngredient ? 'Select existing' : 'Create new'}
                  </button>
                </div>

                {formState.creatingIngredient ? (
                  <div className="form-fields">
                    <label>
                      Ingredient name
                      <input
                        type="text"
                        value={formState.ingredientDraft.name}
                        onChange={(e) => handleDraftChange('name', e.target.value)}
                        placeholder="e.g. Sour Skittles"
                      />
                    </label>
                    <label>
                      Category
                      <select
                        value={formState.ingredientDraft.category}
                        onChange={(e) => handleDraftChange('category', e.target.value)}
                      >
                        <option value="Candy">Candy</option>
                        <option value="Flavoring">Flavoring</option>
                        <option value="Chocolate">Chocolate</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    <label>
                      Default unit
                      <input
                        type="text"
                        value={formState.ingredientDraft.defaultUnit}
                        onChange={(e) => handleDraftChange('defaultUnit', e.target.value)}
                        placeholder="lbs, kg, cases..."
                      />
                    </label>
                  </div>
                ) : (
                  <div className="form-fields">
                    <label>
                      Default unit
                      <input
                        type="text"
                        value={selectedIngredient?.defaultUnit || formState.quantity.unit || ''}
                        onChange={(e) => handleQuantityChange('unit', e.target.value)}
                      />
                    </label>
                    <label>
                      Storage guidance
                      <textarea
                        placeholder="Describe how this ingredient should be stored..."
                        value={selectedIngredient?.storageGuidelines || ''}
                        readOnly
                      />
                    </label>
                  </div>
                )}
              </section>
            </div>
          )}

          {STEP_FLOW[activeStep].id === 'supplier' && (
            <div className="two-column">
              <section>
                <h3>Supplier details</h3>
                <div className="form-fields">
                  <label>
                    Supplier name
                    <input
                      type="text"
                      value={formState.supplier.name}
                      onChange={(e) => handleSupplierChange('name', e.target.value)}
                      placeholder="e.g. Candy Co-Op"
                    />
                  </label>
                  <label>
                    Contact / email
                    <input
                      type="text"
                      value={formState.supplier.contact}
                      onChange={(e) => handleSupplierChange('contact', e.target.value)}
                      placeholder="buyer@vendor.com"
                    />
                  </label>
                  <label>
                    PO / invoice
                    <input
                      type="text"
                      value={formState.supplier.orderRef}
                      onChange={(e) => handleSupplierChange('orderRef', e.target.value)}
                      placeholder="PO-12345"
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3>Lot numbers</h3>
                <div className="form-fields">
                  <label>
                    Supplier lot #
                    <input
                      type="text"
                      value={formState.supplierLotNumber}
                      onChange={(e) => handleFieldChange('supplierLotNumber', e.target.value)}
                      placeholder="Provided by supplier"
                    />
                  </label>
                  <label>
                    Internal lot #
                    <input
                      type="text"
                      value={formState.internalLotNumber}
                      onChange={(e) => handleFieldChange('internalLotNumber', e.target.value)}
                    />
                  </label>
                  <label>
                    Certificate of analysis URL
                    <input
                      type="text"
                      value={formState.coaUrl || ''}
                      onChange={(e) => handleFieldChange('coaUrl', e.target.value)}
                      placeholder="https://..."
                    />
                  </label>
                </div>
              </section>
            </div>
          )}

          {STEP_FLOW[activeStep].id === 'quantity' && (
            <div className="two-column">
              <section>
                <h3>Quantity received</h3>
                <div className="form-fields">
                  <label>
                    Amount received
                    <div className="inline-inputs">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formState.quantity.amount}
                        onChange={(e) => handleQuantityChange('amount', e.target.value)}
                      />
                      <input
                        type="text"
                        value={formState.quantity.unit}
                        onChange={(e) => handleQuantityChange('unit', e.target.value)}
                        placeholder="lbs"
                      />
                    </div>
                  </label>
                  <label>
                    Original amount (optional)
                    <input
                      type="text"
                      value={formState.quantity.originalAmount}
                      onChange={(e) => handleQuantityChange('originalAmount', e.target.value)}
                      placeholder="e.g. 5 cases of 10 lbs"
                    />
                  </label>
                  <label>
                    Intake date
                    <input
                      type="date"
                      value={formState.intakeDate}
                      onChange={(e) => handleFieldChange('intakeDate', e.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3>Shelf life & cost</h3>
                <div className="form-fields">
                  <label>
                    Expiration / best-by
                    <input
                      type="date"
                      value={formState.expirationDate}
                      onChange={(e) => handleFieldChange('expirationDate', e.target.value)}
                    />
                  </label>
                  <label>
                    Total cost (optional)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formState.cost.total}
                      onChange={(e) => handleCostChange('total', e.target.value)}
                    />
                  </label>
                  <label>
                    Cost per unit (auto or manual)
                    <input
                      type="text"
                      value={formState.cost.perUnit}
                      onChange={(e) => handleCostChange('perUnit', e.target.value)}
                      placeholder="$ / lb"
                    />
                  </label>
                </div>
              </section>
            </div>
          )}

          {STEP_FLOW[activeStep].id === 'storage' && (
            <div className="two-column">
              <section>
                <h3>Storage</h3>
                <div className="form-fields">
                  <label>
                    Storage area
                    <input
                      type="text"
                      value={formState.storageLocation.area}
                      onChange={(e) => handleLocationChange('area', e.target.value)}
                      placeholder="Dry room, cold vault..."
                    />
                  </label>
                  <label>
                    Bin / shelf
                    <input
                      type="text"
                      value={formState.storageLocation.bin}
                      onChange={(e) => handleLocationChange('bin', e.target.value)}
                      placeholder="Shelf A3"
                    />
                  </label>
                  <label>
                    Intake notes
                    <textarea
                      value={formState.notes}
                      onChange={(e) => handleFieldChange('notes', e.target.value)}
                      placeholder="Condition on arrival, special handling, etc."
                      rows={4}
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3>Quality checks</h3>
                <div className="form-fields checkbox-grid">
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={formState.qaChecks.tempOk}
                      onChange={() => toggleQaCheck('tempOk')}
                    />
                    Temperature meets spec
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={formState.qaChecks.packagingIntact}
                      onChange={() => toggleQaCheck('packagingIntact')}
                    />
                    Packaging intact
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={formState.qaChecks.coaReceived}
                      onChange={() => toggleQaCheck('coaReceived')}
                    />
                    COA received
                  </label>
                </div>
                <label>
                  Intake status
                  <select
                    value={formState.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                  >
                    <option value="Pending QA">Pending QA</option>
                    <option value="Released">Released</option>
                    <option value="Quarantined">Quarantined</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </label>
              </section>
            </div>
          )}

          {STEP_FLOW[activeStep].id === 'review' && (
            <div className="review-panel">
              <section>
                <h3>Summary</h3>
                <dl>
                  <div>
                    <dt>Ingredient</dt>
                    <dd>
                      {formState.creatingIngredient
                        ? `${formState.ingredientDraft.name || 'New ingredient'} (new)`
                        : selectedIngredient?.name || 'Not selected'}
                    </dd>
                  </div>
                  <div>
                    <dt>Supplier</dt>
                    <dd>{formState.supplier.name || '—'}</dd>
                  </div>
                  <div>
                    <dt>Internal lot #</dt>
                    <dd>{formState.internalLotNumber}</dd>
                  </div>
                  <div>
                    <dt>Supplier lot #</dt>
                    <dd>{formState.supplierLotNumber || '—'}</dd>
                  </div>
                  <div>
                    <dt>Quantity</dt>
                    <dd>
                      {formState.quantity.amount
                        ? `${formState.quantity.amount} ${formState.quantity.unit || ''}`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Intake date</dt>
                    <dd>{formState.intakeDate || '—'}</dd>
                  </div>
                  <div>
                    <dt>Best by</dt>
                    <dd>{formState.expirationDate || '—'}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{formState.status}</dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3>Quality checks</h3>
                <ul>
                  <li className={formState.qaChecks.tempOk ? 'complete' : ''}>
                    Temperature meets spec
                  </li>
                  <li className={formState.qaChecks.packagingIntact ? 'complete' : ''}>
                    Packaging intact
                  </li>
                  <li className={formState.qaChecks.coaReceived ? 'complete' : ''}>
                    COA received
                  </li>
                </ul>
                <h4>Notes</h4>
                <p>{formState.notes || 'No notes provided.'}</p>
              </section>
            </div>
          )}
        </div>

        <div className="modal-footer intake-footer">
          <div className="footer-left">
            <span>Step {activeStep + 1} of {STEP_FLOW.length}</span>
          </div>
          <div className="footer-right">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            {activeStep > 0 && (
              <button className="btn-secondary" onClick={goBack}>
                Back
              </button>
            )}
            {activeStep < STEP_FLOW.length - 1 && (
              <button className="btn-primary" onClick={goNext}>
                Continue
              </button>
            )}
            {activeStep === STEP_FLOW.length - 1 && (
              <button className="btn-primary" onClick={handleSubmit}>
                Save intake
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IngredientIntakeModal;
