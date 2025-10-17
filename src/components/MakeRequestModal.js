import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FaTimes } from 'react-icons/fa';
import './MakeRequestModal.css';

// Generate production lot number
const generateProductionLotNumber = () => {
  const now = new Date();
  const date = now.toISOString().split('T')[0].replace(/-/g, '');
  const time = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `PROD-${date}-${time}${random}`;
};

// It now correctly expects the 'product' and 'equipment' props
// showIngredientLots prop controls whether to show ingredient lot selection
// requestedBatch prop contains the request data if starting from a requested batch
const MakeRequestModal = ({ product, equipment = {}, ingredients = {}, ingredientLots = {}, recipe = null, onSubmit, onClose, showIngredientLots = false, requestedBatch = null }) => {
  const [quantities, setQuantities] = useState({});
  const [productionLotNumber] = useState(generateProductionLotNumber());
  const [weightLbs, setWeightLbs] = useState('');
  const [weightOz, setWeightOz] = useState('');

  // For Start mode: Support multiple machines
  const [machines, setMachines] = useState([
    {
      id: Date.now(),
      equipmentId: '', // Firestore document ID
      machineId: '', // Machine ID like "FD-01"
      machineName: '',
      ingredientLots: {}, // { ingredientId: { lotId, amount } }
      selectedIngredients: {} // { ingredientId: true } - tracks which ingredients are being assigned
    }
  ]);
  const [recipeApplied, setRecipeApplied] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClose]);

  const productName = useMemo(() => {
    if (!product) return '';
    const candidates = [
      product.displayName,
      product.name,
      product.flavor,
      product.label,
      product.title
    ].filter(Boolean);
    if (candidates.length > 0) return candidates[0];
    const categoryPieces = [product.categoryLabel, product.categoryName]
      .filter(Boolean)
      .join(' ');
    return categoryPieces || 'Selected product';
  }, [product]);

  const productKey = useMemo(() => {
    if (!product) return '';
    return (
      product.id ||
      product.productId ||
      product.sku ||
      product.name ||
      product.displayName ||
      ''
    );
  }, [product]);

  // Convert decimal pounds to lbs + oz display
  const formatWeightDisplay = (totalLbs) => {
    const lbs = Math.floor(parseFloat(totalLbs));
    const oz = Math.round((parseFloat(totalLbs) - lbs) * 16);
    if (lbs === 0 && oz === 0) return '0 lbs';
    if (lbs === 0) return `${oz} oz`;
    if (oz === 0) return `${lbs} lbs`;
    return `${lbs} lbs ${oz} oz`;
  };

  const toDecimalLbs = (lbsValue, ozValue) => {
    const safeLbs = Math.max(0, parseInt(lbsValue, 10) || 0);
    const safeOz = Math.max(0, Math.min(15, parseInt(ozValue, 10) || 0));
    return parseFloat((safeLbs + safeOz / 16).toFixed(4));
  };

  const splitWeight = (decimalLbs) => {
    const safe = Math.max(0, parseFloat(decimalLbs) || 0);
    const lbs = Math.floor(safe);
    let oz = Math.round((safe - lbs) * 16);
    if (oz >= 16) {
      return { lbs: lbs + 1, oz: 0 };
    }
    return { lbs, oz };
  };

  // Validation helpers
  const hasMachinesConfigured = useMemo(() => {
    if (!showIngredientLots) return true;
    return machines.length > 0 && machines.every(m => m.equipmentId);
  }, [machines, showIngredientLots]);

  const allRequiredLotsAssigned = useMemo(() => {
    if (!showIngredientLots) return true;
    
    // For new workflow: Just check that at least one ingredient lot is assigned per machine
    return machines.every(machine => {
      return Object.keys(machine.ingredientLots).length > 0 &&
             Object.values(machine.ingredientLots).every(lot => lot.lotId && lot.amount > 0);
    });
  }, [machines, showIngredientLots]);

  const canSubmit = useMemo(() => {
    if (showIngredientLots) {
      return machines.length > 0 && hasMachinesConfigured && allRequiredLotsAssigned;
    }
    return true;
  }, [showIngredientLots, machines, hasMachinesConfigured, allRequiredLotsAssigned]);
  const activeFreezeDryers = useMemo(() => {
    return Object.values(equipment || {})
      .filter(eq => eq.type === 'freezeDryer' && eq.status === 'active')
      .sort((a, b) => (a.machineId || '').localeCompare(b.machineId || ''));
  }, [equipment]);

  const handleQuantityChange = (packageId, value) => {
    const newQuantities = { ...quantities };
    newQuantities[packageId] = parseInt(value, 10) || 0;
    setQuantities(newQuantities);
  };
  
  const packageOptions = product?.packageOptions || [];

  const recipeRequirements = useMemo(() => {
    if (!recipe?.ingredients || recipe.ingredients.length === 0) return {};
    return recipe.ingredients.reduce((acc, item) => {
      if (!item.ingredientId) return acc;
      const ingredientRef = ingredients[item.ingredientId];
      const trackingType = item.trackingType || ingredientRef?.trackingType || 'weight';
      const requiredAmount = parseFloat(item.requiredAmount || 0) || 0;
      const { lbs, oz } = splitWeight(requiredAmount);
      const requiredCount = trackingType === 'count' ? Math.round(item.requiredCount || requiredAmount || 0) : null;
      acc[item.ingredientId] = {
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName || ingredientRef?.name || '',
        trackingType,
        requiredAmount,
        lbs,
        oz,
        count: requiredCount
      };
      return acc;
    }, {});
  }, [recipe, ingredients]);

  const recipeSignature = useMemo(() => {
    if (!recipe?.ingredients || recipe.ingredients.length === 0) return 'none';
    return recipe.ingredients
      .map(item => `${item.ingredientId || 'unknown'}:${item.requiredAmount || 0}:${item.requiredCount || 0}:${item.trackingType || ''}`)
      .sort()
      .join('|');
  }, [recipe]);

  const getIngredientTrackingType = useCallback((ingredientId) => {
    if (recipeRequirements[ingredientId]?.trackingType) {
      return recipeRequirements[ingredientId].trackingType;
    }
    return ingredients[ingredientId]?.trackingType || 'weight';
  }, [recipeRequirements, ingredients]);

  const createIngredientEntry = useCallback((ingredientId) => {
    const trackingType = getIngredientTrackingType(ingredientId);
    const recipeDefault = recipeRequirements[ingredientId];

    if (trackingType === 'count') {
      const defaultCount = recipeDefault?.count || 0;
      return {
        lotId: '',
        trackingType,
        count: defaultCount,
        amount: defaultCount
      };
    }

    const defaultLbs = recipeDefault?.lbs || 0;
    const defaultOz = recipeDefault?.oz || 0;
    const defaultAmount = parseFloat(recipeDefault?.requiredAmount || toDecimalLbs(defaultLbs, defaultOz) || 0);
    return {
      lotId: '',
      trackingType,
      lbs: defaultLbs,
      oz: defaultOz,
      amount: isNaN(defaultAmount) ? 0 : defaultAmount
    };
  }, [getIngredientTrackingType, recipeRequirements]);

  useEffect(() => {
    setRecipeApplied(false);
  }, [product?.id, recipeRequirements, showIngredientLots]);

  // Auto-fill weight from request batch if available
  const requestedWeight = useMemo(() => {
    // Try multiple paths for the weight
    const weight = 
      requestedBatch?.request?.calculatedWeightLbs ||
      requestedBatch?.calculatedWeightLbs ||
      requestedBatch?.weight ||
      requestedBatch?.request?.weight;
    
    if (weight) {
      return parseFloat(weight).toFixed(2);
    }
    return '0.00';
  }, [requestedBatch]);

  useEffect(() => {
    if (!showIngredientLots) {
      setRecipeApplied(false);
      return;
    }

    if (recipeApplied) return;

    const ingredientIds = Object.keys(recipeRequirements);
    if (ingredientIds.length === 0) return;

    const initialSelected = {};
    const initialLots = {};

    ingredientIds.forEach((ingredientId) => {
      initialSelected[ingredientId] = true;
      initialLots[ingredientId] = createIngredientEntry(ingredientId);
    });

    setMachines([
      {
        id: Date.now(),
        equipmentId: '',
        machineId: '',
        machineName: '',
        ingredientLots: initialLots,
        selectedIngredients: initialSelected
      }
    ]);
    setRecipeApplied(true);
  }, [showIngredientLots, recipeApplied, recipeRequirements, createIngredientEntry, productKey]);

  useEffect(() => {
    if (!showIngredientLots) {
      setRecipeApplied(false);
      return;
    }
    setRecipeApplied((prev) => (prev ? false : prev));
  }, [showIngredientLots, recipeSignature, productKey]);

  const totalWeightLbs = useMemo(() => {
    // For Start mode (showIngredientLots=true), use requested weight or _weight
    if (showIngredientLots) {
      if (quantities._weight) {
        return parseFloat(quantities._weight).toFixed(2);
      }
      return requestedWeight;
    }

    // For Request mode: Use weight request if provided, otherwise calculate from packages
    if (weightLbs || weightOz) {
      const lbs = parseFloat(weightLbs) || 0;
      const oz = parseFloat(weightOz) || 0;
      const totalLbs = lbs + (oz / 16);
      return totalLbs.toFixed(2);
    }

    // Calculate from package quantities
    let totalOunces = 0;
    for (const packageId in quantities) {
      if (packageId.startsWith('_')) continue;
      const pkg = packageOptions.find(p => p.id === packageId);
      if (pkg && quantities[packageId] > 0) {
        totalOunces += pkg.weightOz * quantities[packageId];
      }
    }
    return (totalOunces / 16).toFixed(2);
  }, [quantities, packageOptions, showIngredientLots, requestedWeight, weightLbs, weightOz]);

  // Machine management functions
  const addMachine = () => {
    const recipeIngredientIds = Object.keys(recipeRequirements || {});
    const defaultLots = {};
    const defaultSelected = {};

    if (recipeIngredientIds.length > 0) {
      recipeIngredientIds.forEach((ingredientId) => {
        defaultLots[ingredientId] = createIngredientEntry(ingredientId);
        defaultSelected[ingredientId] = true;
      });
    }

    setMachines(prev => [
      ...prev,
      {
        id: Date.now(),
        equipmentId: '',
        machineId: '',
        machineName: '',
        ingredientLots: defaultLots,
        selectedIngredients: defaultSelected
      }
    ]);
  };

  const removeMachine = (machineId) => {
    setMachines(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(m => m.id !== machineId);
    });
  };

  const updateMachineIngredientLot = (machineId, ingredientId, updates) => {
    setMachines(prev => prev.map(m => {
      if (m.id === machineId) {
        const current = m.ingredientLots[ingredientId] || {};
        const trackingType = updates.trackingType || current.trackingType || getIngredientTrackingType(ingredientId);
        return {
          ...m,
          ingredientLots: {
            ...m.ingredientLots,
            [ingredientId]: {
              ...current,
              ...updates,
              trackingType
            }
          }
        };
      }
      return m;
    }));
  };

  const setIngredientWeight = (machineId, ingredientId, lbsValue, ozValue) => {
    const safeLbs = Math.max(0, parseInt(lbsValue, 10) || 0);
    let safeOz = Math.max(0, parseInt(ozValue, 10) || 0);
    const extraLbs = Math.floor(safeOz / 16);
    const normalizedLbs = safeLbs + extraLbs;
    const normalizedOz = safeOz % 16;
    const amount = toDecimalLbs(normalizedLbs, normalizedOz);

    updateMachineIngredientLot(machineId, ingredientId, {
      trackingType: 'weight',
      lbs: normalizedLbs,
      oz: normalizedOz,
      amount
    });
  };

  const setIngredientCount = (machineId, ingredientId, countValue) => {
    const safeCount = Math.max(0, parseInt(countValue, 10) || 0);
    updateMachineIngredientLot(machineId, ingredientId, {
      trackingType: 'count',
      count: safeCount,
      amount: safeCount
    });
  };

  const handleSubmit = () => {
    // Different validation for Request vs Start modes
    if (showIngredientLots) {
      // Start mode: Must have at least one machine selected and validate ingredient amounts
      const hasValidMachine = machines.some(m => m.equipmentId);
      if (!hasValidMachine) {
        alert("Please select at least one freeze dryer machine.");
        return;
      }

      // Validate ingredient lot amounts don't exceed available quantities
      for (const machine of machines) {
        if (!machine.ingredientLots) continue;
        
        for (const ingredientId in machine.ingredientLots) {
          const selection = machine.ingredientLots[ingredientId];
          if (!selection.lotId) continue;

          const lot = ingredientLots[selection.lotId];
          if (!lot) {
            alert(`Ingredient lot not found. Please refresh and try again.`);
            return;
          }

          const amountRequested = parseFloat(selection.amount) || 0;
          const remainingAmount = lot.remainingAmount !== undefined ? lot.remainingAmount : (lot.quantity?.amount || 0) - (lot.consumedAmount || 0);

          if (amountRequested > remainingAmount) {
            const ingredientName = Object.values(ingredients).find(ing => ing.id === ingredientId)?.name || 'Unknown ingredient';
            alert(`Cannot use ${amountRequested} ${lot.quantity?.unit} of ${ingredientName} - only ${remainingAmount} ${lot.quantity?.unit} available (${lot.internalLotNumber}).`);
            return;
          }

          if (amountRequested <= 0) {
            alert("Please enter a valid amount for each selected ingredient lot.");
            return;
          }
        }
      }
    } else {
      // Request mode: Must have at least one package quantity
      const requestedPackages = packageOptions
        .filter(pkg => quantities[pkg.id] > 0)
        .map(pkg => ({
          packageId: pkg.id,
          quantity: quantities[pkg.id],
        }));

      if (requestedPackages.length === 0) {
        alert("Please enter a quantity for at least one package type.");
        return;
      }
    }

    // Build request data
    const requestData = {
      // For Request mode: include requestedPackages
      ...(showIngredientLots ? {} : {
        requestedPackages: packageOptions
          .filter(pkg => quantities[pkg.id] > 0)
          .map(pkg => ({
            packageId: pkg.id,
            quantity: quantities[pkg.id],
          }))
      }),
      // Include optional weight request
      ...((!showIngredientLots && (weightLbs || weightOz)) ? {
        weightByRequest: {
          lbs: parseFloat(weightLbs) || 0,
          oz: parseFloat(weightOz) || 0
        }
      } : {}),
      calculatedWeightLbs: parseFloat(totalWeightLbs),
      // Add production lot number
      productionLotNumber,
      // For Start mode: include machines with ingredient lot consumption
      ...(showIngredientLots ? {
        machines: machines.map(machine => ({
          equipmentId: machine.equipmentId,
          machineId: machine.machineId,
          machineName: machine.machineName,
          ingredientLotConsumption: Object.keys(machine.ingredientLots)
            .filter(ingredientId => machine.ingredientLots[ingredientId]?.lotId)
            .map(ingredientId => {
              const lotEntry = machine.ingredientLots[ingredientId];
              const trackingType = lotEntry?.trackingType || getIngredientTrackingType(ingredientId);
              const payload = {
                ingredientId,
                ingredientName: ingredients[ingredientId]?.name || 'Unknown',
                lotId: lotEntry?.lotId,
                lotNumber: ingredientLots[lotEntry?.lotId]?.internalLotNumber || 'Unknown',
                amountUsed: lotEntry?.amount || 0,
                trackingType
              };

              if (trackingType === 'count') {
                payload.countUsed = lotEntry?.count !== undefined ? lotEntry.count : (lotEntry?.amount || 0);
              } else {
                payload.weightUsed = {
                  lbs: lotEntry?.lbs || 0,
                  oz: lotEntry?.oz || 0,
                  totalLbs: lotEntry?.amount || 0
                };
              }

              return payload;
            })
        }))
      } : {})
    };
    onSubmit(requestData);
  };

  return (
    <>
      <div className="modal-backdrop">
        <div className="modal-content small-modal">
          <div className="modal-header">
            <div className="modal-title-block">
              <h3>{showIngredientLots ? 'Start Production Run' : 'New Production Run'}</h3>
              {productName && (
                <p className="production-product-name">{productName}</p>
              )}
            </div>
            <button onClick={onClose} className="close-button">&times;</button>
          </div>
          <div className="modal-body" style={{display: 'block'}}>
            {packageOptions.length > 0 ? (
              <>
                {/* Production Lot Number */}
                <div className="lot-number-display">
                  <label>Production Lot # <span style={{fontWeight: 'normal', color: '#6b7280'}}>{productionLotNumber}</span></label>
                </div>

                {/* Start Mode: Multiple Machines with Ingredient Lots */}
                {showIngredientLots ? (
                  <div className="machines-section">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                      <label>Production Machines</label>
                      <button
                        type="button"
                        className="btn-add-machine"
                        onClick={addMachine}
                        title="Add another machine"
                      >
                        + Add Machine
                      </button>
                    </div>
                    {machines.map((machine, index) => (
                      <div key={machine.id} className="machine-card">
                        <div className="machine-header">
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <strong>Machine #{index + 1}</strong>
                            {machine.equipmentId && (
                              <span style={{fontSize: '0.75rem', background: '#22c55e', color: 'white', padding: '2px 8px', borderRadius: '4px'}}>
                                ✓ {activeFreezeDryers.find(eq => eq.id === machine.equipmentId)?.machineId}
                              </span>
                            )}
                            {!machine.equipmentId && (
                              <span style={{fontSize: '0.75rem', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '4px'}}>
                                ⚠ Select dryer
                              </span>
                            )}
                          </div>
                          {machines.length > 1 && (
                            <button
                              type="button"
                              className="btn-remove-machine"
                              onClick={() => removeMachine(machine.id)}
                              title="Remove machine"
                            >
                              <FaTimes />
                            </button>
                          )}
                        </div>
                        <select
                          className="machine-selector"
                          value={machine.equipmentId}
                          onChange={(e) => {
                            const selectedEq = activeFreezeDryers.find(eq => eq.id === e.target.value);
                            if (selectedEq) {
                              // Update all three fields at once
                              setMachines(prev => prev.map(m =>
                                m.id === machine.id
                                  ? {
                                      ...m,
                                      equipmentId: selectedEq.id,
                                      machineId: selectedEq.machineId,
                                      machineName: selectedEq.name
                                    }
                                  : m
                              ));
                            }
                          }}
                        >
                          <option value="">Select freeze dryer...</option>
                          {activeFreezeDryers.map(eq => (
                            <option key={eq.id} value={eq.id}>
                              {eq.name} ({eq.machineId})
                            </option>
                          ))}
                        </select>

                        {/* Ingredient Lots for this machine - Two step process */}
                        {showIngredientLots && Object.keys(ingredients).length > 0 && machine.equipmentId && (
                          <div className="machine-ingredients">
                            <label style={{fontSize: '0.85rem', color: '#6b7280', marginTop: '8px', fontWeight: 600}}>📦 Select Ingredients & Lots</label>
                            
                            {/* Step 1: Select Ingredient */}
                            <div style={{marginTop: '8px', marginBottom: '12px'}}>
                              <label style={{fontSize: '0.8rem', color: '#555', fontWeight: 500, marginBottom: '4px', display: 'block'}}>Add Ingredient:</label>
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const ingredientId = e.target.value;
                                    setMachines(prev => prev.map(m =>
                                      m.id === machine.id
                                        ? {
                                            ...m,
                                            selectedIngredients: {
                                              ...m.selectedIngredients,
                                              [ingredientId]: true
                                            },
                                            ingredientLots: {
                                              ...m.ingredientLots,
                                              [ingredientId]: m.ingredientLots[ingredientId] || createIngredientEntry(ingredientId)
                                            }
                                          }
                                        : m
                                    ));
                                    e.target.value = ''; // Reset dropdown
                                  }
                                }}
                                style={{width: '100%', padding: '8px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem'}}
                              >
                                <option value="">-- Choose ingredient --</option>
                                {Object.values(ingredients)
                                  .filter(ing => !machine.selectedIngredients[ing.id])
                                  .map(ingredient => (
                                    <option key={ingredient.id} value={ingredient.id}>
                                      {ingredient.name}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            {/* Step 2: Show selected ingredients with lot selection */}
                            {Object.keys(machine.selectedIngredients).length > 0 && (
                              <div className="machine-ingredients">
                                {Object.keys(machine.selectedIngredients).map(ingredientId => {
                                  const ingredient = ingredients[ingredientId];
                                  if (!ingredient) return null;

                                  const availableLots = Object.values(ingredientLots)
                                    .filter(lot =>
                                      lot.ingredientId === ingredient.id &&
                                      lot.status !== 'Depleted' &&
                                      lot.status !== 'Recalled'
                                    )
                                    .sort((a, b) => {
                                      const dateA = a.expirationDate?.toMillis?.() || Infinity;
                                      const dateB = b.expirationDate?.toMillis?.() || Infinity;
                                      return dateA - dateB;
                                    });

                                  const lotEntry = machine.ingredientLots[ingredient.id] || createIngredientEntry(ingredient.id);
                                  const trackingType = lotEntry.trackingType || getIngredientTrackingType(ingredient.id);
                                  const recipeDefault = recipeRequirements[ingredient.id];
                                  const weightLbsValue = lotEntry.lbs ?? recipeDefault?.lbs ?? 0;
                                  const weightOzValue = lotEntry.oz ?? recipeDefault?.oz ?? 0;
                                  const countValue = lotEntry.count ?? recipeDefault?.count ?? 0;
                                  const amountValue = trackingType === 'count'
                                    ? countValue
                                    : (lotEntry.amount !== undefined
                                        ? lotEntry.amount
                                        : toDecimalLbs(weightLbsValue, weightOzValue));
                                  const isComplete = !!lotEntry?.lotId && amountValue > 0;
                                  let recipeHint = null;
                                  if (recipeDefault) {
                                    if (trackingType === 'count') {
                                      const targetCount = recipeDefault.count ?? recipeDefault.requiredAmount;
                                      const roundedTarget = Math.round(targetCount || 0);
                                      if (roundedTarget > 0) {
                                        recipeHint = `${roundedTarget} units`;
                                      }
                                    } else {
                                      const weightTarget = recipeDefault.requiredAmount || toDecimalLbs(recipeDefault.lbs || 0, recipeDefault.oz || 0);
                                      if (weightTarget && weightTarget > 0) {
                                        recipeHint = formatWeightDisplay(weightTarget);
                                      }
                                    }
                                  }

                                  return (
                                    <div key={ingredient.id} className="ingredient-item">
                                      <div className="ingredient-header">
                                        <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#374151'}}>
                                          {ingredient.name}
                                          <span style={{fontSize: '0.7rem', color: '#6b7280', marginLeft: '6px'}}>
                                            ({trackingType === 'count' ? 'Count' : 'Weight'})
                                          </span>
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMachines(prev => prev.map(m =>
                                              m.id === machine.id
                                                ? {
                                                    ...m,
                                                    selectedIngredients: Object.keys(m.selectedIngredients).reduce((acc, id) => {
                                                      if (id !== ingredient.id) acc[id] = true;
                                                      return acc;
                                                    }, {}),
                                                    ingredientLots: Object.keys(m.ingredientLots).reduce((acc, id) => {
                                                      if (id !== ingredient.id) acc[id] = m.ingredientLots[id];
                                                      return acc;
                                                    }, {})
                                                  }
                                                : m
                                            ));
                                          }}
                                          style={{fontSize: '0.7rem', background: '#ef4444', color: 'white', border: 'none', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer'}}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                      <div className="ingredient-lot-row">
                                        <select
                                          value={lotEntry?.lotId || ''}
                                          onChange={(e) => {
                                            updateMachineIngredientLot(
                                              machine.id,
                                              ingredient.id,
                                              { lotId: e.target.value }
                                            );
                                          }}
                                          className={`lot-selector ${isComplete ? 'complete' : ''}`}
                                        >
                                          <option value="">Select lot...</option>
                                          {availableLots.map(lot => {
                                            const expDate = lot.expirationDate?.toDate?.();
                                            const expStr = expDate ? ` - Exp: ${expDate.toLocaleDateString()}` : '';
                                            const remainingAmount = lot.remainingAmount !== undefined ? lot.remainingAmount : (lot.quantity?.amount || 0) - (lot.consumedAmount || 0);
                                            const qtyStr = remainingAmount ? ` (${remainingAmount} ${lot.quantity?.unit || lot.unit})` : '';
                                            return (
                                              <option key={lot.id} value={lot.id}>
                                                {lot.internalLotNumber}{qtyStr}{expStr}
                                              </option>
                                            );
                                          })}
                                        </select>
                                        {trackingType === 'count' ? (
                                          <div className="count-input-group">
                                            <input
                                              type="number"
                                              placeholder="Count"
                                              min="0"
                                              step="1"
                                              value={countValue}
                                              onChange={(e) => {
                                                setIngredientCount(
                                                  machine.id,
                                                  ingredient.id,
                                                  e.target.value
                                                );
                                              }}
                                              className={`lot-number-input ${isComplete ? 'complete' : ''}`}
                                            />
                                            <span className="unit-label">units</span>
                                          </div>
                                        ) : (
                                          <div className="weight-input-stack">
                                            <div className="weight-input-group">
                                              <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                placeholder="0"
                                                value={weightLbsValue === 0 ? '' : weightLbsValue}
                                                onChange={(e) => {
                                                  setIngredientWeight(
                                                    machine.id,
                                                    ingredient.id,
                                                    e.target.value,
                                                    lotEntry?.oz ?? weightOzValue
                                                  );
                                                }}
                                                className={`lot-number-input ${isComplete ? 'complete' : ''}`}
                                              />
                                              <span className="unit-label">lbs</span>
                                            </div>
                                            <div className="weight-input-group">
                                              <input
                                                type="number"
                                                min="0"
                                                max="15"
                                                step="1"
                                                placeholder="0"
                                                value={weightOzValue === 0 ? '' : weightOzValue}
                                                onChange={(e) => {
                                                  setIngredientWeight(
                                                    machine.id,
                                                    ingredient.id,
                                                    lotEntry?.lbs ?? weightLbsValue,
                                                    e.target.value
                                                  );
                                                }}
                                                className={`lot-number-input ${isComplete ? 'complete' : ''}`}
                                              />
                                              <span className="unit-label">oz</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      {recipeHint && (
                                        <div style={{fontSize: '0.7rem', color: '#6b7280', marginTop: '4px'}}>
                                          Recipe target: {recipeHint}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Package Quantities - Only for Request mode */}
                {!showIngredientLots && (
                  <div className="package-section">
                    {/* Request by Weight - ABOVE Package Quantities */}
                    <div className="bulk-qty-section">
                      <div className="bulk-qty-header">
                        <label className="bulk-qty-label">Bulk Qty</label>
                        <div className="bulk-qty-inputs">
                          <div className="bulk-qty-group">
                            <input
                              type="number"
                              min="0"
                              max="9999"
                              step="0.01"
                              placeholder="0"
                              value={weightLbs}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWeightLbs(val);
                                // If decimal is entered, auto-clear oz
                                if (val && val.includes('.')) {
                                  setWeightOz('');
                                }
                              }}
                              className="lot-number-input"
                              title="Enter whole or decimal lbs (e.g., 8.75)"
                            />
                            <span className="unit-label">lbs</span>
                          </div>
                          <div className="bulk-qty-group">
                            <input
                              id="weight-oz-input"
                              type="number"
                              min="0"
                              max="15"
                              placeholder="0"
                              value={weightOz}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (val >= 16) {
                                  const extraLbs = Math.floor(val / 16);
                                  const remainingOz = val % 16;
                                  setWeightLbs((parseFloat(weightLbs) || 0) + extraLbs);
                                  setWeightOz(remainingOz);
                                } else {
                                  setWeightOz(e.target.value);
                                }
                              }}
                              className="lot-number-input"
                              disabled={weightLbs && weightLbs.includes('.')}
                              title="Auto-disabled when decimal lbs used"
                            />
                            <span className="unit-label">oz</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Package Quantities Section */}
                    <label style={{fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '8px'}}>Container Qty</label>
                    <div className="package-inputs">
                      {packageOptions.map(pkg => (
                        <div className="package-input-group" key={pkg.id}>
                          <label>{pkg.name}</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            onChange={(e) => handleQuantityChange(pkg.id, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="weight-display">
                  <h4>Total Weight Required</h4>
                  <span>{formatWeightDisplay(totalWeightLbs)}</span>
                </div>

                <div className="form-actions">
                  <button onClick={onClose} className="btn-cancel">Cancel</button>
                  <button 
                    onClick={handleSubmit} 
                    className="btn-submit"
                    disabled={!canSubmit}
                    title={showIngredientLots && !canSubmit ? 'Complete the setup checklist to submit' : 'Submit request'}
                    style={{opacity: !canSubmit ? 0.5 : 1, cursor: !canSubmit ? 'not-allowed' : 'pointer'}}
                  >
                    {showIngredientLots ? 'Start Production' : 'Submit Request'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{textAlign: 'center'}}>
                <p>There are no container templates defined for this product's category.</p>
                <button onClick={onClose} className="btn-cancel" style={{marginTop: '10px'}}>OK</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MakeRequestModal;
