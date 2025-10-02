import { useState, useEffect, useMemo } from 'react';
import './App.css';
import { db } from './firebase';
import { collection, getDocs, addDoc, doc, updateDoc, writeBatch, deleteDoc, serverTimestamp } from "firebase/firestore";
import ProductCard from './components/ProductCard';
import ManagementModal from './components/ManagementModal';
import AddProductModal from './components/AddProductModal';
import MakeRequestModal from './components/MakeRequestModal';
import FinalCountModal from './components/FinalCountModal';
import VerificationModal from './components/VerificationModal';
import CategoryTemplateModal from './components/CategoryContainersModal'; // Renamed for clarity
import EditInventoryModal from './components/EditInventoryModal';
import Inventory from './components/Inventory';

function App() {
  const [products, setProducts] = useState({});
  const [categories, setCategories] = useState({});
  const [batches, setBatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [modalPayload, setModalPayload] = useState(null);
  const [tempFinalCount, setTempFinalCount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [activeTab, setActiveTab] = useState('Production');

  const handleOpenModal = (modalName, payload = null) => {
    setModalPayload(payload);
    setActiveModal(modalName);
  };

  const handleCloseModal = () => {
    setModalPayload(null);
    setActiveModal(null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
        const [categoriesSnapshot, productsSnapshot, batchesSnapshot] = await Promise.all([
            getDocs(collection(db, "categories")),
            getDocs(collection(db, "products")),
            getDocs(collection(db, "batches"))
        ]);

        const categoriesMap = {};
        categoriesSnapshot.forEach(docu => { categoriesMap[docu.id] = { id: docu.id, ...docu.data() }; });
        setCategories(categoriesMap);

        const productsMap = {};
        productsSnapshot.forEach(docu => { productsMap[docu.id] = { id: docu.id, ...docu.data() }; });
        setProducts(productsMap);
        
        const batchesMap = {};
        batchesSnapshot.forEach(docu => { batchesMap[docu.id] = { id: docu.id, ...docu.data() }; });
        setBatches(batchesMap);
    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (loading || Object.keys(batches).length === 0) return;
    const now = new Date();
    const twentyFourHoursAgo = now.getTime() - (24 * 60 * 60 * 1000);
    const batchesToComplete = Object.values(batches).filter(b => {
        if (b.status !== 'Ready') return false;
        const readyTime = b.dateReady?.toDate().getTime();
        return readyTime && readyTime < twentyFourHoursAgo;
    });

    if (batchesToComplete.length > 0) {
        const batchWrite = writeBatch(db);
        batchesToComplete.forEach(b => {
            batchWrite.update(doc(db, "batches", b.id), { status: 'Completed' });
        });
        batchWrite.commit().then(() => fetchData());
    }
  }, [batches, loading]);

  const displayList = useMemo(() => {
    if (Object.keys(products).length === 0 || Object.keys(categories).length === 0) return [];

    let combined = Object.values(products).map(product => {
      const category = categories[product.categoryId];
      const productBatches = Object.values(batches).filter(b => b.productId === product.id);
      const sortedBatches = [...productBatches].sort((a,b) => (b.dateStarted?.toMillis() || 0) - (a.dateStarted?.toMillis() || 0));
      
      // HYBRID MODEL LOGIC: Join category templates with product inventory
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
    if (searchTerm) { combined = combined.filter(p => p.flavor.toLowerCase().includes(searchTerm.toLowerCase())); }

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
  }, [products, categories, batches, searchTerm, selectedCategoryId]);

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
      fetchData();
      handleCloseModal();
    } catch (error) { console.error("Error updating status: ", error); }
  };

  const handleDeleteBatches = async (batchIds) => {
    if (window.confirm(`Are you sure you want to delete ${batchIds.length} batch record(s)? This cannot be undone.`)) {
        const batch = writeBatch(db);
        batchIds.forEach(id => {
            batch.delete(doc(db, "batches", id));
        });
        await batch.commit();
        fetchData();
    }
  };

  const handleProductEdit = async ({ category: categoryName, flavor, categorySku, flavorSku }) => {
    const product = products[selectedProductId];
    let category = Object.values(categories).find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
    let categoryId = category?.id;

    if (!categoryId) {
        const newCategoryDoc = await addDoc(collection(db, "categories"), { name: categoryName, sku: categorySku, containerTemplates: [] });
        categoryId = newCategoryDoc.id;
    } else if (category.sku !== categorySku) {
        await updateDoc(doc(db, "categories", categoryId), { sku: categorySku });
    }

    await updateDoc(doc(db, "products", product.id), { flavor, categoryId, flavorSku });
    fetchData();
    handleOpenModal('manageProduct');
  };
  
  const handleTemplateSave = async (newTemplates) => {
    const category = categories[products[selectedProductId].categoryId];
    const categoryDocRef = doc(db, "categories", category.id);
    try { 
      await updateDoc(categoryDocRef, { containerTemplates: newTemplates }); 
      fetchData();
    } catch (error) { console.error("Error updating templates:", error); }
    handleOpenModal('manageProduct');
  };

  const handleInventorySave = async (newInventory) => {
    const product = products[selectedProductId];
    const productDocRef = doc(db, "products", product.id);
    try { 
      await updateDoc(productDocRef, { containerInventory: newInventory }); 
      fetchData();
    } catch (error) { console.error("Error updating inventory:", error); }
    handleOpenModal('manageProduct');
  };

  const handleManualInventorySave = async (updatedInventory) => {
    const batch = writeBatch(db);
    Object.values(updatedInventory).forEach(product => {
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
      fetchData();
    } catch (error) {
      console.error("Error saving manual inventory: ", error);
    }
  };

  const handleAddProduct = async ({ category: categoryName, flavor, categorySku, flavorSku }) => {
    const norm = (s) => (s || '').toString().trim().toLowerCase();
    const base = (s) => {
      const n = norm(s);
      return n.endsWith('s') ? n.slice(0, -1) : n;
    };
    const existing = Object.values(categories).find(cat => base(cat.name) === base(categoryName));
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
    fetchData();
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
        const product = Object.values(products).find(p => p.id === row.assignedProduct);
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
      fetchData();
      // After import, maybe switch back to production tab or give feedback
    } catch (error) {
      console.error("Error importing data: ", error);
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

  return (
    <div className="App">
      <header className="header">
        <h1>SoSTrack</h1>
      </header>
      <nav className={`tab-navigation ${activeTab === 'Inventory' ? 'tight' : ''}`}>
        <button className={`tab-button ${activeTab === 'Production' ? 'active' : ''}`} onClick={() => setActiveTab('Production')}>Production</button>
        <button className={`tab-button ${activeTab === 'Packaging' ? 'active' : ''}`} onClick={() => setActiveTab('Packaging')}>Packaging</button>
        <button className={`tab-button ${activeTab === 'Shipping' ? 'active' : ''}`} onClick={() => setActiveTab('Shipping')}>Shipping</button>
        <button className={`tab-button ${activeTab === 'Inventory' ? 'active' : ''}`} onClick={() => setActiveTab('Inventory')}>Inventory</button>
      </nav>
      <main>
        {activeTab === 'Production' && (
          <>
            <div className="filter-bar">
              <input type="text" placeholder="Search by flavor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
                <option value="">All Categories</option>
                {Object.values(categories).sort((a, b) => a.name.localeCompare(b.name)).map(cat => ( <option key={cat.id} value={cat.id}>{cat.name}</option> ))
                }
              </select>
              <button className="clear-btn" onClick={() => { setSearchTerm(''); setSelectedCategoryId(''); }}>Clear</button>
            </div>
            <div className="inventory-list">
              {loading ? (<p>Loading...</p>) : (
                displayList.map(p => <ProductCard key={p.id} product={p} category={categories[p.categoryId]} onClick={() => { setSelectedProductId(p.id); handleOpenModal('manageProduct'); }} />)
              )}
            </div>
          </>
        )}
        {activeTab === 'Inventory' && (
          <Inventory
            onImport={handleImport}
            products={products}
            categories={categories}
            onAddProduct={handleAddProduct}
            onInventorySave={handleManualInventorySave}
            openProduct={(id) => { setSelectedProductId(id); handleOpenModal('manageProduct'); }}
          />
        )}
      </main>
      
      {activeModal === 'manageProduct' && selectedProduct && ( <ManagementModal product={selectedProduct} category={selectedCategory} onClose={closeModalAndProduct} onUpdate={handleDataUpdate} onDeleteBatches={handleDeleteBatches} onOpenModal={handleOpenModal} /> )}
      {activeModal === 'makeRequest' && ( <MakeRequestModal product={selectedProduct} onClose={() => handleOpenModal('manageProduct')} onSubmit={(data) => handleDataUpdate('Make', data)} /> )}
      {activeModal === 'finalCount' && ( <FinalCountModal product={selectedProduct} batch={modalPayload} onClose={() => handleOpenModal('manageProduct')} onSubmit={(data) => { setTempFinalCount(data); handleOpenModal('verify', modalPayload); }} /> )}
      {activeModal === 'verify' && ( <VerificationModal product={selectedProduct} batch={modalPayload} finalCountData={tempFinalCount} onClose={() => handleOpenModal('finalCount', modalPayload)} onVerify={() => handleDataUpdate('Ready', tempFinalCount, modalPayload.id)} /> )}
      {activeModal === 'containers' && ( <CategoryTemplateModal category={selectedCategory} onClose={() => handleOpenModal('manageProduct')} onSave={handleTemplateSave} /> )}
      {activeModal === 'editInventory' && ( 
        <EditInventoryModal
          product={selectedProduct}
          onSave={handleEditSave}
          onClose={closeEdit}
          categories={categories}
          selectedCategory={selectedCategory}
          onManageContainers={openContainers}
        />
      )}
      {activeModal === 'editProduct' && ( <AddProductModal categories={categories} products={products} canDeleteCategory={activeTab === 'Inventory'} onClose={() => handleOpenModal('manageProduct')} onSubmit={handleProductEdit} onDataRefresh={fetchData} productToEdit={selectedProduct} categoryToEdit={selectedCategory}/>)}

      <button className="add-product-btn" onClick={() => handleOpenModal('addProduct') }>+</button>
      {activeModal === 'addProduct' && ( <AddProductModal categories={categories} products={products} canDeleteCategory={activeTab === 'Inventory'} onClose={closeModalAndProduct} onSubmit={handleAddProduct} onDataRefresh={fetchData} /> )}
    </div>
  );
}

export default App;
