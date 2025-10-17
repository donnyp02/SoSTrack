# 🛠️ Lot Tracking Implementation Checklist

## PRIORITY 1: Ingredient Consumption & Decrementing ⭐⭐⭐

### What This Does:
- When a batch starts production with ingredient lots selected, those ingredient lots get "consumed"
- Their quantities decrement immediately
- If batch is deleted/cancelled, quantities are restored
- Prevents double-using ingredient lots

### Implementation Steps:

#### Step 1.1: Update Batch Submission Handler in App.js
**File:** `src/App.js`

When a batch is created from MakeRequestModal with ingredient lots:
1. Extract `ingredientLotConsumption` from the request
2. For each ingredient lot in consumption:
   - Decrement the ingredient lot quantity in Firestore
   - Add batch reference to ingredient lot's `usageHistory`
3. Store the `ingredientLotConsumption` array in the batch document
4. Store an event in batch.events documenting ingredient usage

**Pseudo-code:**
```javascript
// When user submits "Start Production" with ingredient lots:
const handleBatchStartProduction = async (requestData) => {
  const { machines, ingredientLotConsumption } = requestData;
  
  // 1. Create the batch
  const batchRef = await addDoc(collection(db, "batches"), {
    status: "Make",
    ingredientConsumption: ingredientLotConsumption,
    events: [{
      timestamp: serverTimestamp(),
      type: "STATUS_CHANGE",
      from: "Requested",
      to: "Make",
      actor: user.uid
    }],
    movements: [{
      timestamp: serverTimestamp(),
      fromLocation: "Ingredient Storage",
      toLocation: machines[0].machineName,
      quantity: /* calculated */,
      notes: "Starting production"
    }]
  });
  
  // 2. Decrement each ingredient lot
  for (const consumption of ingredientLotConsumption) {
    const lotRef = doc(db, "ingredientLots", consumption.lotId);
    const lotSnap = await getDoc(lotRef);
    const currentQty = lotSnap.data().quantity?.amount || 0;
    const newQty = currentQty - consumption.amountUsed;
    
    await updateDoc(lotRef, {
      consumedAmount: (lotSnap.data().consumedAmount || 0) + consumption.amountUsed,
      remainingAmount: newQty,
      currentLocation: consumption.machineUsed,
      usageHistory: arrayUnion({
        batchId: batchRef.id,
        batchLotNumber: requestData.productionLotNumber,
        amountUsed: consumption.amountUsed,
        timestamp: serverTimestamp(),
        machineId: consumption.machineUsed
      })
    });
  }
};
```

#### Step 1.2: Update Ingredient Lot Data Structure
**File:** `src/App.js` (in `lotTrackingData` useMemo where ingredient lots are mapped)

Add calculations for:
- `consumedAmount` = sum of all usageHistory amounts
- `remainingAmount` = total amount - consumedAmount
- `locations` = all movements showing current location

#### Step 1.3: Handle Batch Deletion/Cancellation
**File:** `src/App.js` (in the batch deletion handler)

When a batch is deleted:
1. Get the batch document with its `ingredientLotConsumption`
2. For each consumed ingredient:
   - Add back the `amountUsed` to the ingredient lot quantity
   - Remove the usage entry from `usageHistory`

**Pseudo-code:**
```javascript
const handleBatchDelete = async (batchId) => {
  const batchSnap = await getDoc(doc(db, "batches", batchId));
  const batch = batchSnap.data();
  
  // Restore all ingredient lot quantities
  if (batch.ingredientConsumption) {
    for (const consumption of batch.ingredientConsumption) {
      const lotRef = doc(db, "ingredientLots", consumption.lotId);
      const lotSnap = await getDoc(lotRef);
      const currentRemaining = lotSnap.data().remainingAmount || 0;
      
      await updateDoc(lotRef, {
        remainingAmount: currentRemaining + consumption.amountUsed,
        consumedAmount: (lotSnap.data().consumedAmount || 0) - consumption.amountUsed,
        usageHistory: arrayRemove({
          batchId: batchId,
          // ... other fields
        })
      });
    }
  }
  
  // Then delete the batch
  await deleteDoc(doc(db, "batches", batchId));
};
```

#### Step 1.4: Update MakeRequestModal
**File:** `src/components/MakeRequestModal.js`

The ingredient lot selection is already partially there, but needs:
1. Show `remainingAmount` instead of just `amount` in dropdown
2. Show "DEPLETED" status for lots with 0 remaining
3. Show expiration date more clearly
4. Warn if selecting a lot that expires soon

**Example dropdown text:**
```
ING-20251010-001 | 4.5 of 10 lbs remaining | Exp: Oct 25 ⚠️
```

#### Step 1.5: Update IngredientDashboard Display
**File:** `src/App.js` (where ingredient dashboard data is calculated)

Modify the cards to show:
- `remainingAmount` (not just `amount`)
- Usage history (which batches used this lot)
- Visual indicator if lot is "in use" (partially consumed)

---

## PRIORITY 2: Storage Location Tracking

### What This Does:
- Track where batches are physically located at each stage
- Record movements with timestamps
- Enable location-based inventory queries

### Implementation Steps:

#### Step 2.1: Create Location Management UI
**File:** `src/components/LocationManager.js` (NEW FILE)

Features:
- Add/edit/delete locations
- Organize by area (Machine Area, Packaging Area, Storage, etc.)
- Set capacity if needed

**Simple structure:**
```javascript
const location = {
  id: "loc-fd-01",
  name: "Machine FD-01",
  area: "Production - Freezer",
  type: "machine",
  capacity: null, // optional
  active: true
}
```

#### Step 2.2: Create Location Selector Component
**File:** `src/components/LocationSelector.js` (NEW FILE)

Used when moving a batch:
- Shows available locations
- Allows optional quantity split
- Shows current location
- Has "Confirm Move" button

#### Step 2.3: Add Location Updates to Stage Transitions
**File:** `src/App.js`

When status changes:
- `Requested` → `Make`: Move from "Ingredient Storage" → Machine
- `Make` → `Package`: Move from Machine → "Tray Racks - Packaging Area"
- `Package` → `Ready`: Move to final storage location

**Pseudo-code:**
```javascript
const updateBatchLocation = async (batchId, toLocation, quantity, notes) => {
  const batchRef = doc(db, "batches", batchId);
  const batchSnap = await getDoc(batchRef);
  const batch = batchSnap.data();
  
  await updateDoc(batchRef, {
    currentLocation: toLocation,
    currentQuantity: quantity,
    movements: arrayUnion({
      timestamp: serverTimestamp(),
      fromLocation: batch.currentLocation || "Unknown",
      toLocation: toLocation,
      quantity: quantity,
      actorId: user.uid,
      notes: notes
    })
  });
};
```

#### Step 2.4: Display Movements on Lot Card
**File:** `src/components/LotCard.js`

Add a "Timeline" or "Locations" section showing:
```
📍 Current: Bucket Storage - Area C
Timeline:
  Oct 16, 14:45 → Machine FD-01
  Oct 16, 14:55 → Tray Racks - Packaging Area
  Oct 16, 16:00 → Bucket Storage - Area C
```

---

## PRIORITY 3: Lot Detail & Edit Modal ⭐⭐

### What This Does:
- Click on lot card to view full details
- Edit status, location, notes
- View complete timeline/audit trail
- Enable corrections for data entry errors

### Implementation Steps:

#### Step 3.1: Create LotDetailModal Component
**File:** `src/components/LotDetailModal.js` (NEW FILE)

**Structure:**
```jsx
const LotDetailModal = ({ lot, onClose, onUpdate }) => {
  // Tabs:
  // - Summary (product info, qty, dates)
  // - Ingredients (what went into this batch)
  // - Location (current and history)
  // - QC & Notes (editable)
  // - Timeline (immutable event log)
}
```

#### Step 3.2: Add Editable Fields
- Status (dropdown: Ready, Hold, Consumed, Recalled)
- Storage location (if not "Ready", can update)
- QC notes (textarea)
- Expiration date override (if needed)
- Recall reason (if status is Recalled)

#### Step 3.3: Display Read-Only Fields
- Lot number, product name, category
- Production date, final count
- Ingredient consumption list
- Created by (user who started production)

#### Step 3.4: Show Event Timeline
Display immutable audit trail:
```
Oct 16, 14:30 | STATUS_CHANGE | Requested → Make | by Jane_Prod
Oct 16, 14:45 | LOCATION_UPDATE | → Machine FD-01 | by Jane_Prod
Oct 16, 14:55 | LOCATION_UPDATE | → Packaging Area | by Bob_Pack
Oct 16, 16:00 | FINALIZE | Count: 77 units | by Bob_Pack
```

#### Step 3.5: Link from LotCard to Modal
**File:** `src/components/LotCard.js`

Make card clickable:
```javascript
const handleCardClick = () => {
  onInspectLot(lot); // Already exists, just need to use it
};
```

In App.js:
```javascript
const [selectedLot, setSelectedLot] = useState(null);

const handleInspectLot = (lot) => {
  setSelectedLot(lot);
  setActiveModal('lotDetail');
};
```

Then render:
```jsx
{activeModal === 'lotDetail' && selectedLot && (
  <LotDetailModal
    lot={selectedLot}
    onClose={handleCloseModal}
    onUpdate={handleLotUpdate}
  />
)}
```

---

## PRIORITY 4: Tablet UI Improvements for Ingredient Selection

### What This Does:
- Make ingredient lot selection user-friendly on tablets
- Better visual feedback
- Clearer lot information display

### Current Pain Points:
1. Dropdown shows only lot number, hard to see details
2. Amount input field is small
3. No preview of what's being selected

### Improvements:

#### Step 4.1: Redesign Ingredient Lot Selector
**File:** `src/components/MakeRequestModal.js`

Instead of:
```html
<select>
  <option>ING-20251010-001 (10 lbs) - Exp: Oct 25</option>
</select>
```

Use:
```jsx
// Collapsible lot list with better spacing for tablets
<div className="ingredient-lot-selector">
  <div className="selector-header">
    <label>Strawberry Puree</label>
    <span className="total-needed">Need: 5.5 lbs</span>
  </div>
  
  {availableLots.map(lot => (
    <button
      key={lot.id}
      className={`lot-card ${selectedLot?.id === lot.id ? 'selected' : ''}`}
      onClick={() => selectLot(lot)}
    >
      <div className="lot-card-content">
        <div className="lot-number">{lot.internalLotNumber}</div>
        <div className="lot-qty">
          <strong>{lot.remainingAmount}</strong> {lot.unit} available
        </div>
        <div className="lot-exp">
          Exp: {formatDate(lot.expirationDate)}
          {isExpiringSoon(lot) && <span className="expiring-badge">⚠️</span>}
        </div>
      </div>
      {selectedLot?.id === lot.id && <span className="checkmark">✓</span>}
    </button>
  ))}
</div>

<input
  type="number"
  placeholder={`Enter amount (max ${selectedLot?.remainingAmount})`}
  value={amountUsed}
  onChange={(e) => setAmountUsed(e.target.value)}
  className="lot-amount-input"
/>
```

#### Step 4.2: Add Toast Feedback
When ingredient lot is selected:
```javascript
toast.info(`✓ Using ${selectedLot.internalLotNumber} (${amountUsed} ${selectedLot.unit})`, {
  autoClose: 2000
});
```

#### Step 4.3: Validate Amount
```javascript
const maxAmount = selectedLot?.remainingAmount || 0;
const isValid = amountUsed > 0 && amountUsed <= maxAmount;

if (!isValid) {
  toast.error(`Amount must be between 1 and ${maxAmount} ${selectedLot.unit}`);
}
```

#### Step 4.4: Add CSS for Tablet Display
**File:** `src/components/MakeRequestModal.css`

```css
@media (min-width: 768px) {
  .ingredient-lot-selector {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .lot-card {
    padding: 16px;  /* Larger touch target */
    min-height: 60px;
    border-radius: 8px;
    border: 2px solid #e5e7eb;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .lot-card:hover {
    border-color: #3b82f6;
    background: #f0f9ff;
  }
  
  .lot-card.selected {
    border-color: #10b981;
    background: #ecfdf5;
  }
  
  .lot-card-content {
    display: grid;
    grid-template-columns: 150px 1fr 150px;
    gap: 16px;
    align-items: center;
  }
  
  .lot-number {
    font-weight: 600;
    font-size: 1.1rem;
  }
  
  .lot-qty {
    font-size: 1rem;
  }
  
  .lot-exp {
    text-align: right;
    font-size: 0.95rem;
    color: #666;
  }
  
  .expiring-badge {
    margin-left: 8px;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .lot-amount-input {
    padding: 12px 16px;
    font-size: 1.1rem;
    min-height: 48px;
    border-radius: 8px;
  }
}
```

---

## Testing Checklist

### Before deploying to production:

- [ ] Create ingredient lot, verify it appears in dropdown
- [ ] Select ingredient lot in MakeRequestModal, verify quantity decrements
- [ ] Delete batch, verify ingredient quantity is restored
- [ ] Add lots on tablet, test touch targets and visibility
- [ ] Test ingredient lot with low remaining quantity (e.g., 0.5 lbs, try to use 1 lb → should error)
- [ ] Test partial usage (10 lbs lot, use 5.5 lbs, verify 4.5 lbs remains)
- [ ] Create batch, verify `ingredientConsumption` array saved in Firestore
- [ ] Verify ingredient lot `usageHistory` updated
- [ ] Test on tablet at different screen sizes
- [ ] Test ingredient lot dropdown on multiple machines

---

## Files to Create/Modify

### New Files (Phase 1-2):
- ✅ `src/components/LotDetailModal.js`
- ✅ `src/components/LocationManager.js`
- ✅ `src/components/LocationSelector.js`

### Modified Files:
- `src/App.js` (ingredient consumption logic, event handlers)
- `src/components/MakeRequestModal.js` (UI improvements, validation)
- `src/components/LotCard.js` (make clickable, show location)
- `src/components/LotTrackingPanel.js` (link to detail modal)
- `src/components/IngredientIntakeModal.js` (show remaining amount)

### CSS Updates:
- `src/components/MakeRequestModal.css` (tablet optimization)
- `src/components/LotDetailModal.css` (new modal styling)
- `src/components/LocationSelector.css` (new component styling)

---

Ready to start? Which priority would you like me to tackle first?

1. **Priority 1** (Ingredient Consumption) - Most critical for traceability
2. **Priority 3** (Lot Detail Modal) - Most user-facing
3. **Priority 4** (Tablet UI) - Improves UX immediately
