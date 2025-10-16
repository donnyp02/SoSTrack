import { useState, useEffect, useMemo } from 'react';
import './App.css';
import { db, auth } from './firebase';
import { collection, addDoc, doc, updateDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './contexts/AuthContext';
import { useDebounce } from './hooks/useDebounce';
import { useFirestoreCollection } from './hooks/useFirestoreCollection';
import { useBatchAutoComplete } from './hooks/useBatchAutoComplete';
import { useBatchNotifications } from './hooks/useBatchNotifications';
import { useConfirm } from './hooks/useConfirm';
import { SEARCH_DEBOUNCE_DELAY } from './constants/timings';
import Login from './components/Login';
import ProductListTab from './components/ProductListTab';
import ManagementModal from './components/ManagementModal';
import AddProductModal from './components/AddProductModal';
import MakeRequestModal from './components/MakeRequestModal';
import FinalCountModal from './components/FinalCountModal';
import VerificationModal from './components/VerificationModal';
import CategoryTemplateModal from './components/CategoryContainersModal'; // Renamed for clarity
import EditInventoryModal from './components/EditInventoryModal';
import InventoryModal from './components/InventoryModal';
import WhitelistManager from './components/WhitelistManager';
import Inventory from './components/Inventory';
import { InventoryProvider } from './contexts/InventoryContext';
import NotificationModal from './components/NotificationModal';
import ReportsModal from './components/ReportsModal';
import CsvImportPreviewModal from './components/CsvImportPreviewModal';
import ErrorBoundary from './components/ErrorBoundary';
import LotTrackingPanel from './components/LotTrackingPanel';
import IngredientIntakeModal from './components/IngredientIntakeModal';
import { FaCog, FaExclamationTriangle } from 'react-icons/fa';
import { combineFlavorName, stripContainerSuffix, normalizeString } from './utils/containerUtils';

function App() {
  const { user, loading: authLoading } = useAuth();
  const { showConfirm, ConfirmDialog } = useConfirm();

  // Use custom hooks for Firestore collections
  const { data: categories, loading: categoriesLoading } = useFirestoreCollection(db, 'categories', !!user);
  const { data: firestoreProducts, loading: productsLoading } = useFirestoreCollection(db, 'products', !!user);
  const { data: batches, loading: batchesLoading } = useFirestoreCollection(db, 'batches', !!user);
  const { data: ingredients, loading: ingredientsLoading } = useFirestoreCollection(db, 'ingredients', !!user);
  const { data: ingredientLots, loading: ingredientLotsLoading } = useFirestoreCollection(db, 'ingredientLots', !!user);

  // Keep products in state for InventoryProvider (which needs setProducts for optimistic updates)
  const [products, setProducts] = useState({});

  // Sync Firestore products to local state
  useEffect(() => {
    setProducts(firestoreProducts);
  }, [firestoreProducts]);

  const loading = categoriesLoading || productsLoading || batchesLoading || ingredientsLoading || ingredientLotsLoading;

  const [selectedProductId, setSelectedProductId] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [modalPayload, setModalPayload] = useState(null);
  const [tempFinalCount, setTempFinalCount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, SEARCH_DEBOUNCE_DELAY);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [activeTab, setActiveTab] = useState('Production');
  const [inventoryView, setInventoryView] = useState('catalog');
  const [selectedIngredientId, setSelectedIngredientId] = useState(null);
  const [intakeIngredientId, setIntakeIngredientId] = useState(null);
  const [isIngredientIntakeOpen, setIsIngredientIntakeOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [notification, setNotification] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [pendingCsvImport, setPendingCsvImport] = useState(null);

  // Use custom hooks for batch auto-complete and notifications
  useBatchAutoComplete(db, batches, loading);
  useBatchNotifications(batches, products, categories, activeTab, loading, setNotification);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const handleOpenModal = (modalName, payload = null) => {
    setModalPayload(payload);
    setActiveModal(modalName);
  };

  const handleCloseModal = () => {
    setModalPayload(null);
    setActiveModal(null);
    setProductToDelete(null);
  };

  const displayList = useMemo(() => {
    if (!products || !categories || !batches) return [];
    if (Object.keys(products).length === 0 || Object.keys(categories).length === 0) return [];

    let combined = Object.values(products || {}).map(product => {
      const category = categories[product.categoryId];
      const productBatches = Object.values(batches || {}).filter(b => b.productId === product.id);
      const sortedBatches = [...productBatches].sort((a,b) => (b.dateStarted?.toMillis() || 0) - (a.dateStarted?.toMillis() || 0));
      const statusSet = new Set(sortedBatches.map(b => b.status).filter(status => !!status));

      const packageOptions = (category?.containerTemplates || []).map(template => {
        const inventoryItem = (product.containerInventory || []).find(inv => inv.templateId === template.id);
        return { ...template, quantity: inventoryItem?.quantity || 0 };
      });

      const { totalOunces, totalUnits } = packageOptions.reduce(
        (totals, opt) => {
          const quantity = opt.quantity || 0;
          const weight = opt.weightOz || 0;
          totals.totalOunces += weight * quantity;
          totals.totalUnits += quantity;
          return totals;
        },
        { totalOunces: 0, totalUnits: 0 }
      );

      const topPriorityBatch = sortedBatches.find(b => b.status === 'Make') || sortedBatches.find(b => b.status === 'Package') || sortedBatches.find(b => b.status === 'Ready');
      const overallStatus = topPriorityBatch?.status || 'Idle';

      return {
        ...product,
        onHandOz: totalOunces,
        onHandUnits: totalUnits,
        batches: sortedBatches,
        status: overallStatus,
        packageOptions,
        statusHistory: Array.from(statusSet)
      };
    });

    if (selectedCategoryId) { combined = combined.filter(p => p.categoryId === selectedCategoryId); }
    if (debouncedSearchTerm) { combined = combined.filter(p => p.flavor.toLowerCase().includes(debouncedSearchTerm.toLowerCase())); }

    const priorityByTab = {
      Production: { Make: 1, Package: 2, Ready: 3, Idle: 4, Completed: 5 },
      Packaging: { Package: 1, Ready: 2, Make: 3, Idle: 4, Completed: 5 },
      Shipping: { Ready: 1, Package: 2, Make: 3, Idle: 4, Completed: 5 },
    };
    const defaultPriority = { Make: 1, Package: 2, Ready: 3, Idle: 4, Completed: 5 };
    const statusPriority = priorityByTab[activeTab] || defaultPriority;
    combined.sort((a, b) => {
      const getBestRank = (product) => {
        const statuses = Array.isArray(product.statusHistory) ? product.statusHistory : [];
        let best = statusPriority[product.status] ?? Infinity;
        statuses.forEach(status => {
          const rank = statusPriority[status];
          if (rank !== undefined && rank < best) {
            best = rank;
          }
        });
        return Number.isFinite(best) ? best : 99;
      };

      const priorityA = getBestRank(a);
      const priorityB = getBestRank(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
      const categoryNameA = categories[a.categoryId]?.name || '';
      const categoryNameB = categories[b.categoryId]?.name || '';
      if (categoryNameA !== categoryNameB) return categoryNameA.localeCompare(categoryNameB);
      return a.flavor.localeCompare(b.flavor);
    });
    return combined;
  }, [products, categories, batches, debouncedSearchTerm, selectedCategoryId, activeTab]);

  const tabCounts = useMemo(() => {
    const counts = { Make: 0, Package: 0, Ready: 0 };
    Object.values(batches || {}).forEach(batch => {
      if (batch.status === 'Make') counts.Make++;
      else if (batch.status === 'Package') counts.Package++;
      else if (batch.status === 'Ready') counts.Ready++;
    });
    return counts;
  }, [batches]);

  useEffect(() => {
    if (activeTab !== 'Inventory') {
      setInventoryView('catalog');
      setSelectedIngredientId(null);
    }
  }, [activeTab]);

  const lotTrackingData = useMemo(() => {
    if (!batches || !products || !categories) return [];

    const toDate = (value) => {
      if (!value) return null;
      if (value instanceof Date) return value;
      if (typeof value.toDate === 'function') return value.toDate();
      if (typeof value.toMillis === 'function') return new Date(value.toMillis());
      if (typeof value === 'number') return new Date(value);
      return null;
    };

    const defaultShelfLifeDays = 45;

    return Object.values(batches).map((batch) => {
      const product = products[batch.productId] || {};
      const category = categories[batch.categoryId] || {};

      const productionDate = toDate(batch.dateStarted);
      const readyDate = toDate(batch.dateReady);
      const saleByOverride = toDate(batch.saleByDate);
      const shelfLifeDays =
        batch.shelfLifeDays ??
        product.shelfLifeDays ??
        category.shelfLifeDays ??
        defaultShelfLifeDays;

      const targetDate = readyDate || productionDate;
      const saleBy =
        saleByOverride ||
        (targetDate ? new Date(targetDate.getTime() + shelfLifeDays * 24 * 60 * 60 * 1000) : null);

      let status = 'Pending';
      if (batch.status === 'Ready') status = 'Ready';
      else if (batch.status === 'Completed') status = 'Consumed';
      else if (batch.status === 'Hold') status = 'Hold';
      if (Array.isArray(batch.flags) && batch.flags.includes('recall')) {
        status = 'Recalled';
      }

      const countedPackages = batch.finalCount?.countedPackages || [];
      const quantityLabel = countedPackages.length
        ? countedPackages
            .map((pkg) => {
              const template =
                category.containerTemplates?.find((t) => t.id === pkg.packageId) ||
                (product.packageOptions || []).find((t) => t.id === pkg.packageId);
              const label = template?.name || template?.label || 'Package';
              return `${pkg.quantity} × ${label}`;
            })
            .join(', ')
        : batch.request?.calculatedWeightLbs
        ? `${batch.request.calculatedWeightLbs} lbs planned`
        : null;

      const ingredients =
        batch.ingredients ||
        product.ingredients ||
        category.ingredients ||
        (product.flavor ? [product.flavor] : []);

      const timeline = [
        productionDate && {
          date: productionDate.toLocaleDateString(),
          label: 'Production started',
          actor: 'Kitchen'
        },
        readyDate && {
          date: readyDate.toLocaleDateString(),
          label: 'Final count verified',
          actor: 'Packaging'
        },
        saleBy && {
          date: saleBy.toLocaleDateString(),
          label: 'Sale-by date',
          actor: 'Shelf life monitor'
        }
      ].filter(Boolean);

      const locations = batch.locations || batch.storageLocations || [];
      const primaryLocation =
        locations[0]?.name ||
        batch.primaryLocation ||
        batch.request?.targetLocation ||
        'Vault storage';

      const lastMovement =
        batch.statusSetAt && toDate(batch.statusSetAt)
          ? toDate(batch.statusSetAt).toLocaleDateString()
          : readyDate
          ? `${readyDate.toLocaleDateString()} (Ready)`
          : productionDate
          ? `${productionDate.toLocaleDateString()} (Started)`
          : null;

      return {
        id: batch.id,
        lotNumber:
          batch.lotNumber ||
          batch.lotId ||
          (batch.id ? `LOT-${batch.id.slice(-6).toUpperCase()}` : 'Unassigned'),
        productName: product.displayName || combineFlavorName(category?.name, product?.flavor || product?.name),
        categoryName: category?.name || 'Uncategorized',
        status,
        saleBy,
        quantityUnits: batch.finalCount?.totalUnits,
        quantityLabel,
        primaryLocation,
        locations: Array.isArray(locations)
          ? locations
          : [{ name: primaryLocation, quantity: batch.finalCount?.totalUnits }],
        ingredients,
        notes: batch.qcNotes || product.qcNotes,
        alert: batch.recallReason,
        timeline,
        lastMovement
      };
    });
  }, [batches, products, categories]);

  const ingredientDashboardData = useMemo(() => {
    if (!ingredients || !ingredientLots) {
      return { cards: [], lots: [] };
    }

    const toDate = (value) => {
      if (!value) return null;
      if (value instanceof Date) return value;
      if (typeof value.toDate === 'function') return value.toDate();
      if (typeof value.toMillis === 'function') return new Date(value.toMillis());
      if (typeof value === 'number') return new Date(value);
      if (typeof value === 'string') {
        const maybeDate = new Date(value);
        return Number.isNaN(maybeDate.getTime()) ? null : maybeDate;
      }
      return null;
    };

    const normalizeLots = Object.values(ingredientLots).map((lot) => {
      const quantityObj = lot.quantity || {};
      const amount = Number(quantityObj.amount ?? lot.quantityAmount ?? 0);
      const unit = quantityObj.unit || lot.quantityUnit || lot.defaultUnit || 'units';
      const expirationDate = toDate(lot.expirationDate || lot.bestBy || lot.saleByDate);
      const intakeDate = toDate(lot.intakeDate || lot.receivedAt || lot.createdAt);

      return {
        ...lot,
        amount: Number.isFinite(amount) ? amount : 0,
        unit,
        expirationDate,
        intakeDate,
        status: lot.status || 'Pending QA',
        supplierName: lot.supplier?.name || lot.supplierName || 'Unknown supplier'
      };
    });

    const cards = Object.values(ingredients).map((ingredient) => {
      const relevantLots = normalizeLots.filter((lot) => lot.ingredientId === ingredient.id);
      const activeLots = relevantLots.filter((lot) => lot.status !== 'Depleted');
      const onHandAmount = activeLots.reduce((sum, lot) => sum + (lot.amount || 0), 0);
      const defaultUnit = ingredient.defaultUnit || activeLots[0]?.unit || 'units';

      const soonBoundary = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const expiringSoon = activeLots.filter(
        (lot) => lot.expirationDate && lot.expirationDate <= soonBoundary
      ).length;

      const onHold = activeLots.filter((lot) => lot.status === 'Quarantined' || lot.status === 'On Hold').length;

      const nextExpiration = activeLots
        .filter((lot) => lot.expirationDate)
        .map((lot) => lot.expirationDate)
        .sort((a, b) => a - b)[0];

      return {
        id: ingredient.id,
        name: ingredient.name,
        category: ingredient.category || 'Uncategorized',
        onHandLabel: `${onHandAmount.toFixed(onHandAmount % 1 === 0 ? 0 : 1)} ${defaultUnit}`,
        totalLots: relevantLots.length,
        expiringSoon,
        onHold,
        nextExpiration,
        allergenFlags: ingredient.allergenFlags || [],
        preferredVendors: ingredient.supplierPrefs || []
      };
    });

    cards.sort((a, b) => a.name.localeCompare(b.name));

    normalizeLots.sort((a, b) => {
      const dateA = a.expirationDate ? a.expirationDate.getTime() : Infinity;
      const dateB = b.expirationDate ? b.expirationDate.getTime() : Infinity;
      if (dateA !== dateB) return dateA - dateB;
      return (a.intakeDate?.getTime() || 0) - (b.intakeDate?.getTime() || 0);
    });

    return { cards, lots: normalizeLots };
  }, [ingredients, ingredientLots]);

  const visibleIngredientLots = useMemo(() => {
    const lots = ingredientDashboardData.lots || [];
    if (!selectedIngredientId) return lots;
    return lots.filter((lot) => lot.ingredientId === selectedIngredientId);
  }, [ingredientDashboardData, selectedIngredientId]);

  const selectedIngredient = useMemo(() => {
    if (!selectedIngredientId || !ingredients) return null;
    return ingredients[selectedIngredientId] || null;
  }, [selectedIngredientId, ingredients]);

  const handleDataUpdate = async (newStatus, data = null, batchId = null, options = {}) => {
    const product = products[selectedProductId];
    try {
      if (newStatus === 'Make') {
        await addDoc(collection(db, "batches"), { productId: product.id, categoryId: product.categoryId, status: 'Make', dateStarted: serverTimestamp(), request: data });
      } else if (batchId && newStatus === 'Package') {
        await updateDoc(doc(db, "batches", batchId), { status: 'Package', statusSetAt: serverTimestamp() });
      } else if (batchId && newStatus === 'Ready' && data) {
        const newInventory = [...(product.containerInventory || [])];
        
        data.countedPackages.forEach(pkg => {
          const inventoryIndex = newInventory.findIndex(inv => inv.templateId === pkg.packageId);
          const quantityProduced = parseInt(pkg.quantity, 10);

          if (inventoryIndex > -1 && !isNaN(quantityProduced) && quantityProduced > 0) {
            newInventory[inventoryIndex].quantity += quantityProduced;
          } else if (inventoryIndex === -1 && !isNaN(quantityProduced) && quantityProduced > 0) {
            newInventory.push({ templateId: pkg.packageId, quantity: quantityProduced });
          }
        });

        const batch = writeBatch(db);
        batch.update(doc(db, "batches", batchId), { status: 'Ready', finalCount: data, dateReady: serverTimestamp(), request: null });
        batch.update(doc(db, "products", product.id), { containerInventory: newInventory });
        await batch.commit();
      } else if (batchId && newStatus === 'Completed') {
        await updateDoc(doc(db, "batches", batchId), { status: 'Completed', statusSetAt: serverTimestamp() });
      }
      if (!options.keepOpen) {
        handleCloseModal();
      }
      toast.success('Status updated successfully');
    } catch (error) {
      console.error("Error updating status: ", error);
      toast.error(`Failed to update status: ${error.message || 'Please try again'}`);
    }
  };

  const handleDeleteBatches = async (batchIds) => {
    const confirmed = await showConfirm({
      title: 'Delete Batches?',
      message: `Are you sure you want to delete ${batchIds.length} batch record(s)? This cannot be undone.`,
      confirmText: 'Delete',
      confirmColor: 'red',
      icon: <FaExclamationTriangle />
    });

    if (!confirmed) return;

    try {
      const batch = writeBatch(db);
      batchIds.forEach(id => {
        batch.delete(doc(db, "batches", id));
      });
      await batch.commit();
      toast.success(`Deleted ${batchIds.length} batch(es)`);
    } catch (error) {
      console.error("Error deleting batches:", error);
      toast.error(`Failed to delete batches: ${error.message || 'Unknown error'}`);
    }
  };

  const handleIngredientIntakeClose = () => {
    setIsIngredientIntakeOpen(false);
    setIntakeIngredientId(null);
  };

  const handleIngredientIntakeSubmit = async (payload) => {
    try {
      // If creating a new ingredient, add it first
      let ingredientId = payload.ingredientId;
      let ingredientName = payload.ingredient?.name || '';

      if (payload.creatingIngredient && payload.ingredientDraft?.name) {
        const newIngredientDoc = await addDoc(collection(db, "ingredients"), {
          name: payload.ingredientDraft.name,
          category: payload.ingredientDraft.category || 'Candy',
          defaultUnit: payload.ingredientDraft.defaultUnit || 'lbs',
          createdAt: serverTimestamp()
        });
        ingredientId = newIngredientDoc.id;
        ingredientName = payload.ingredientDraft.name;
      } else if (payload.ingredient) {
        ingredientName = payload.ingredient.name;
      }

      // Create the ingredient lot document
      const lotData = {
        // Ingredient reference
        ingredientId: ingredientId,
        ingredientName: ingredientName,

        // Supplier info
        supplierName: payload.supplier?.name || '',
        supplierContact: payload.supplier?.contact || '',
        supplierOrderRef: payload.supplier?.orderRef || '',
        supplierLotNumber: payload.supplierLotNumber || '',

        // Internal tracking
        internalLotNumber: payload.internalLotNumber || '',

        // Quantity
        quantity: {
          amount: parseFloat(payload.quantity?.amount) || 0,
          unit: payload.quantity?.unit || 'lbs',
          originalAmount: payload.quantity?.originalAmount || '',
          remaining: parseFloat(payload.quantity?.amount) || 0 // Start with full amount
        },

        // Costs
        cost: {
          total: parseFloat(payload.cost?.total) || 0,
          perUnit: parseFloat(payload.cost?.perUnit) || 0
        },

        // Dates
        intakeDate: payload.intakeDate || serverTimestamp(),
        expirationDate: payload.expirationDate || null,

        // Storage
        storageLocation: {
          area: payload.storageLocation?.area || '',
          bin: payload.storageLocation?.bin || ''
        },

        // QA
        qaChecks: payload.qaChecks || {
          tempOk: false,
          packagingIntact: false,
          coaReceived: false
        },
        coaUrl: payload.coaUrl || '',

        // Status
        status: payload.status || 'Pending QA',
        notes: payload.notes || '',

        // Metadata
        createdAt: serverTimestamp(),
        createdBy: user?.email || 'unknown',
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, "ingredientLots"), lotData);

      toast.success(`Ingredient lot ${payload.internalLotNumber} logged successfully!`);
      handleIngredientIntakeClose();
    } catch (error) {
      console.error('Error saving ingredient intake:', error);
      toast.error(`Failed to save ingredient intake: ${error.message || 'Unknown error'}`);
    }
  };

  const handleProductEdit = async ({ category: categoryName, flavor, categorySku, flavorSku, selectedContainers }) => {
    const product = products[selectedProductId];
    if (!product) {
      toast.error('Unable to locate product for editing');
      return;
    }

    const norm = (s) => (s || '').toString().trim().toLowerCase();
    const base = (s) => {
      const normalized = norm(s);
      return normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
    };

    const trimmedCategoryName = (categoryName || '').trim();
    const normalizedSku = (categorySku || '').toUpperCase().trim();
    const trimmedFlavor = (flavor || '').trim();
    const trimmedFlavorSku = (flavorSku || '').trim();

    let category = Object.values(categories || {}).find(
      (cat) => base(cat?.name) === base(trimmedCategoryName)
    );
    let categoryId = category?.id;

    if (!categoryId) {
      const newCategoryDoc = await addDoc(collection(db, "categories"), {
        name: trimmedCategoryName,
        sku: normalizedSku,
        containerTemplates: []
      });
      categoryId = newCategoryDoc.id;
    } else {
      const updates = {};
      if (normalizedSku && (category.sku || '').toUpperCase() !== normalizedSku) {
        updates.sku = normalizedSku;
      }
      if (trimmedCategoryName && (category.name || '').trim() !== trimmedCategoryName) {
        updates.name = trimmedCategoryName;
      }
      if (Object.keys(updates).length) {
        await updateDoc(doc(db, "categories", categoryId), updates);
      }
    }

    const productUpdates = {
      flavor: trimmedFlavor,
      categoryId,
      flavorSku: trimmedFlavorSku
    };
    if (selectedContainers !== undefined) {
      productUpdates.selectedContainers = selectedContainers;
    }
    await updateDoc(doc(db, "products", product.id), productUpdates);
    toast.success('Product updated');
    handleOpenModal('manageProduct');
  };
  
  const handleTemplateSave = async (payload) => {
    const newTemplates = Array.isArray(payload) ? payload : payload?.templates || [];
    const selectedTemplateId = Array.isArray(payload) ? null : payload?.selectedTemplateId || null;

    const product = products[selectedProductId];
    const category = product ? categories[product.categoryId] : null;
    const previousTemplates = category?.containerTemplates || [];

    if (!category) {
      toast.error('Failed to locate category for container update');
      return;
    }

    const categoryDocRef = doc(db, "categories", category.id);
    try {
      await updateDoc(categoryDocRef, { containerTemplates: newTemplates });
      toast.success('Container templates updated');
    } catch (error) {
      console.error("Error updating templates:", error);
      toast.error('Failed to update templates');
    }

    if (product) {
      const previousSelection = Array.isArray(product.selectedContainers) ? product.selectedContainers[0] : null;
      const strippedFlavor = normalizeString(
        stripContainerSuffix(product.flavor, previousTemplates, previousSelection)
      );

      let nextSelection = null;
      if (selectedTemplateId && newTemplates.some((template) => template?.id === selectedTemplateId)) {
        nextSelection = selectedTemplateId;
      } else if (previousSelection && newTemplates.some((template) => template?.id === previousSelection)) {
        nextSelection = previousSelection;
      } else if (newTemplates.length > 0) {
        nextSelection = newTemplates[0].id;
      }

      const updates = {};
      if (nextSelection) {
        const selectedTemplate = newTemplates.find((template) => template?.id === nextSelection);
        const combinedFlavor = normalizeString(
          combineFlavorName(strippedFlavor, selectedTemplate?.name)
        );
        if (normalizeString(product.flavor) !== combinedFlavor) {
          updates.flavor = combinedFlavor;
        }
        if (!previousSelection || previousSelection !== nextSelection) {
          updates.selectedContainers = [nextSelection];
        }
      } else {
        if (previousSelection) {
          updates.selectedContainers = [];
        }
        if (normalizeString(product.flavor) !== strippedFlavor) {
          updates.flavor = strippedFlavor;
        }
      }

      if (Object.keys(updates).length > 0) {
        try {
          await updateDoc(doc(db, "products", product.id), updates);
        } catch (error) {
          console.error("Error updating product with container selection:", error);
          toast.error('Failed to update product container selection');
        }
      }
    }

    handleOpenModal('manageProduct');
  };

  const handleInventorySave = async (newInventory) => {
    const product = products[selectedProductId];
    const productDocRef = doc(db, "products", product.id);
    try {
      await updateDoc(productDocRef, { containerInventory: newInventory });
      toast.success('Inventory updated');
    } catch (error) {
      console.error("Error updating inventory:", error);
      toast.error('Failed to update inventory');
    }
    handleOpenModal('manageProduct');
  };

  const handleManualInventorySave = async (updatedInventory) => {
    const batch = writeBatch(db);
    Object.values(updatedInventory || {}).forEach(product => {
      const productDocRef = doc(db, "products", product.id);
      const newContainerInventory = product.packageOptions.map(opt => ({ templateId: opt.id, quantity: opt.quantity }));
      batch.update(productDocRef, { containerInventory: newContainerInventory });

      const historyRef = doc(collection(db, 'inventory_history'));
      batch.set(historyRef, {
        productId: product.id,
        productName: `${categories[product.categoryId]?.name} ${product.flavor}`,
        change: 'Manual Edit',
        details: newContainerInventory,
        timestamp: serverTimestamp(),
      });
    });
    try {
      await batch.commit();
      toast.success('Inventory saved successfully');
    } catch (error) {
      console.error("Error saving manual inventory: ", error);
      toast.error('Failed to save inventory');
    }
  };

  const handleConfirmProductDelete = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    let deleted = false;
    try {
      const { id: productId } = productToDelete;
      const batch = writeBatch(db);
      batch.delete(doc(db, 'products', productId));
      const relatedBatches = Object.values(batches || {}).filter(b => b.productId === productId);
      relatedBatches.forEach(b => batch.delete(doc(db, 'batches', b.id)));
      await batch.commit();
      toast.success('Product deleted');
      deleted = true;
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    } finally {
      setIsDeletingProduct(false);
      setProductToDelete(null);
      if (deleted) {
        handleCloseModal();
        setSelectedProductId(null);
      }
    }
  };

  const handleCancelProductDelete = () => {
    if (isDeletingProduct) return;
    setProductToDelete(null);
  };

  const handleAddProduct = async ({ category: categoryName, flavor, categorySku, flavorSku, selectedContainers = [] }) => {
    const norm = (s) => (s || '').toString().trim().toLowerCase();
    const base = (s) => {
      const n = norm(s);
      return n.endsWith('s') ? n.slice(0, -1) : n;
    };
    const existing = Object.values(categories || {}).find(cat => base(cat.name) === base(categoryName));
    let categoryId = existing?.id;
    const catSku = (categorySku || '').toUpperCase().trim();
    if (!categoryId) {
      const newCategoryDoc = await addDoc(collection(db, "categories"), { name: categoryName, sku: catSku, containerTemplates: [] });
      categoryId = newCategoryDoc.id;
    } else {
      const updates = {};
      if (catSku && (existing.sku || '') !== catSku) updates.sku = catSku;
      if (existing.name !== categoryName && categoryName) updates.name = categoryName;
      if (Object.keys(updates).length) {
        await updateDoc(doc(db, "categories", categoryId), updates);
      }
    }
    await addDoc(collection(db, "products"), { categoryId: categoryId, flavor: flavor, flavorSku: flavorSku, containerInventory: [], selectedContainers: selectedContainers });
    handleCloseModal();
    toast.success('Product added successfully');
  };

  // Show CSV import preview before confirming
  const handleImportPreview = (payload) => {
    setPendingCsvImport(payload);
    setActiveModal('csvImportPreview');
  };

  // Actually perform the import after user confirms
  const handleImportConfirm = async () => {
    if (!pendingCsvImport) return;

    const rows = Array.isArray(pendingCsvImport) ? pendingCsvImport : pendingCsvImport?.rows || [];
    const fileInfo = Array.isArray(pendingCsvImport) ? null : pendingCsvImport?.file || null;
    const batch = writeBatch(db);
    let fileRefId = null;

    if (fileInfo?.text) {
      try {
        const fileDocRef = await addDoc(collection(db, 'csv_imports'), {
          name: fileInfo.name || 'upload.csv',
          content: fileInfo.text,
          timestamp: serverTimestamp(),
        });
        fileRefId = fileDocRef.id;
      } catch (e) {
        console.error('Failed to store CSV file', e);
      }
    }

    for (const row of rows) {
      if (row.assignedProduct) {
        const product = Object.values(products || {}).find(p => p.id === row.assignedProduct);
        if (product) {
          const category = categories[product.categoryId];
          let container = null;
          if (row.assignedContainerId) {
            container = (category?.containerTemplates || []).find(ct => ct.id === row.assignedContainerId);
          }
          if (!container) {
            const skuTail = (row.sku || '').toString().split('-').pop();
            container = (category?.containerTemplates || []).find(ct => ct.sku === skuTail);
          }
          if (container) {
            const newInventory = [...(product.containerInventory || [])];
            const inventoryIndex = newInventory.findIndex(inv => inv.templateId === container.id);
            const quantity = parseInt(row['product quantity'], 10);

            if (inventoryIndex > -1) {
              newInventory[inventoryIndex].quantity -= quantity;
            } else {
              console.warn(`Product ${product.flavor} with container ${container.name} not found in inventory.`);
            }
            batch.update(doc(db, "products", product.id), { containerInventory: newInventory });

            const historyRef = doc(collection(db, 'inventory_history'));
            batch.set(historyRef, {
              productId: product.id,
              productName: `${category?.name} ${product.flavor}`,
              change: 'CSV Import',
              details: row,
              timestamp: serverTimestamp(),
              fileId: fileRefId || null,
            });
          }
        }
      }
    }

    try {
      await batch.commit();
      toast.success(`Imported ${rows.length} items successfully`);
      setPendingCsvImport(null);
      setActiveModal(null);
    } catch (error) {
      console.error("Error importing data: ", error);
      toast.error(`Failed to import data: ${error.message || 'Unknown error'}`);
    }
  };

  const selectedProduct = displayList.find(p => p.id === selectedProductId);
  const selectedCategory = selectedProduct ? categories[selectedProduct.categoryId] : null;

  const closeModalAndProduct = () => {
    handleCloseModal();
    setSelectedProductId(null);
  };

  // ========= Added glue for the new Edit modal =========
  // Go back to the manage-product view when Edit modal closes
  const closeEdit = () => handleOpenModal('manageProduct');

  // Reuse existing inventory save logic for Edit modal
  const handleEditSave = async (newInventory) => {
    await handleInventorySave(newInventory);
  };

  // Let Edit modal open the containers modal already in your app
  const openContainers = () => {
    handleOpenModal('containers');
  };
  // =====================================================

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="App loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading SoSTrack...</p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <Login />;
  }

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
  };

  return (
    <ErrorBoundary>
    <InventoryProvider products={products} setProducts={setProducts}>
    <>
    <ConfirmDialog />
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      limit={3}
    />
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1>SoSTrack</h1>
            <button
              className="settings-cog-btn"
              onClick={() => setActiveModal('settings')}
              title="Settings"
            >
              <FaCog aria-hidden="true" />
              <span className="sr-only">Open settings</span>
            </button>
          </div>
          <div className="user-menu">
            <div className="user-info">
              {user.photoURL && (
                <img src={user.photoURL} alt="User" className="user-avatar" />
              )}
              <span>{user.displayName || user.email}</span>
            </div>
            <button
              className="dark-mode-toggle"
              onClick={toggleDarkMode}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button className="logout-btn" onClick={async () => {
              try {
                await auth.signOut();
                toast.info('Signed out successfully');
              } catch (error) {
                toast.error('Failed to sign out');
              }
            }}>
              Logout
            </button>
          </div>
        </div>
      </header>
      <nav className={`tab-navigation ${activeTab === 'Inventory' ? 'tight' : ''}`}>
        <button className={`tab-button ${activeTab === 'Production' ? 'active' : ''}`} onClick={() => setActiveTab('Production')}>
          Production
          {tabCounts.Make > 0 && <span className="tab-badge make">{tabCounts.Make}</span>}
        </button>
        <button className={`tab-button ${activeTab === 'Packaging' ? 'active' : ''}`} onClick={() => setActiveTab('Packaging')}>
          Packaging
          {tabCounts.Package > 0 && <span className="tab-badge package">{tabCounts.Package}</span>}
        </button>
        <button className={`tab-button ${activeTab === 'Inventory' ? 'active' : ''}`} onClick={() => setActiveTab('Inventory')}>Inventory</button>
      </nav>
      <main>
        {(activeTab === 'Production' || activeTab === 'Packaging' || activeTab === 'Shipping') && (
          <ProductListTab
            displayList={displayList}
            categories={categories}
            loading={loading}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
            onProductClick={(productId) => {
              setSelectedProductId(productId);
              setActiveModal('manageProduct');
            }}
          />
        )}
        {activeTab === 'Inventory' && (
          <>
            <div className="inventory-sub-nav">
              <button
                className={inventoryView === 'catalog' ? 'active' : ''}
                onClick={() => setInventoryView('catalog')}
              >
                Inventory Overview
              </button>
              <button
                className={inventoryView === 'lotTracking' ? 'active' : ''}
                onClick={() => setInventoryView('lotTracking')}
              >
                Lot Tracking
              </button>
              <button
                className={inventoryView === 'ingredients' ? 'active' : ''}
                onClick={() => setInventoryView('ingredients')}
              >
                Ingredients
              </button>
            </div>

            {inventoryView === 'catalog' && (
              <ProductListTab
                displayList={displayList}
                categories={categories}
                loading={loading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedCategoryId={selectedCategoryId}
                setSelectedCategoryId={setSelectedCategoryId}
                onProductClick={(productId) => {
                  setSelectedProductId(productId);
                  setActiveModal('inventoryManage');
                }}
                showImportButton={true}
                showReportsButton={true}
                onImportClick={() => setActiveModal('importCsvPanel')}
                onReportsClick={() => setActiveModal('reports')}
              />
            )}

            {inventoryView === 'lotTracking' && (
              <LotTrackingPanel
                lots={lotTrackingData}
                loading={loading}
                onInspectLot={(lot) => {
                  console.debug('Inspect lot', lot?.lotNumber);
                }}
              />
            )}

            {inventoryView === 'ingredients' && (
              <div className="ingredient-dashboard">
                <div className="ingredient-toolbar">
                  <div className="ingredient-toolbar-left">
                    <h2>Ingredient Inventory</h2>
                    {selectedIngredient && (
                      <p className="ingredient-subtitle">
                        Viewing lots for <strong>{selectedIngredient.name}</strong>
                      </p>
                    )}
                  </div>
                  <div className="ingredient-toolbar-actions">
                    {selectedIngredientId && (
                      <button
                        className="btn-text"
                        onClick={() => setSelectedIngredientId(null)}
                      >
                        Clear filter
                      </button>
                    )}
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setIntakeIngredientId(selectedIngredientId);
                        setIsIngredientIntakeOpen(true);
                      }}
                    >
                      + Log Intake
                    </button>
                  </div>
                </div>

                <div className="ingredient-card-grid">
                  {ingredientDashboardData.cards.length === 0 && (
                    <div className="empty-state">
                      <p>No ingredients tracked yet. Log an intake to get started.</p>
                    </div>
                  )}

                  {ingredientDashboardData.cards.map((card) => {
                    const isActive = selectedIngredientId === card.id;
                    return (
                      <button
                        key={card.id}
                        className={`ingredient-card ${isActive ? 'active' : ''}`}
                        onClick={() => setSelectedIngredientId(isActive ? null : card.id)}
                      >
                        <header>
                          <span className="ingredient-category">{card.category}</span>
                          <h3>{card.name}</h3>
                        </header>
                        <dl>
                          <div>
                            <dt>On hand</dt>
                            <dd>{card.onHandLabel}</dd>
                          </div>
                          <div>
                            <dt>Total lots</dt>
                            <dd>{card.totalLots}</dd>
                          </div>
                          <div>
                            <dt>Expiring soon</dt>
                            <dd>{card.expiringSoon}</dd>
                          </div>
                          <div>
                            <dt>On hold</dt>
                            <dd>{card.onHold}</dd>
                          </div>
                        </dl>
                        {card.nextExpiration && (
                          <footer>
                            <span>Next expiration</span>
                            <strong>{card.nextExpiration.toLocaleDateString()}</strong>
                          </footer>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="ingredient-lot-table">
                  <div className="table-head">
                    <span>Lot</span>
                    <span>Ingredient</span>
                    <span>Supplier</span>
                    <span>Received</span>
                    <span>Expires</span>
                    <span>Status</span>
                    <span>Quantity</span>
                    <span>Storage</span>
                  </div>
                  <div className="table-body">
                    {visibleIngredientLots.length === 0 ? (
                      <div className="table-row placeholder">
                        <span>No intake lots logged yet{selectedIngredient ? ` for ${selectedIngredient.name}` : ''}.</span>
                      </div>
                    ) : (
                      visibleIngredientLots.map((lot) => (
                        <div key={lot.id} className="table-row">
                          <span>
                            <strong>{lot.internalLotNumber || lot.id}</strong>
                            {lot.supplierLotNumber && <small>Supplier lot {lot.supplierLotNumber}</small>}
                          </span>
                          <span>
                            {ingredients?.[lot.ingredientId]?.name || 'Unknown ingredient'}
                            <small>{ingredients?.[lot.ingredientId]?.category || '—'}</small>
                          </span>
                          <span>{lot.supplierName}</span>
                          <span>{lot.intakeDate ? lot.intakeDate.toLocaleDateString() : '—'}</span>
                          <span>{lot.expirationDate ? lot.expirationDate.toLocaleDateString() : '—'}</span>
                          <span>
                            <span className={`status-pill ingredient ${lot.status.toLowerCase().replace(/\s+/g, '-')}`}>
                              {lot.status}
                            </span>
                          </span>
                          <span>
                            {lot.amount ? `${lot.amount}${lot.unit ? ` ${lot.unit}` : ''}` : '—'}
                          </span>
                          <span>{lot.storageLocation?.name || lot.storageLocation?.bin || lot.storageLocation || '—'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      
      {isIngredientIntakeOpen && (
        <IngredientIntakeModal
          isOpen={isIngredientIntakeOpen}
          onClose={handleIngredientIntakeClose}
          onSubmit={handleIngredientIntakeSubmit}
          ingredients={ingredients}
          defaultIngredientId={intakeIngredientId}
        />
      )}

      {activeModal === 'manageProduct' && selectedProduct && (
        <ManagementModal
          product={selectedProduct}
          category={selectedCategory}
          onClose={closeModalAndProduct}
          onUpdate={handleDataUpdate}
          onDeleteBatches={handleDeleteBatches}
          onOpenModal={handleOpenModal}
        />
      )}
      {activeModal === 'inventoryManage' && selectedProduct && (
        <InventoryModal
          product={selectedProduct}
          category={selectedCategory}
          onDeleteProduct={() => setProductToDelete(selectedProduct)}
          onPersistProduct={async (productId) => {
            try {
              const inv = (products[productId]?.containerInventory) || [];
              await updateDoc(doc(db, 'products', productId), { containerInventory: inv });
              toast.success('Product inventory persisted');
            } catch (error) {
              console.error('Error persisting product:', error);
              toast.error('Failed to persist product');
            }
          }}
          onSaveThresholds={async (categoryId, rows) => {
            try {
              const cat = categories[categoryId];
              const templates = [...(cat?.containerTemplates || cat?.packageOptions || [])];
              const map = new Map(rows.map(r => [r.id, r.minQty]));
              const merged = templates.map(t => ({ ...t, minQty: map.has(t.id) ? map.get(t.id) : (t.minQty || 0) }));
              await updateDoc(doc(db, 'categories', categoryId), { containerTemplates: merged, packageOptions: merged });
              toast.success('Thresholds updated');
            } catch (e) {
              console.error('Failed saving thresholds', e);
              toast.error('Failed to save thresholds');
            }
          }}
          onClose={() => { setActiveModal(null); }}
        />
      )}
      {activeModal === 'importCsvPanel' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h2>Import WhatNot CSV</h2>
              <button className="close-button" onClick={() => setActiveModal(null)}>Ã—</button>
            </div>
            <div className="modal-body">
              <Inventory
                onImport={handleImportPreview}
                products={products}
                categories={(categories || {})}
                onAddProduct={handleAddProduct}
                onInventorySave={handleManualInventorySave}
              />
            </div>
          </div>
        </div>
      )}
      {activeModal === 'makeRequest' && ( <MakeRequestModal product={selectedProduct} ingredients={ingredients} ingredientLots={ingredientLots} onClose={() => handleOpenModal('manageProduct')} onSubmit={(data) => handleDataUpdate('Make', data)} /> )}
      {activeModal === 'finalCount' && ( <FinalCountModal product={selectedProduct} batch={modalPayload} onClose={() => handleOpenModal('manageProduct')} onSubmit={(data) => { setTempFinalCount(data); handleOpenModal('verify', modalPayload); }} /> )}
      {activeModal === 'verify' && ( <VerificationModal product={selectedProduct} batch={modalPayload} finalCountData={tempFinalCount} onClose={() => handleOpenModal('finalCount', modalPayload)} onVerify={() => handleDataUpdate('Ready', tempFinalCount, modalPayload.id)} /> )}
      {activeModal === 'containers' && ( <CategoryTemplateModal category={selectedCategory} onClose={() => handleOpenModal('manageProduct')} onSave={handleTemplateSave} /> )}
      {activeModal === 'editInventory' && ( 
        <EditInventoryModal
          product={selectedProduct}
          onSave={handleEditSave}
          onClose={closeEdit}
          categories={(categories || {})}
          selectedCategory={selectedCategory}
          onManageContainers={openContainers}
        />
      )}
      {activeModal === 'editProduct' && ( <AddProductModal categories={(categories || {})} products={products} canDeleteCategory={activeTab === 'Inventory'} onClose={() => handleOpenModal('manageProduct')} onSubmit={handleProductEdit} productToEdit={selectedProduct} categoryToEdit={selectedCategory}/>)}

      <button className="add-product-btn" onClick={() => handleOpenModal('addProduct') }>+</button>
      {activeModal === 'addProduct' && ( <AddProductModal categories={(categories || {})} products={products} canDeleteCategory={activeTab === 'Inventory'} onClose={closeModalAndProduct} onSubmit={handleAddProduct} /> )}

      {notification && (
        <NotificationModal
          message={notification}
          onClose={() => setNotification(null)}
        />
      )}
      {activeModal === 'reports' && (
        <ReportsModal
          products={products}
          categories={categories}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'settings' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="close-button" onClick={() => setActiveModal(null)}>Ã—</button>
            </div>
            <div className="modal-body">
              <WhitelistManager />
            </div>
          </div>
        </div>
      )}

      {activeModal === 'csvImportPreview' && pendingCsvImport && (
        <CsvImportPreviewModal
          rows={Array.isArray(pendingCsvImport) ? pendingCsvImport : pendingCsvImport?.rows || []}
          products={products}
          categories={categories}
          onConfirm={handleImportConfirm}
          onCancel={() => {
            setPendingCsvImport(null);
            setActiveModal('importCsvPanel');
          }}
        />
      )}

      {productToDelete && (
        <div className="modal-backdrop" onClick={handleCancelProductDelete}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Product</h3>
              <button className="close-button" onClick={handleCancelProductDelete}>&times;</button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete{' '}
                <strong>
                  {`${categories[productToDelete.categoryId]?.name || 'Unknown Category'} ${productToDelete.flavor || ''}`.trim()}
                </strong>
                ? This will also remove any associated batches.
              </p>
            </div>
            <div className="modal-footer confirm-actions">
              <button className="cancel-btn" onClick={handleCancelProductDelete} disabled={isDeletingProduct}>Cancel</button>
              <button className="delete-btn" onClick={handleConfirmProductDelete} disabled={isDeletingProduct}>
                {isDeletingProduct ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
    </InventoryProvider>
    </ErrorBoundary>
  );
}

export default App;
