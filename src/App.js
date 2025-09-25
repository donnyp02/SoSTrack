// src/App.js
import { useState, useEffect, useMemo } from 'react'; // Import useMemo
import './App.css';
import { db } from './firebase';
import { collection, getDocs, query, addDoc } from "firebase/firestore";
import ProductCard from './components/ProductCard';
import ManagementModal from './components/ManagementModal';
import AddProductModal from './components/AddProductModal';

function App() {
  const [activeTab, setActiveTab] = useState('Production');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categories, setCategories] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // --- NEW STATE FOR FILTERS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(''); // '' means "All"

  const fetchData = async () => {
    setLoading(true);
    const categoriesCollectionRef = collection(db, "categories");
    const categoriesSnapshot = await getDocs(categoriesCollectionRef);
    const categoriesMap = {};
    categoriesSnapshot.forEach(doc => {
      categoriesMap[doc.id] = { id: doc.id, ...doc.data() };
    });
    setCategories(categoriesMap);

    const productsCollectionRef = collection(db, "products");
    const productsSnapshot = await getDocs(productsCollectionRef);
    const productsList = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // The initial sort logic remains the same
    const statusPriority = { 'Make': 1, 'Package': 2, 'Ready': 3, 'Idle': 4 };
    productsList.sort((a, b) => {
      const priorityA = statusPriority[a.status] || 5;
      const priorityB = statusPriority[b.status] || 5;
      if (priorityA !== priorityB) return priorityA - priorityB;
      const categoryNameA = categoriesMap[a.categoryId]?.name || '';
      const categoryNameB = categoriesMap[b.categoryId]?.name || '';
      if (categoryNameA !== categoryNameB) return categoryNameA.localeCompare(categoryNameB);
      return a.flavor.localeCompare(b.flavor);
    });

    setProducts(productsList);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- NEW: DERIVED STATE FOR FILTERED PRODUCTS ---
  // useMemo ensures this logic only runs when the source data or filters change.
  const filteredProducts = useMemo(() => {
    let tempProducts = [...products];

    // 1. Apply category filter
    if (selectedCategoryId) {
      tempProducts = tempProducts.filter(p => p.categoryId === selectedCategoryId);
    }

    // 2. Apply search term filter
    if (searchTerm) {
      tempProducts = tempProducts.filter(p => 
        p.flavor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return tempProducts;
  }, [products, searchTerm, selectedCategoryId]);

  const handleProductUpdate = (updatedProduct) => {
    let newProducts = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
    const statusPriority = { 'Make': 1, 'Package': 2, 'Ready': 3, 'Idle': 4 };
    newProducts.sort((a, b) => {
        const priorityA = statusPriority[a.status] || 5;
        const priorityB = statusPriority[b.status] || 5;
        if (priorityA !== priorityB) return priorityA - priorityB;
        const categoryNameA = categories[a.categoryId]?.name || '';
        const categoryNameB = categories[b.categoryId]?.name || '';
        if (categoryNameA !== categoryNameB) return categoryNameA.localeCompare(categoryNameB);
        return a.flavor.localeCompare(b.flavor);
    });
    setProducts(newProducts);
  };
  
  const handleAddProduct = async ({ category: categoryName, flavor }) => {
    let categoryId = Object.values(categories).find(cat => cat.name.toLowerCase() === categoryName.toLowerCase())?.id;
    if (!categoryId) {
      const newCategoryDoc = await addDoc(collection(db, "categories"), { name: categoryName, packageOptions: [] });
      categoryId = newCategoryDoc.id;
    }
    await addDoc(collection(db, "products"), { categoryId: categoryId, flavor: flavor, status: 'Idle', statusSetAt: new Date() });
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
        {/* --- UPDATED FILTER BAR --- */}
        <div className="filter-bar">
          <input 
            type="text" 
            placeholder="Search by flavor..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            value={selectedCategoryId} 
            onChange={(e) => setSelectedCategoryId(e.target.value)}
          >
            <option value="">All Categories</option>
            {Object.values(categories).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <button className="clear-btn" onClick={clearFilters}>Clear</button>
        </div>

        <div className="inventory-list">
          <h2>Inventory Items</h2>
          {loading ? (<p>Loading products...</p>) : (
            // We now map over the filtered list instead of the full list
            filteredProducts.map(product => {
              const categoryName = categories[product.categoryId]?.name || 'Unknown Category';
              return (
                <ProductCard 
                  key={product.id} 
                  product={product}
                  categoryName={categoryName}
                  onClick={() => setSelectedProduct(product)}
                />
              )
            })
          )}
        </div>
      </main>

      {selectedProduct && (<ManagementModal product={selectedProduct} category={categories[selectedProduct.categoryId]} onClose={() => setSelectedProduct(null)} onUpdate={handleProductUpdate}/>)}
      {isAddModalOpen && (<AddProductModal categories={categories} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddProduct} onDataRefresh={fetchData}/>)}

      <button className="add-product-btn" onClick={() => setIsAddModalOpen(true)}>+</button>
    </div>
  );
}

export default App;