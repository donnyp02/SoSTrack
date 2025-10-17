# 🔄 SoSTrack Lot Tracking Data Flow Diagram

## Complete Product Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INGREDIENT TRACKING                                │
└─────────────────────────────────────────────────────────────────────────────┘

   Supplier Delivers
        ↓
   [Ingredient Intake Modal]
        ├─→ Supplier Lot: "SUP-456789"
        ├─→ Internal Lot: "ING-20251010-001"
        ├─→ Qty: 10 lbs Strawberry Puree
        ├─→ Exp Date: Oct 25, 2025
        ├─→ QA Checks: ✓
        └─→ Storage: Ingredient Vault - Shelf A1
        
   Firestore: ingredientLots/ing-001-lot-001
   {
     internalLotNumber: "ING-20251010-001",
     quantity: { amount: 10, unit: "lbs" },
     currentLocation: "Ingredient Vault - Shelf A1",
     status: "Released",
     usageHistory: []
   }


┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION WORKFLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

STAGE 1: REQUEST (Office)
──────────────────────────
  [MakeRequestModal - Request Mode]
  ├─→ Product: "Strawberry Slushies"
  ├─→ Packages requested: 50 × 16oz, 30 × 32oz
  ├─→ Calculated weight: 15.625 lbs
  ├─→ Desired machine: (optional)
  └─→ Creates BATCH with status: REQUESTED

  Firestore: batches/batch-001
  {
    id: "batch-001",
    status: "Requested",
    lotNumber: "PROD-20251016-143000",
    productId: "prod-001",
    request: {
      calculatedWeightLbs: 15.625,
      requestedPackages: [
        { packageId: "pkg-1", quantity: 50 },
        { packageId: "pkg-2", quantity: 30 }
      ]
    },
    ingredientConsumption: [],      ← Will be populated in STAGE 2
    movements: [],                   ← Will be populated in STAGE 2
    events: []                       ← Will be populated in STAGE 2
  }


STAGE 2: START PRODUCTION (Production Team)
────────────────────────────────────────────
  [MakeRequestModal - Start Mode]
  ├─→ Confirm/Select Machine: FD-01
  ├─→ Select Ingredient Lots:
  │   ├─→ Strawberry Puree:
  │   │   ├─→ Select: ING-20251010-001 (10 lbs, Exp: Oct 25)
  │   │   └─→ Use: 5.5 lbs  ← Partial use!
  │   └─→ Sugar:
  │       ├─→ Select: ING-20251010-002 (8 lbs, Exp: Oct 30)
  │       └─→ Use: 8.0 lbs  ← Full use!
  └─→ Submit

  ✅ ACTIONS TRIGGERED:
  
  1️⃣ Decrement ingredient lots:
     ingredientLots/ing-001-lot-001:
     {
       quantity: { amount: 10, unit: "lbs" },
       consumedAmount: 5.5,
       remainingAmount: 4.5,  ← Updated
       usageHistory: [{
         batchId: "batch-001",
         amountUsed: 5.5,
         timestamp: 1729086600000,
         machineId: "FD-01"
       }],
       currentLocation: "Machine FD-01"  ← Updated
     }
  
  2️⃣ Update batch with consumption:
     batches/batch-001:
     {
       status: "Make",
       lotNumber: "PROD-20251016-143000",
       ingredientConsumption: [
         {
           ingredientId: "ing-001",
           internalLotNumber: "ING-20251010-001",
           amountUsed: 5.5,
           unit: "lbs",
           machineUsed: "FD-01"
         },
         {
           ingredientId: "ing-002",
           internalLotNumber: "ING-20251010-002",
           amountUsed: 8.0,
           unit: "lbs",
           machineUsed: "FD-01"
         }
       ],
       movements: [{
         timestamp: 1729086600000,
         fromLocation: "Ingredient Vault",
         toLocation: "Machine FD-01",
         quantity: 80,  ← 80 units of final product
         notes: "Starting production"
       }],
       events: [{
         timestamp: 1729086600000,
         type: "STATUS_CHANGE",
         from: "Requested",
         to: "Make",
         actor: "user-prod-001"
       }]
     }
  
  🏭 PRODUCTION HAPPENS (off-system)
  └─→ Team freeze-dries, gets ~78 usable units (2 unit loss/spillage)


STAGE 3: MOVE TO PACKAGING
──────────────────────────
  [Manual location update or auto on status change]
  
  batches/batch-001 movements array updated:
  {
    movements: [
      ... previous entry ...,
      {
        timestamp: 1729087200000,  ← 10 mins later
        fromLocation: "Machine FD-01",
        toLocation: "Tray Racks - Packaging Area",
        quantity: 78,  ← Actual count (loss noted)
        notes: "Unloaded after 6hr freeze dry cycle"
      }
    ],
    currentLocation: "Tray Racks - Packaging Area",
    currentQuantity: 78,
    status: "Package"
  }


STAGE 4: FINAL COUNT & PACKAGING
────────────────────────────────
  [FinalCountModal]
  ├─→ Count actual retail packages:
  │   ├─→ 16oz: 48 units (planned 50, 2 units lost in processing)
  │   └─→ 32oz: 29 units (planned 30, 1 unit lost)
  └─→ Total: 77 retail packages

  batches/batch-001:
  {
    status: "Ready",
    finalCount: {
      countedPackages: [
        { packageId: "pkg-1", quantity: 48 },
        { packageId: "pkg-2", quantity: 29 }
      ],
      totalUnits: 77,
      timestamp: 1729087800000
    },
    movements: [
      ... previous entries ...,
      {
        timestamp: 1729087800000,
        fromLocation: "Packaging Table",
        toLocation: "Bucket Storage - Area C",
        quantity: 77,
        notes: "Final count complete, packaged in 4 buckets"
      }
    ],
    currentLocation: "Bucket Storage - Area C",
    saleByDate: 1730559600000,  ← Oct 25 + 45 day shelf life = Nov 10
    dateReady: 1729087800000
  }

  ✅ UPDATE PRODUCT INVENTORY:
  products/prod-001/containerInventory:
  [
    { templateId: "pkg-1", quantity: 48 },  ← Added to stock
    { templateId: "pkg-2", quantity: 29 }   ← Added to stock
  ]


STAGE 5: READY TO SHIP
──────────────────────
  ✅ BATCH NOW APPEARS IN LOT TRACKING DASHBOARD
  
  Lot Card shows:
  ┌─────────────────────────────────┐
  │ PROD-20251016-143000            │
  │ Strawberry Slushies             │
  │ Status: Ready to Ship ✓         │
  │ Qty: 48×16oz, 29×32oz           │
  │ Sale by: Nov 10, 2025           │
  │ Location: Bucket Storage - C    │
  │                                 │
  │ Ingredients used:               │
  │ • Strawberry Puree (5.5 lbs)   │
  │ • Sugar (8.0 lbs)              │
  │                                 │
  │ Timeline:                       │
  │ Oct 16, 14:30 - Production      │
  │ Oct 16, 14:55 - To Packaging   │
  │ Oct 16, 15:30 - Final Count    │
  │ Oct 16, 16:00 - Ready         │
  └─────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                          QUALITY & COMPLIANCE                               │
└─────────────────────────────────────────────────────────────────────────────┘

SCENARIO: Quality Issue Found (Day 5)
────────────────────────────────────
  [LotDetailModal] → Status: "Hold"
  
  batches/batch-001:
  {
    status: "Hold",
    flags: ["qa_hold"],
    qcNotes: "Batch shows crystallization in bucket 2",
    events: [
      ... previous entries ...,
      {
        timestamp: 1729347600000,  ← Oct 19, 10 days later
        type: "STATUS_CHANGE",
        from: "Ready",
        to: "Hold",
        actor: "user-qa-001",
        reason: "Crystallization detected in final product"
      }
    ]
  }
  
  ❌ CANNOT BE SHIPPED → Removed from lot tracking filters


SCENARIO: Recall Initiated
──────────────────────────
  [LotDetailModal] → Status: "Recalled", Flag: "recall"
  
  batches/batch-001:
  {
    status: "Recalled",
    flags: ["recall"],
    recallReason: "Supplier lot ING-20251010-001 recalled - possible contamination",
    events: [
      {
        timestamp: 1729434000000,
        type: "RECALL_INITIATED",
        actor: "user-mgmt-001",
        reason: "Contamination in supplier lot"
      }
    ]
  }
  
  🔍 TRACE BACK:
  ├─→ Batch used: ING-20251010-001 (Strawberry Puree)
  ├─→ Supplier lot: SUP-456789
  └─→ Can now search all OTHER batches that used SUP-456789!


┌─────────────────────────────────────────────────────────────────────────────┐
│                        INVENTORY SNAPSHOTS                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Ingredient Lot View (After Production):
────────────────────────────────────────
  ING-20251010-001 (Strawberry Puree)
  ├─→ Original: 10 lbs
  ├─→ Used in batch PROD-20251016-143000: 5.5 lbs
  ├─→ Remaining: 4.5 lbs
  ├─→ Location: Machine FD-01 (Freezer)
  ├─→ Status: Released (partially used)
  ├─→ Exp Date: Oct 25, 2025 (⚠️ EXPIRING IN 8 DAYS)
  └─→ Usage History:
      └─→ Oct 16, 14:30 - Used 5.5 lbs in PROD-20251016-143000


Product Inventory View (After Packaging):
──────────────────────────────────────────
  Strawberry Slushies
  ├─→ 16oz bottles: 48 units (from PROD-20251016-143000)
  │   └─→ In stock as of Oct 16, 16:00
  ├─→ 32oz bottles: 29 units (from PROD-20251016-143000)
  │   └─→ In stock as of Oct 16, 16:00
  ├─→ Total on hand: 77 units
  ├─→ Storage: Bucket Storage - Area C
  └─→ Status: Ready to Ship


Location View (Warehouse Management):
──────────────────────────────────────
  What's in each location right now?
  
  Machine FD-01:
  └─→ ING-20251010-001: 4.5 lbs remaining (thawing)
  
  Bucket Storage - Area C:
  ├─→ PROD-20251016-143000: 77 units (4 buckets)
  ├─→ PROD-20251016-142800: 120 units (6 buckets)
  └─→ PROD-20251016-142500: 95 units (5 buckets)
  
  Ingredient Vault - Shelf A1:
  ├─→ ING-20251010-003: 12 lbs (Exp: Oct 28)
  └─→ ING-20251010-004: 8 lbs (Exp: Nov 2)


┌─────────────────────────────────────────────────────────────────────────────┐
│                          REPORTING & COMPLIANCE                             │
└─────────────────────────────────────────────────────────────────────────────┘

Recall Report (Example):
──────────────────────
  "Supplier lot SUP-456789 recalled"
  
  ✓ Affected product batches:
  └─→ PROD-20251016-143000
      ├─→ Status: Recalled
      ├─→ Location: Bucket Storage - Area C
      ├─→ Quantity: 77 units (4 buckets)
      ├─→ Affected packages: 48×16oz, 29×32oz
      ├─→ Sale-by date: Nov 10, 2025
      ├─→ Shipped to customers: [Pending - need Whatnot data]
      └─→ Action: Isolate buckets, do not ship
  
  ✓ Event timeline:
  └─→ Oct 16, 14:30 - Ingredient lot received
      Oct 16, 14:45 - Used in production batch
      Oct 16, 16:00 - Batch ready to ship
      Oct 19, 10:00 - Recall initiated


Audit Trail (Example - 30 days of activity):
────────────────────────────────────────────
  Oct 16, 14:30 | Add | ING lot ING-20251010-001 | 10 lbs | user-123
  Oct 16, 14:45 | Update | Batch PROD-20251016-143000 | Status: Make | user-456
  Oct 16, 14:45 | Consume | ING-20251010-001 | 5.5 lbs used | user-456
  Oct 16, 14:55 | Move | Batch PROD-20251016-143000 | FD-01 → Packaging | user-789
  Oct 16, 16:00 | Finalize | Batch PROD-20251016-143000 | Count: 77 units | user-012
  Oct 16, 16:00 | Add Inventory | Strawberry Slushies | 48×16oz, 29×32oz | system
  Oct 19, 10:00 | Flag | Batch PROD-20251016-143000 | Recall | user-mgmt-001
  Oct 25, 00:00 | Alert | ING-20251010-001 | ⚠️ EXPIRES TODAY | system
  Oct 25, 14:30 | Update | ING-20251010-001 | Status: Depleted | user-456
  ...
```

---

## Key Metrics Captured

| Metric | Purpose | Where Stored |
|--------|---------|--------------|
| **Lot Number** | Identification | batch.lotNumber |
| **Production Date** | Age tracking | batch.dateStarted |
| **Shelf Life** | Expiration calculation | batch.shelfLifeDays |
| **Sale-by Date** | Customer expiration | batch.saleByDate |
| **Ingredient Links** | Traceability | batch.ingredientConsumption[] |
| **Location History** | Physical tracking | batch.movements[] |
| **Status Changes** | Workflow tracking | batch.events[] |
| **QC Notes** | Quality tracking | batch.qcNotes |
| **Recall Flags** | Compliance | batch.flags[] |

---

## Compliance Requirements Met

✅ **FDA 21 CFR Part 11** - Electronic records with audit trail
✅ **FSMA Traceability** - One-up/one-down supplier and customer links
✅ **HACCP** - Critical control points documented (QA, expiration, location)
✅ **SOC 2** - Access logs, change history, immutable records
✅ **Recall Speed** - Can trace all affected lots in seconds

---

This system enables you to answer compliance questions like:
- "What ingredient lots were in batch XYZ?"
- "Which batches used supplier lot SUP-456789?"
- "Where is batch XYZ right now?"
- "Who moved it and when?"
- "When does it expire?"
- "What's the complete audit trail?"

All in real-time on a tablet! 📱
