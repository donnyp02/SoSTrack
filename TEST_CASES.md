# 🧪 Test Cases - Priority 1 & 2

## Priority 1: Ingredient Consumption Tests

### Test 1.1: Basic Ingredient Decrementing
**Setup:**
- Ingredient lot: "ING-001" with 10 lbs

**Steps:**
1. Open Ingredient Intake
2. Log ingredient: 10 lbs Strawberry Puree
3. Go to Inventory tab → Ingredients
4. Verify: Shows "10 lbs on hand"
5. Create production batch request
6. Start production: Select ING-001, use 5.5 lbs
7. Refresh or go to Inventory tab
8. Verify: Shows "4.5 lbs on hand"

**Expected result:** ✅ Remaining amount decremented

---

### Test 1.2: Remaining Amount in Dropdown
**Setup:**
- Same as Test 1.1 (4.5 lbs remaining)

**Steps:**
1. Create new batch request
2. Click "Start Production"
3. Look at ingredient lot dropdown
4. Verify: Shows "ING-001 | 4.5 of 10 lbs | Exp: Oct 25"

**Expected result:** ✅ Dropdown shows remaining, not total

---

### Test 1.3: Over-Use Prevention
**Setup:**
- Ingredient: 4.5 lbs remaining

**Steps:**
1. Create batch request
2. Click "Start Production"
3. Select ING-001
4. Enter amount: 5.0
5. Click "Start Production" button

**Expected result:** ❌ Error alert: "Cannot use 5.0 lbs - only 4.5 lbs available"

---

### Test 1.4: Batch Deletion Restores Ingredient
**Setup:**
- Batch created using 5.5 lbs
- Ingredient showing 4.5 lbs remaining

**Steps:**
1. Go to Management Modal for product
2. Find the batch (status: Make)
3. Select it
4. Click "Delete" or delete button
5. Confirm deletion
6. Go to Inventory tab
7. Check ingredient quantity

**Expected result:** ✅ Ingredient restored to 10 lbs

---

### Test 1.5: Multiple Partial Uses
**Setup:**
- Ingredient: 10 lbs initial

**Steps:**
1. Create batch A, use 3 lbs → Remaining: 7 lbs
2. Create batch B, use 2 lbs → Remaining: 5 lbs
3. Create batch C, use 1.5 lbs → Remaining: 3.5 lbs
4. Check Inventory dashboard

**Expected result:** ✅ Shows 3.5 lbs on hand

---

### Test 1.6: Usage History Tracking
**Setup:**
- Same as Test 1.5

**Steps:**
1. Create batch A (3 lbs)
2. Open batch A document in Firestore
3. Check: batch.ingredientConsumption array
4. Check ingredient lot ING-001 document
5. Check: usageHistory array

**Expected result:** ✅ Both documents show usage entries

---

### Test 1.7: Empty Ingredient Quantity
**Setup:**
- Ingredient: 5 lbs remaining

**Steps:**
1. Create batch, use exactly 5 lbs
2. Try to create new batch using same ingredient
3. Look at dropdown

**Expected result:** ✅ Lot still appears but shows "0 of 5 lbs"

---

### Test 1.8: Multiple Machines Same Batch
**Setup:**
- Ingredient: 10 lbs

**Steps:**
1. Start production batch
2. Add 2 machines
3. Machine 1: Use ING-001, 4 lbs
4. Machine 2: Use ING-001, 3 lbs
5. Submit
6. Check Inventory

**Expected result:** ✅ Ingredient shows 3 lbs remaining (7 lbs used total)

---

## Priority 2: Location Tracking Tests

### Test 2.1: Initial Movement Recording
**Setup:**
- Fresh batch creation

**Steps:**
1. Create batch request
2. Start production (select machine FD-01)
3. Open batch in Firestore
4. Check: batch.currentLocation
5. Check: batch.movements array

**Expected result:** ✅ Shows:
- currentLocation: "FD-01" (or machine name)
- movements[0]: {fromLocation: "Ingredient Storage", toLocation: "FD-01"}

---

### Test 2.2: Event Log on Status Change
**Setup:**
- Batch in "Make" status

**Steps:**
1. Open Management Modal
2. Move batch to "Package"
3. Open batch in Firestore
4. Check: batch.events array

**Expected result:** ✅ Shows:
- Event with type: "STATUS_CHANGE"
- from: "Make", to: "Package"
- timestamp, actor, actorEmail

---

### Test 2.3: Location Display on Lot Card
**Setup:**
- Batch in "Package" status

**Steps:**
1. Go to Lot Tracking dashboard
2. Find the batch
3. Look at lot card

**Expected result:** ✅ Shows:
- Location with 📍 icon
- Text: Machine or packaging area name

---

### Test 2.4: Complete Movement Timeline
**Setup:**
- Batch that went: Make → Package → Ready

**Steps:**
1. Go to Lot Tracking dashboard
2. Search for batch
3. Click lot card (future: open detail modal)
4. Open batch in Firestore
5. Check movements array

**Expected result:** ✅ Shows sequence:
```
Movement 1: → Machine FD-01
Movement 2: → Packaging Area  
Movement 3: → Bucket Storage
```

---

### Test 2.5: Event Log Immutability
**Setup:**
- Batch with events in Firestore

**Steps:**
1. Open batch.events array
2. Try to manually delete an event
3. Save

**Expected result:** ⚠️ Note: Events are added but never removed (immutable)
- This is by design for compliance
- Old events stay in history

---

### Test 2.6: Multiple Status Changes
**Setup:**
- Create batch and move through statuses

**Steps:**
1. Create batch (Requested)
2. Start production (Make)
3. Move to packaging (Package)
4. Final count (Ready)
5. Check Firestore batch.events

**Expected result:** ✅ Shows 4 events:
```
Event 1: Requested → Make
Event 2: Make → Package
Event 3: Package → Ready
Event 4: FINALIZE (if applicable)
```

---

### Test 2.7: Actor Tracking
**Setup:**
- Multiple users making changes

**Steps:**
1. User A creates batch
2. User B moves it to Package
3. User C finalizes
4. Open batch.events

**Expected result:** ✅ Each event shows:
- actor: userId
- actorEmail: user@example.com

---

### Test 2.8: Timestamp Accuracy
**Setup:**
- Any batch in Firestore

**Steps:**
1. Open batch.movements
2. Open batch.events
3. Check all have timestamps

**Expected result:** ✅ All entries have valid timestamps in milliseconds

---

## Integration Tests

### Test I.1: Full Workflow
**Setup:** Clean state

**Steps:**
1. **Intake:** Log ingredient "10 lbs Strawberry"
2. **Request:** Create batch request (Requested)
3. **Produce:** Start production with 5.5 lbs (Make)
   - ✅ Ingredient decrements to 4.5 lbs
   - ✅ Movement: → Machine FD-01
   - ✅ Event: Requested → Make
4. **Package:** Move batch to packaging (Package)
   - ✅ Movement: → Packaging Area
   - ✅ Event: Make → Package
5. **Verify:** Final count 77 units (Ready)
   - ✅ Movement: → Bucket Storage
   - ✅ Event: Package → Ready
   - ✅ Inventory updated: 77 units added
6. **Dashboard:** Check Lot Tracking
   - ✅ Lot card shows: Bucket Storage location
   - ✅ Status: Ready

**Expected result:** ✅ Complete trace from ingredient to storage

---

### Test I.2: Batch Cancellation
**Setup:**
- Batch in "Make" status, used 5.5 lbs

**Steps:**
1. Delete batch
2. Check ingredient: Shows 10 lbs again
3. Check inventory: No units added

**Expected result:** ✅ Cancelled batch rolled back

---

### Test I.3: Multiple Batches
**Setup:**
- Single ingredient (10 lbs)

**Steps:**
1. Batch A uses 3 lbs (7 remaining)
2. Batch B uses 4 lbs (3 remaining)
3. Batch A completes → 3 units in storage
4. Batch B completes → 3 units in storage
5. Check Inventory
6. Check Lot Tracking (2 lots shown)

**Expected result:** ✅ Both appear in lot tracking, ingredients properly allocated

---

### Test I.4: Recall Scenario
**Setup:**
- Batch using specific ingredient lot
- Ingredient lot needs to be recalled

**Steps:**
1. Batch is production ready
2. Find batch that used ingredient
3. (Future: In detail modal) Mark as recalled
4. Note: "Supplier lot contaminated"

**Expected result:** ✅ Traceability working
- Can find batch quickly
- Complete history visible
- Can take corrective action

---

## Edge Cases

### Test E.1: Zero Remaining Quantity
**Steps:**
1. Ingredient: 0.5 lbs remaining
2. Try to use 1.0 lbs
3. See error message

**Expected result:** ✅ Clear error

---

### Test E.2: Very Small Quantities
**Steps:**
1. Ingredient: 0.05 lbs
2. Create batch using 0.03 lbs
3. Remaining should be 0.02 lbs

**Expected result:** ✅ Decimal precision maintained

---

### Test E.3: Deleted Ingredient
**Steps:**
1. Create batch using ingredient X
2. Delete ingredient X
3. Check batch

**Expected result:** ⚠️ Expected behavior:
- Batch should still work
- Usage history preserved
- Ingredient name shown even if deleted

---

### Test E.4: Rapid Status Changes
**Steps:**
1. Create batch
2. Quickly change status multiple times
3. Check events array

**Expected result:** ✅ All events recorded (no race conditions)

---

## Performance Tests

### Test P.1: Many Movements
**Steps:**
1. Create batch
2. Add 20+ movements manually (via Firestore)
3. Open lot card
4. Check display speed

**Expected result:** ✅ No lag, locations still show

---

### Test P.2: Large Event Log
**Steps:**
1. Create batch with 50+ events
2. Open Firestore
3. Read document

**Expected result:** ✅ Document readable, no size issues

---

### Test P.3: Many Ingredient Uses
**Steps:**
1. Ingredient used by 20+ batches
2. Check usageHistory array
3. Open ingredient in Inventory

**Expected result:** ✅ No performance degradation

---

## Test Results Checklist

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| 1.1  | Remaining decrements | ? | ⬜ |
| 1.2  | Dropdown shows remaining | ? | ⬜ |
| 1.3  | Over-use prevented | ? | ⬜ |
| 1.4  | Deletion restores ingredient | ? | ⬜ |
| 1.5  | Multiple uses tracked | ? | ⬜ |
| 1.6  | Usage history recorded | ? | ⬜ |
| 1.7  | Empty quantity handled | ? | ⬜ |
| 1.8  | Multiple machines work | ? | ⬜ |
| 2.1  | Initial movement recorded | ? | ⬜ |
| 2.2  | Events logged on status change | ? | ⬜ |
| 2.3  | Location shows on card | ? | ⬜ |
| 2.4  | Movement timeline visible | ? | ⬜ |
| 2.5  | Events immutable | ? | ⬜ |
| 2.6  | Multiple events tracked | ? | ⬜ |
| 2.7  | Actor tracked | ? | ⬜ |
| 2.8  | Timestamps accurate | ? | ⬜ |
| I.1  | Full workflow complete | ? | ⬜ |
| I.2  | Cancellation works | ? | ⬜ |
| I.3  | Multiple batches OK | ? | ⬜ |
| I.4  | Traceability working | ? | ⬜ |

---

## Browser Console Checks

When testing, open DevTools Console and verify:
- No error messages
- No warnings about missing data
- Firebase operations successful
- Data updates reflected in Firestore

```javascript
// Quick check in console:
db.collection("batches").where("status", "==", "Make").get()
  .then(docs => console.log(`Found ${docs.size} batches in Make status`))

db.collection("ingredientLots").where("remainingAmount", ">", 0).get()
  .then(docs => console.log(`Found ${docs.size} lots with remaining quantity`))
```
