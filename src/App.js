import { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import { db, auth } from './firebase';
import { collection, addDoc, doc, updateDoc, writeBatch, serverTimestamp, onSnapshot } from "firebase/firestore";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './contexts/AuthContext';
import { useDebounce } from './hooks/useDebounce';
import Login from './components/Login';
import ProductCard from './components/ProductCard';
import ManagementModal from './components/ManagementModal';
import AddProductModal from './components/AddProductModal';
import MakeRequestModal from './components/MakeRequestModal';
import FinalCountModal from './components/FinalCountModal';
import VerificationModal from './components/VerificationModal';
import CategoryTemplateModal from './components/CategoryContainersModal'; // Renamed for clarity
import EditInventoryModal from './components/EditInventoryModal';
import ErrorBoundary from './components/ErrorBoundary';
import InventoryModal from './components/InventoryModal';
import WhitelistManager from './components/WhitelistManager';
import Inventory from './components/Inventory';
import { InventoryProvider } from './contexts/InventoryContext';
import NotificationModal from './components/NotificationModal';
import { FaCog } from 'react-icons/fa';

function App() {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState({});
  const [categories, setCategories] = useState({});
  const [batches, setBatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [modalPayload, setModalPayload] = useState(null);
  const [tempFinalCount, setTempFinalCount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [activeTab, setActiveTab] = useState('Production');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [notification, setNotification] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const previousBatchStatuses = useRef({});

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

  // Set up real-time listeners instead of manual fetching
  useEffect(() => {
    if (!user) return; // Don't set up listeners if not authenticated

    setLoading(true);

    // Categories listener
    const unsubCategories = onSnapshot(
      collection(db, "categories"),
      (snapshot) => {
        const categoriesMap = {};
        snapshot.forEach(docu => {
          categoriesMap[docu.id] = { id: docu.id, ...docu.data() };
        });
        setCategories(categoriesMap);
      },
      (error) => {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load categories");
      }
    );

    // Products listener
    const unsubProducts = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const productsMap = {};
        snapshot.forEach(docu => {
          productsMap[docu.id] = { id: docu.id, ...docu.data() };
        });
        setProducts(productsMap);
      },
      (error) => {
        console.error("Error fetching products:", error);
        toast.error("Failed to load products");
      }
    );

    // Batches listener
    const unsubBatches = onSnapshot(
      collection(db, "batches"),
      (snapshot) => {
        const batchesMap = {};
        snapshot.forEach(docu => {
          batchesMap[docu.id] = { id: docu.id, ...docu.data() };
        });
        setBatches(batchesMap);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching batches:", error);
        toast.error("Failed to load batches");
        setLoading(false);
      }
    );

    // Cleanup listeners on unmount
    return () => {
      unsubCategories();
      unsubProducts();
      unsubBatches();
    };
  }, [user]); // Only re-setup listeners when user changes

  useEffect(() => {
    if (loading || Object.keys(batches).length === 0) return;
    const now = new Date();
    const twentyFourHoursAgo = now.getTime() - (24 * 60 * 60 * 1000);
    const batchesToComplete = Object.values(batches || {}).filter(b => {
        if (b.status !== 'Ready') return false;
        const readyTime = b.dateReady?.toDate().getTime();
        return readyTime && readyTime < twentyFourHoursAgo;
    });

    if (batchesToComplete.length > 0) {
        const batchWrite = writeBatch(db);
        batchesToComplete.forEach(b => {
            batchWrite.update(doc(db, "batches", b.id), { status: 'Completed' });
        });
        batchWrite.commit(); // Real-time listener will update automatically
    }
  }, [batches, loading]);

  // Monitor batch status changes and show notifications based on current tab
  useEffect(() => {
    if (loading || !products || !categories || Object.keys(batches).length === 0) return;

    // Check for status changes
    Object.values(batches || {}).forEach(batch => {
      const oldStatus = previousBatchStatuses.current[batch.id];
      const newStatus = batch.status;

      // Only show notification if status actually changed (not on initial load)
      if (oldStatus && oldStatus !== newStatus) {
        const product = products[batch.productId];
        const category = categories[product?.categoryId];
        const productName = `${category?.name || ''} ${product?.flavor || 'Product'}`.trim();

        // Show notification if status changed to match current tab
        if (newStatus === 'Package' && activeTab === 'Packaging') {
          setNotification(`${productName} is ready for packaging!`);
        } else if (newStatus === 'Ready' && activeTab === 'Shipping') {
          setNotification(`${productName} is ready for shipping!`);
        } else if (newStatus === 'Make' && activeTab === 'Production') {
          setNotification(`New production run started for ${productName}!`);
        }
      }

      // Update the ref with current status
      previousBatchStatuses.current[batch.id] = newStatus;
    });
  }, [batches, products, categories, activeTab, loading]);

  const displayList = useMemo(() => {
    if (!products || !categories || !batches) return [];
    if (Object.keys(products).length === 0 || Object.keys(categories).length === 0) return [];

    let combined = Object.values(products || {}).map(product => {
      const category = categories[product.categoryId];
      const productBatches = Object.values(batches || {}).filter(b => b.productId === product.id);
      const sortedBatches = [...productBatches].sort((a,b) => (b.dateStarted?.toMillis() || 0) - (a.dateStarted?.toMillis() || 0));

      const packageOptions = (category?.containerTemplates || []).map(template => {
        const inventoryItem = (product.containerInventory || []).find(inv => inv.templateId === template.id);
        return { ...template, quantity: inventoryItem?.quantity || 0 };
      });

      const calculatedOnHandOz = packageOptions.reduce((total, opt) => {
        return total + ((opt.weightOz || 0) * (opt.quantity || 0));
      }, 0);

      const topPriorityBatch = sortedBatches.find(b => b.status === 'Make') || sortedBatches.find(b => b.status === 'Package') || sortedBatches.find(b => b.status === 'Ready');
      const overallStatus = topPriorityBatch?.status || 'Idle';

      return { ...product, onHandOz: calculatedOnHandOz, batches: sortedBatches, status: overallStatus, packageOptions };
    });

    if (selectedCategoryId) { combined = combined.filter(p => p.categoryId === selectedCategoryId); }
    if (debouncedSearchTerm) { combined = combined.filter(p => p.flavor.toLowerCase().includes(debouncedSearchTerm.toLowerCase())); }

    const statusPriority = { 'Make': 1, 'Package': 2, 'Ready': 3, 'Idle': 4, 'Completed': 5 };
    combined.sort((a, b) => {
      const priorityA = statusPriority[a.status] || 6;
      const priorityB = statusPriority[b.status] || 6;
      if (priorityA !== priorityB) return priorityA - priorityB;
      const categoryNameA = categories[a.categoryId]?.name || '';
      const categoryNameB = categories[b.categoryId]?.name || '';
      if (categoryNameA !== categoryNameB) return categoryNameA.localeCompare(categoryNameB);
      return a.flavor.localeCompare(b.flavor);
    });
    return combined;
  }, [products, categories, batches, debouncedSearchTerm, selectedCategoryId]);

  const tabCounts = useMemo(() => {
    const counts = { Make: 0, Package: 0, Ready: 0 };
    Object.values(batches || {}).forEach(batch => {
      if (batch.status === 'Make') counts.Make++;
      else if (batch.status === 'Package') counts.Package++;
      else if (batch.status === 'Ready') counts.Ready++;
    });
    return counts;
  }, [batches]);

  const handleDataUpdate = async (newStatus, data = null, batchId = null) => {
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
      }
      handleCloseModal();
      toast.success('Status updated successfully');
    } catch (error) {
      console.error("Error updating status: ", error);
      toast.error('Failed to update status');
    }
  };

  const handleDeleteBatches = async (batchIds) => {
    if (window.confirm(`Are you sure you want to delete ${batchIds.length} batch record(s)? This cannot be undone.`)) {
        try {
          const batch = writeBatch(db);
          batchIds.forEach(id => {
              batch.delete(doc(db, "batches", id));
          });
          await batch.commit();
          toast.success(`Deleted ${batchIds.length} batch(es)`);
        } catch (error) {
          console.error("Error deleting batches:", error);
          toast.error('Failed to delete batches');
        }
    }
  };

  const handleProductEdit = async ({ category: categoryName, flavor, categorySku, flavorSku }) => {
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

    await updateDoc(doc(db, "products", product.id), {
      flavor: trimmedFlavor,
      categoryId,
      flavorSku: trimmedFlavorSku
    });
    toast.success('Product updated');
    handleOpenModal('manageProduct');
  };
  
  const handleTemplateSave = async (newTemplates) => {
    const category = categories[products[selectedProductId].categoryId];
    const categoryDocRef = doc(db, "categories", category.id);
    try {
      await updateDoc(categoryDocRef, { containerTemplates: newTemplates });
      toast.success('Container templates updated');
    } catch (error) {
      console.error("Error updating templates:", error);
      toast.error('Failed to update templates');
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

  const handleAddProduct = async ({ category: categoryName, flavor, categorySku, flavorSku }) => {
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
    await addDoc(collection(db, "products"), { categoryId: categoryId, flavor: flavor, flavorSku: flavorSku, containerInventory: [] });
    handleCloseModal();
    toast.success('Product added successfully');
  };

  const handleImport = async (payload) => {
    const rows = Array.isArray(payload) ? payload : payload?.rows || [];
    const fileInfo = Array.isArray(payload) ? null : payload?.file || null;
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
            container = (category.containerTemplates || []).find(ct => ct.id === row.assignedContainerId);
          }
          if (!container) {
            const skuTail = (row.sku || '').toString().split('-').pop();
            container = (category.containerTemplates || []).find(ct => ct.sku === skuTail);
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
    } catch (error) {
      console.error("Error importing data: ", error);
      toast.error('Failed to import data');
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
    <InventoryProvider products={products} setProducts={setProducts}>
    <>
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
        <button className={`tab-button ${activeTab === 'Shipping' ? 'active' : ''}`} onClick={() => setActiveTab('Shipping')}>
          Shipping
          {tabCounts.Ready > 0 && <span className="tab-badge ready">{tabCounts.Ready}</span>}
        </button>
        <button className={`tab-button ${activeTab === 'Inventory' ? 'active' : ''}`} onClick={() => setActiveTab('Inventory')}>Inventory</button>
      </nav>
      <main>
        {activeTab === 'Production' && (
          <>
            <div className="filter-bar">
              <input type="text" placeholder="Search by flavor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
                <option value="">All Categories</option>
                {Object.values(categories || {}).sort((a, b) => a.name.localeCompare(b.name)).map(cat => ( <option key={cat.id} value={cat.id}>{cat.name}</option> ))
                }
              </select>
              <button className="clear-btn" onClick={() => { setSearchTerm(''); setSelectedCategoryId(''); }}>Clear</button>
            </div>
            <div className="inventory-list">
              {loading ? (
                <p>Loading...</p>
              ) : (
                <ErrorBoundary>
                  <div className="simple-list">
                    {(displayList || []).map((product) => (
                      <div key={product.id} style={{ paddingBottom: 10 }}>
                        <ProductCard
                          product={product}
                          category={categories[product.categoryId]}
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setActiveModal('manageProduct');
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </ErrorBoundary>
              )}
            </div>
          </>
        )}
        {activeTab === 'Packaging' && (
          <>
            <div className="filter-bar">
              <input type="text" placeholder="Search by flavor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
                <option value="">All Categories</option>
                {Object.values(categories || {}).sort((a, b) => a.name.localeCompare(b.name)).map(cat => ( <option key={cat.id} value={cat.id}>{cat.name}</option> ))
                }
              </select>
              <button className="clear-btn" onClick={() => { setSearchTerm(''); setSelectedCategoryId(''); }}>Clear</button>
            </div>
            <div className="inventory-list">
              {loading ? (
                <p>Loading...</p>
              ) : (
                <ErrorBoundary>
                  <div className="simple-list">
                    {(displayList || []).map((product) => (
                      <div key={product.id} style={{ paddingBottom: 10 }}>
                        <ProductCard
                          product={product}
                          category={categories[product.categoryId]}
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setActiveModal('manageProduct');
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </ErrorBoundary>
              )}
            </div>
          </>
        )}
        {activeTab === 'Shipping' && (
          <>
            <div className="filter-bar">
              <input type="text" placeholder="Search by flavor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
                <option value="">All Categories</option>
                {Object.values(categories || {}).sort((a, b) => a.name.localeCompare(b.name)).map(cat => ( <option key={cat.id} value={cat.id}>{cat.name}</option> ))
                }
              </select>
              <button className="clear-btn" onClick={() => { setSearchTerm(''); setSelectedCategoryId(''); }}>Clear</button>
            </div>
            <div className="inventory-list">
              {loading ? (
                <p>Loading...</p>
              ) : (
                <ErrorBoundary>
                  <div className="simple-list">
                    {(displayList || []).map((product) => (
                      <div key={product.id} style={{ paddingBottom: 10 }}>
                        <ProductCard
                          product={product}
                          category={categories[product.categoryId]}
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setActiveModal('manageProduct');
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </ErrorBoundary>
              )}
            </div>
          </>
        )}
        {activeTab === 'Inventory' && (
          <>
            <div className="filter-bar">
              <input type="text" placeholder="Search by flavor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
                <option value="">All Categories</option>
                {Object.values(categories || {}).sort((a, b) => a.name.localeCompare(b.name)).map(cat => ( <option key={cat.id} value={cat.id}>{cat.name}</option> ))
                }
              </select>
              <button className="clear-btn" onClick={() => { setSearchTerm(''); setSelectedCategoryId(''); }}>Clear</button>
              <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setActiveModal('importCsvPanel')}>Import CSV</button>
            </div>
            <div className="inventory-list">
              {loading ? (
                <p>Loading...</p>
              ) : (
                <ErrorBoundary>
                  <div className="simple-list">
                    {(displayList || []).map((product) => (
                      <div key={product.id} style={{ paddingBottom: 10 }}>
                        <ProductCard
                          product={product}
                          category={categories[product.categoryId]}
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setActiveModal('inventoryManage');
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </ErrorBoundary>
              )}
            </div>
          </>
        )}
      </main>
      
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
                onImport={handleImport}
                products={products}
                categories={(categories || {})}
                onAddProduct={handleAddProduct}
                onInventorySave={handleManualInventorySave}
              />
            </div>
          </div>
        </div>
      )}
      {activeModal === 'makeRequest' && ( <MakeRequestModal product={selectedProduct} onClose={() => handleOpenModal('manageProduct')} onSubmit={(data) => handleDataUpdate('Make', data)} /> )}
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
  );
}

export default App;
