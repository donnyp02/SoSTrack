// src/App.js
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
        categoriesSnapshot.forEach(doc => { categoriesMap[doc.id] = { id: doc.id, ...doc.data() }; });
        setCategories(categoriesMap);

        const productsMap = {};
        productsSnapshot.forEach(doc => { productsMap[doc.id] = { id: doc.id, ...doc.data() }; });
        setProducts(productsMap);
        
        const batchesMap = {};
        batchesSnapshot.forEach(doc => { batchesMap[doc.id] = { id: doc.id, ...doc.data() }; });
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

  const handleProductEdit = async ({ category: categoryName, flavor }) => {
    const product = products[selectedProductId];
    let categoryId = Object.values(categories).find(cat => cat.name.toLowerCase() === categoryName.toLowerCase())?.id;
    if (!categoryId) {
        const newCategoryDoc = await addDoc(collection(db, "categories"), { name: categoryName, containerTemplates: [] });
        categoryId = newCategoryDoc.id;
    }
    await updateDoc(doc(db, "products", product.id), { flavor, categoryId });
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

  const handleAddProduct = async ({ category: categoryName, flavor }) => {
    let categoryId = Object.values(categories).find(cat => cat.name.toLowerCase() === categoryName.toLowerCase())?.id;
    if (!categoryId) {
      const newCategoryDoc = await addDoc(collection(db, "categories"), { name: categoryName, containerTemplates: [] });
      categoryId = newCategoryDoc.id;
    }
    await addDoc(collection(db, "products"), { categoryId: categoryId, flavor: flavor, containerInventory: [] });
    handleCloseModal();
    fetchData();
  };

  const selectedProduct = displayList.find(p => p.id === selectedProductId);
  const selectedCategory = selectedProduct ? categories[selectedProduct.categoryId] : null;

  const closeModalAndProduct = () => {
    handleCloseModal();
    setSelectedProductId(null);
  };

  return (
    <div className="App">
      <header className="header"><h1>SoSTrack</h1></header>
      <nav className="tab-navigation">
        <button className="tab-button active">Production</button>
        <button className="tab-button">Packaging</button>
        <button className="tab-button">Shipping</button>
      </nav>
      <main>
        <div className="filter-bar">
          <input type="text" placeholder="Search by flavor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
            <option value="">All Categories</option>
            {Object.values(categories).sort((a, b) => a.name.localeCompare(b.name)).map(cat => ( <option key={cat.id} value={cat.id}>{cat.name}</option> ))}
          </select>
          <button className="clear-btn" onClick={() => { setSearchTerm(''); setSelectedCategoryId(''); }}>Clear</button>
        </div>
        <div className="inventory-list">
          
          {loading ? (<p>Loading...</p>) : (
            displayList.map(p => <ProductCard key={p.id} product={p} category={categories[p.categoryId]} onClick={() => { setSelectedProductId(p.id); handleOpenModal('manageProduct'); }} />)
          )}
        </div>
      </main>
      
      {activeModal === 'manageProduct' && selectedProduct && ( <ManagementModal product={selectedProduct} category={selectedCategory} onClose={closeModalAndProduct} onUpdate={handleDataUpdate} onDeleteBatches={handleDeleteBatches} onOpenModal={handleOpenModal} /> )}
      {activeModal === 'makeRequest' && ( <MakeRequestModal product={selectedProduct} onClose={() => handleOpenModal('manageProduct')} onSubmit={(data) => handleDataUpdate('Make', data)} /> )}
      {activeModal === 'finalCount' && ( <FinalCountModal product={selectedProduct} batch={modalPayload} onClose={() => handleOpenModal('manageProduct')} onSubmit={(data) => { setTempFinalCount(data); handleOpenModal('verify', modalPayload); }} /> )}
      {activeModal === 'verify' && ( <VerificationModal product={selectedProduct} batch={modalPayload} finalCountData={tempFinalCount} onClose={() => handleOpenModal('finalCount', modalPayload)} onVerify={() => handleDataUpdate('Ready', tempFinalCount, modalPayload.id)} /> )}
      {activeModal === 'containers' && ( <CategoryTemplateModal category={selectedCategory} onClose={() => handleOpenModal('manageProduct')} onSave={handleTemplateSave} /> )}
      {activeModal === 'editInventory' && ( <EditInventoryModal product={selectedProduct} onClose={() => handleOpenModal('manageProduct')} onSave={handleInventorySave} /> )}
      {activeModal === 'editProduct' && ( <AddProductModal categories={categories} onClose={() => handleOpenModal('manageProduct')} onSubmit={handleProductEdit} productToEdit={selectedProduct} categoryToEdit={selectedCategory}/>)}

      <button className="add-product-btn" onClick={() => handleOpenModal('addProduct') }>+</button>
      {activeModal === 'addProduct' && ( <AddProductModal categories={categories} onClose={closeModalAndProduct} onSubmit={handleAddProduct} onDataRefresh={fetchData} /> )}
    </div>
  );
}

export default App;