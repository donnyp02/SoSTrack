# 🚀 SoSTrack Lot Tracking Implementation Strategy

## Executive Summary
We're building a **complete traceability system** that tracks food products from raw ingredient intake → production → packaging → ready to ship. This enables compliance, recall management, and quality tracking.

---

## 📊 Current State Assessment

### ✅ What's Already Implemented:
1. **Ingredient Lot Intake System** (IngredientIntakeModal)
   - Track supplier lot numbers & internal lot numbers
   - Quantity & unit tracking (lbs, kg, units, etc.)
   - Expiration dates & intake dates
   - QA checks (temperature, packaging, COA received)
   - Storage location (area/bin) fields exist
   - Status: Pending QA → Released → Quarantined → Depleted

2. **Production Batch System** (MakeRequestModal)
   - Auto-generated PROD lot numbers
   - Machine selection & assignment
   - **Ingredient lot selection** UI partially done but needs refinement
   - Stores `ingredientLotConsumption` array with ingredient ID, lot ID, and amount used

3. **Lot Tracking Dashboard** (LotTrackingPanel)
   - Displays active lots with status, expiration dates
   - Filters by status, timeframe, search
   - Summary metrics (active, expiring, on hold, recalled)
   - LotCard component for display

4. **Final Count Verification** (FinalCountModal)
   - Records actual packaged units (may differ from plan)
   - Updates inventory when batch completes

---

## 🔧 Implementation Priorities

### Priority 1: Ingredient Consumption (Critical for Traceability)
**What needs to happen:**
- When production batch is created with ingredient lots, **decrement** the ingredient lot quantity
- Store back-reference in ingredient lot document linking to batch
- If batch is deleted/cancelled, restore ingredient lot quantity
- Create consumption history for audit trail

**Impact:** Prevents double-using ingredient lots, enables expiration management

**Estimated effort:** 2-3 hours

---

### Priority 2: Lot Movement & Storage Tracking
**What needs to happen:**
- Add storage location updates at key points:
  - **Production start**: Ingredient lots move from storage → Machine
  - **Production complete**: Trays move from Machine → Tray Racks
  - **Packaging start**: Trays move to Packaging Area
  - **Packaging done**: Packaged goods move to Buckets/Storage
  - **Ready to ship**: Final location = Holding area/Vault

- Create a **Location** entity that can be:
  - Named locations (Machine FD-01, Packaging Area, Bucket Storage, Vault)
  - Quantity tracked per location (for physical inventory verification)
  - Timestamps for each movement

**UI Approach:**
- Add location dropdown at each stage transition
- Optional quantity split (e.g., 80 units to Bucket A, 20 units to Bucket B)
- Display location timeline on lot card

**Firestore schema addition:**
```
batch.movements = [
  {
    timestamp: 2025-10-16T14:30:00Z,
    fromLocation: "Machine FD-01",
    toLocation: "Tray Racks - Packaging Area",
    quantity: 100,
    actorId: "user123",
    notes: "Production complete, ready for packaging"
  },
  ...
]
```

**Estimated effort:** 4-5 hours

---

### Priority 3: Lot Detail & Edit Modal
**What needs to happen:**
- Click on LotCard → View/Edit Details
- Editable fields (for correcting data entry errors):
  - Status (Ready, Hold, Consumed, Recalled)
  - Storage location
  - Notes/QC notes
  - Expiration date (override)
  - Recall reason (if applicable)
  
- Read-only fields (for audit trail):
  - Lot number, production date, final count, created by
  - Timeline of movements & status changes

**Estimated effort:** 3-4 hours

---

### Priority 4: Lot Movement Log & Audit Trail
**What needs to happen:**
- Every status change → log entry with timestamp, who changed it, why
- Every location movement → log entry
- Accessible from lot detail view
- Immutable (can't edit old entries)

**Use case:** Tracing recalls - "Who moved this batch and when?"

**Estimated effort:** 2-3 hours (after priorities 1-3)

---

## 🎯 Proposed Firestore Schema Updates

### Batch Document (Enhanced):
```javascript
batch: {
  // Existing fields...
  id: "abc123",
  status: "Ready",
  lotNumber: "PROD-20251016-143000",
  
  // NEW: Ingredient consumption tracking
  ingredientConsumption: [
    {
      ingredientId: "ing-001",
      ingredientName: "Strawberry Puree",
      supplierLotNumber: "SUP-789",
      internalLotNumber: "ING-20251010-0001",
      amountUsed: 5.5,
      unit: "lbs",
      machineUsed: "FD-01"
    }
  ],
  
  // NEW: Location history
  movements: [
    {
      timestamp: 1729086600000,
      fromLocation: "FD-01",
      toLocation: "Tray Rack - Area C",
      quantity: 100,
      actorId: "user123",
      notes: "Trays unloaded after freeze dry cycle"
    }
  ],
  currentLocation: "Tray Rack - Area C",
  currentQuantity: 100,
  
  // NEW: Event log (immutable)
  events: [
    {
      timestamp: 1729086600000,
      type: "STATUS_CHANGE",
      from: "Make",
      to: "Package",
      actor: "user123",
      reason: "Production complete"
    },
    {
      timestamp: 1729086700000,
      type: "LOCATION_UPDATE",
      location: "Packaging Area",
      actor: "user123"
    }
  ]
}
```

### Ingredient Lot Document (Enhanced):
```javascript
ingredientLot: {
  // Existing fields...
  id: "lot-xyz",
  internalLotNumber: "ING-20251010-0001",
  ingredientId: "ing-001",
  quantity: {
    amount: 10,
    unit: "lbs"
  },
  
  // NEW: Consumption tracking
  usageHistory: [
    {
      batchId: "batch-001",
      batchLotNumber: "PROD-20251016-143000",
      amountUsed: 5.5,
      unit: "lbs",
      timestamp: 1729086600000,
      machineId: "FD-01"
    }
  ],
  consumedAmount: 5.5,
  remainingAmount: 4.5, // Calculated: amount - consumedAmount
  
  // NEW: Location tracking
  currentLocation: "Machine FD-01",
  currentQuantity: 4.5,
  movements: [
    {
      timestamp: 1729086600000,
      fromLocation: "Ingredient Storage",
      toLocation: "Machine FD-01",
      quantity: 5.5,
      batchId: "batch-001"
    }
  ]
}
```

---

## 📱 Mobile/Tablet Optimizations

The ingredient lot selection in MakeRequestModal needs improvement for tablets:

### Current Issues:
- Ingredient lot dropdowns show too much info (expiration date format)
- Amount input field is small
- No visual feedback for selected lot
- Lot availability (expiration warnings) not shown before selection

### Improvements:
1. **Redesign ingredient lot selector:**
   ```
   ┌─ Ingredient Name ──────────────────────────┐
   │ [Select Lot...                          ▼] │
   │                                             │
   │ Available lots:                             │
   │ ☐ ING-001 | 8.2 lbs | Exp: Oct 25 | ✓    │
   │ ☐ ING-002 | 3.1 lbs | Exp: Oct 28 |      │
   │ ☐ ING-003 | 1.5 lbs | EXPIRING IN 2 DAY! │
   └─────────────────────────────────────────────┘
   ```

2. **Larger touch targets:** 48px min height for buttons/inputs on tablet
3. **Visual quantity counter:** Show "5.5 / 10 lbs" remaining after selection
4. **Confirm lot with toast:** When lot is selected, show "✓ Using lot ABC (5.5 lbs)"

---

## 🛣️ Implementation Roadmap

### Phase 1: Ingredient Consumption (Days 1-2)
- [ ] Decrement ingredient lot quantity when batch created
- [ ] Restore quantity on batch deletion
- [ ] Store ingredientConsumption array in batch
- [ ] Store usageHistory in ingredient lot
- [ ] Calculate remainingAmount for ingredient lots

### Phase 2: Storage Location Tracking (Days 3-5)
- [ ] Create Location management UI (add/edit/delete locations)
- [ ] Add movement tracking to batch document
- [ ] Create location transition UI for each stage
- [ ] Add currentLocation/currentQuantity to batch

### Phase 3: Lot Detail & Edit Modal (Days 6-7)
- [ ] Create LotDetailModal component
- [ ] Support editing status, location, notes, expiration
- [ ] Display event log / timeline
- [ ] Link from LotCard to detail modal

### Phase 4: Polish & Optimization (Days 8)
- [ ] Tablet UI improvements for ingredient selection
- [ ] Movement log visualization
- [ ] Audit trail exports (CSV)
- [ ] Performance optimization

---

## 🔒 Compliance & Best Practices

This system will support:
- **FDA Traceability** (21 CFR Part 11 / FSMA)
- **HACCP Plans** (Hazard Analysis Critical Control Points)
- **Recall Management** (trace which batches used recalled ingredient)
- **Inventory Accuracy** (prevent double-use of lots)
- **Audit Trail** (WHO did WHAT and WHEN)

---

## 💡 Key Design Decisions

### 1. Why track ingredient consumption separately?
- Prevents "double-use" of ingredient lots
- Enables "recall a lot and see which products affected"
- Tracks shelf-life per ingredient usage
- Helps with inventory forecasting

### 2. Why movement tracking at each stage?
- Physical verification at each point
- Quantity tracking in case of loss/spillage
- Location-based inventory queries ("What's in Packaging Area?")
- Support for manual corrections

### 3. Why immutable event log?
- Compliance requirement (no doctoring records)
- Audit trail for recalls
- Can still "edit" current state, but history is preserved

---

## ❓ Questions for You

1. **Location types:** Should we have:
   - Predefined locations (FD-01, FD-02, Tray Racks, Packaging Area, Vault)?
   - Or dynamic/user-created locations?
   - Or both?

2. **Partial quantities:** If a batch is split (80 units to Bucket A, 20 to Bucket B):
   - Should we split the batch record?
   - Or keep one batch with multiple "destination" records?

3. **Ingredient shortage:** If batch needs 5 lbs but only 3 lbs available:
   - Block the batch creation?
   - Allow with warning?
   - Allow and let production team manually adjust?

4. **Movement permissions:** Should all staff be able to move lots?
   - Or restrict to certain roles (Production Manager, etc.)?

---

## Next Steps

1. **You review this document** → Questions/feedback
2. **I implement Priority 1** (ingredient consumption) → Test on local branch
3. **You test on tablet** → Feedback on UX
4. **I implement Priority 2** (storage location tracking)
5. **Iterate** until it works smoothly for your team

Ready to start! 🚀
