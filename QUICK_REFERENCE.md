# 🎯 Quick Reference: New Features

## Priority 1: Ingredient Consumption ✅

### What It Does:
When you select an ingredient lot for production, the quantity automatically decrements and the system prevents over-using ingredients.

### How to Use:

1. **Log Ingredient Intake** (Already existed, now enhanced)
   - Create ingredient lot with quantity (e.g., 10 lbs)
   - System shows total amount and initial remaining amount

2. **Start Production** (Now tracks consumption)
   - Select ingredient lots for your batch
   - Dropdown shows: `ING-001 | 4.5 of 10 lbs | Exp: Oct 25`
   - Enter amount to use (e.g., 5.5 lbs)
   - Click "Start Production"
   - ✅ Ingredient quantity decrements → Remaining: 4.5 lbs

3. **Create Another Batch** (Now validates)
   - Try to use 5.0 lbs of same ingredient
   - ❌ Error: "Cannot use 5.0 lbs - only 4.5 lbs available"
   - Select different lot or use less

4. **Delete a Batch** (Restores ingredient)
   - Delete the batch
   - ✅ Ingredient quantity restored → Remaining: 10 lbs again

### Dashboard View:
- Ingredient shows "On hand: 4.5 lbs" (accounts for consumption)
- Click to see usage history (which batches used it)

---

## Priority 2: Location Tracking ✅

### What It Does:
Track where batches are physically located at each stage (machine → packaging → storage), with complete audit trail.

### How to Use:

1. **Set Up Locations** (First time only)
   - Go to Management section (if LocationManager is added to UI)
   - Add locations:
     - "Machine FD-01" (type: Machine)
     - "Tray Racks - Packaging Area" (type: Staging)
     - "Bucket Storage - Area C" (type: Storage)
   - Save each location

2. **Batch Movement** (Automatic)
   - Create batch request
   - Start production → ✅ Auto-records movement to Machine FD-01
   - Move to packaging → ✅ Auto-records movement to Packaging Area
   - Final count & ready → ✅ Auto-records movement to Bucket Storage

3. **View Location** (On Lot Card)
   - Open Lot Tracking dashboard
   - Lot card shows:
     - Current location with 📍 icon
     - Expiration date
     - Status

4. **View Complete Trail** (Click lot card for detail)
   - See full movement history:
     ```
     Oct 16, 14:30 → Machine FD-01 (Jane started production)
     Oct 16, 14:55 → Packaging Area (Bob moved it)
     Oct 16, 16:00 → Bucket Storage C (Final count: 77 units)
     ```
   - See event log (immutable):
     ```
     14:30 STATUS: Requested → Make
     14:55 MOVEMENT: FD-01 → Packaging Area
     16:00 FINALIZE: 77 units counted
     16:00 STATUS: Package → Ready
     ```

---

## 🔍 How to Find Information

### "Which ingredient lots are left?"
→ Go to Inventory tab → Ingredients section
→ See "On hand" amount (accounts for consumption)

### "Where is batch XYZ?"
→ Go to Lot Tracking dashboard
→ Search for lot number
→ See location with 📍 icon

### "What went into batch XYZ?"
→ Click lot card
→ Open lot detail modal (when created in Priority 3)
→ See "Ingredients Used" section

### "Did we over-use an ingredient?"
→ Try to create batch
→ System validates amounts
→ Gets error if trying to use more than available

### "What happened to batch XYZ?"
→ Click lot card
→ See complete event log:
   - When status changed
   - Who made changes
   - When it moved locations
   - Final count verification

---

## ⚠️ Important Notes

### Ingredient Consumption
- ✅ Decrements immediately when batch starts
- ✅ Restores if batch is deleted
- ✅ Prevents double-using ingredients
- ✅ Shows remaining amount in dropdown

### Location Tracking
- ✅ Tracks all movements with timestamps
- ✅ Records who made each movement
- ✅ Shows current location on lot cards
- ✅ Immutable audit trail (can't delete events)

### Batch Deletion
- ⚠️ Deleting a batch restores ingredient quantities
- ⚠️ This is by design - if you cancel production, ingredients go back to available pool

### Data Integrity
- ✅ All changes logged with timestamp
- ✅ All changes recorded with user info
- ✅ Supports FDA/FSMA compliance
- ✅ No manual event editing (immutable for compliance)

---

## 🎮 Workflow Example

**Day 1: Supplier Delivery**
```
10 lbs Strawberry Puree arrives
→ Log in system: ING-20251010-001
→ Amount: 10 lbs, Remaining: 10 lbs ✓
```

**Day 2: Production Request**
```
Office creates batch request for Strawberry Slushies
→ Batch: PROD-20251016-143000
→ Status: Requested ✓
```

**Day 2: Production Starts**
```
Production team starts batch:
→ Select Machine FD-01
→ Select ING-20251010-001 (5.5 lbs available)
→ Use 5.5 lbs
→ Status: Make ✓
→ ✅ Ingredient updated: Remaining 4.5 lbs
→ ✅ Movement logged: Storage → FD-01
→ ✅ Event logged: Requested → Make
```

**Day 2: After Freeze Dry**
```
Unload from machine to packaging area
→ Status: Package ✓
→ ✅ Movement logged: FD-01 → Packaging Area
```

**Day 2: Final Count**
```
Count packages: 48×16oz + 29×32oz = 77 units
→ Status: Ready ✓
→ ✅ Movement logged: Packaging Area → Bucket Storage C
→ ✅ Event logged: Package → Ready
→ ✅ Event logged: Finalized 77 units
```

**Day 3: Compliance Check**
```
Auditor asks: "Trace lot PROD-20251016-143000"
→ Click lot card
→ See complete history:
   • Ingredients: 5.5 lbs Strawberry, 8 lbs Sugar
   • Locations: Machine FD-01 → Packaging → Storage C
   • Events: All status changes with timestamps
   • Final count: 77 units on Oct 16 at 16:00
→ ✅ Complete audit trail ready
```

---

## 🐛 Troubleshooting

**Q: Ingredient dropdown doesn't show remaining amount**
A: Make sure ingredient lot has `remainingAmount` field. System calculates from: `amount - consumedAmount`

**Q: Can't delete a batch**
A: Check browser console for errors. System will restore ingredient quantities automatically.

**Q: Location not showing on lot card**
A: Make sure batch has `currentLocation` field set. System sets this automatically during status changes.

**Q: Events not showing**
A: System creates `events` array on batch creation. If missing, they'll be added on next status change.

---

## 📞 Need More Help?

See detailed docs:
- `LOT_TRACKING_STRATEGY.md` - Overall architecture
- `LOT_TRACKING_FLOW.md` - Complete data flow examples
- `IMPLEMENTATION_COMPLETE_P1_P2.md` - What was built

