// src/App.js
import { useState, useEffect, useMemo } from 'react';
import './App.css';
import { db } from './firebase';
import { collection, getDocs, query, addDoc, doc, writeBatch } from "firebase/firestore";
import ProductCard from './components/ProductCard';
import ManagementModal from './components/ManagementModal';
import AddProductModal from './components/AddProductModal';

function App() {
  const [activeTab, setActiveTab] = useState('Production');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState({});
  const [batches, setBatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    // Fetch all three collections in parallel for speed
    const [categoriesSnapshot, productsSnapshot, batchesSnapshot] = await Promise.all([
      getDocs(collection(db, "categories")),
      getDocs(collection(db, "products")),
      getDocs(collection(db, "batches"))
    ]);

    const categoriesMap = {};
    categoriesSnapshot.forEach(doc => {
      categoriesMap[doc.id] = { id: doc.id, ...doc.data() };
    });
    setCategories(categoriesMap);

    const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setProducts(productsList);
    
    const batchesMap = {};
    batchesSnapshot.forEach(doc => {
      batchesMap[doc.id] = { id: doc.id, ...doc.data() };
    });
    setBatches(batchesMap);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const displayList = useMemo(() => {
    // This is where we merge products with their most recent batch data for display
    let combined = products.map(product => {
      const productBatches = Object.values(batches).filter(b => b.productId === product.id);
      // Find the most recent batch (or the one that's not 'Completed')
      const activeBatch = productBatches.find(b => b.status !== 'Completed') || 
                          productBatches.sort((a,b) => b.dateStarted.toMillis() - a.dateStarted.toMillis())[0];
      
      return {
        ...product,
        // The display status comes from the batch, defaults to Idle
        status: activeBatch?.status || 'Idle',
        activeBatchId: activeBatch?.id,
        request: activeBatch?.request,
        finalCount: activeBatch?.finalCount
      };
    });

    // Apply filters
    if (selectedCategoryId) {
      combined = combined.filter(p => p.categoryId === selectedCategoryId);
    }
    if (searchTerm) {
      combined = combined.filter(p => p.flavor.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Apply sorting
    const statusPriority = { 'Make': 1, 'Package': 2, 'Ready': 3, 'Idle': 4 };
    combined.sort((a, b) => {
      const priorityA = statusPriority[a.status] || 5;
      const priorityB = statusPriority[b.status] || 5;
      if (priorityA !== priorityB) return priorityA - priorityB;
      const categoryNameA = categories[a.categoryId]?.name || '';
      const categoryNameB = categories[b.categoryId]?.name || '';
      if (categoryNameA !== categoryNameB) return categoryNameA.localeCompare(categoryNameB);
      return a.flavor.localeCompare(b.flavor);
    });

    return combined;
  }, [products, categories, batches, searchTerm, selectedCategoryId]);

  const handleProductUpdate = () => {
    // Instead of a complex local update, just re-fetch all data.
    // This is simpler and ensures all data is consistent.
    fetchData();
  };
  
  const handleAddProduct = async ({ category: categoryName, flavor }) => {
    let categoryId = Object.values(categories).find(cat => cat.name.toLowerCase() === categoryName.toLowerCase())?.id;
    if (!categoryId) {
      const newCategoryDoc = await addDoc(collection(db, "categories"), { name: categoryName, packageOptions: [] });
      categoryId = newCategoryDoc.id;
    }
    await addDoc(collection(db, "products"), { categoryId: categoryId, flavor: flavor, onHandOz: 0 });
    setIsAddModalOpen(false);
    fetchData();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategoryId('');
  };

  return (
    <div className="App">
      <header className="header"><h1>SoSTrack Inventory</h1></header>
      <nav className="tab-navigation">
        <button className={`tab-button ${activeTab === 'Production' ? 'active' : ''}`} onClick={() => setActiveTab('Production')}>Production</button>
        <button className={`tab-button ${activeTab === 'Packaging' ? 'active' : ''}`} onClick={() => setActiveTab('Packaging')}>Packaging</button>
        <button className={`tab-button ${activeTab === 'Shipping' ? 'active' : ''}`} onClick={() => setActiveTab('Shipping')}>Shipping</button>
      </nav>

      <main>
        <div className="filter-bar">
          <input type="text" placeholder="Search by flavor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
            <option value="">All Categories</option>
            {Object.values(categories).map(cat => ( <option key={cat.id} value={cat.id}>{cat.name}</option> ))}
          </select>
          <button className="clear-btn" onClick={clearFilters}>Clear</button>
        </div>

        <div className="inventory-list">
          <h2>Inventory Items</h2>
          {loading ? (<p>Loading products...</p>) : (
            displayList.map(product => {
              const category = categories[product.categoryId];
              return (
                <ProductCard key={product.id} product={product} category={category} onClick={() => setSelectedProduct(product)} />
              )
            })
          )}
        </div>
      </main>

      {selectedProduct && ( <ManagementModal product={selectedProduct} category={categories[selectedProduct.categoryId]} onClose={() => setSelectedProduct(null)} onUpdate={handleProductUpdate} /> )}
      {isAddModalOpen && ( <AddProductModal categories={categories} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddProduct} onDataRefresh={fetchData} /> )}

      <button className="add-product-btn" onClick={() => setIsAddModalOpen(true)}>+</button>
    </div>
  );
}

export default App;