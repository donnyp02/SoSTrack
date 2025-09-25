// src/App.js
import { useState, useEffect } from 'react';
import './App.css';
import { db } from './firebase';
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import ProductCard from './components/ProductCard';
import ManagementModal from './components/ManagementModal';

function App() {
  const [activeTab, setActiveTab] = useState('Production');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categories, setCategories] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const categoriesCollectionRef = collection(db, "categories");
      const categoriesSnapshot = await getDocs(categoriesCollectionRef);
      const categoriesMap = {};
      categoriesSnapshot.forEach(doc => {
        categoriesMap[doc.id] = doc.data();
      });
      setCategories(categoriesMap);

      const productsCollectionRef = collection(db, "products");
      const q = query(productsCollectionRef, orderBy("status"));
      const productsSnapshot = await getDocs(q);
      const productsList = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProducts(productsList);
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- NEW FUNCTION TO UPDATE STATE LOCALLY ---
  const handleProductUpdate = (updatedProduct) => {
    // Find the product in our current list and replace it with the updated one
    setProducts(currentProducts => 
      currentProducts.map(p => 
        p.id === updatedProduct.id ? updatedProduct : p
      )
    );
  };

  return (
    <div className="App">
      <header className="header">
        <h1>SoSTrack Inventory</h1>
      </header>
      <nav className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'Production' ? 'active' : ''}`}
          onClick={() => setActiveTab('Production')}
        >
          Production
        </button>
        <button 
          className={`tab-button ${activeTab === 'Packaging' ? 'active' : ''}`}
          onClick={() => setActiveTab('Packaging')}
        >
          Packaging
        </button>
        <button 
          className={`tab-button ${activeTab === 'Shipping' ? 'active' : ''}`}
          onClick={() => setActiveTab('Shipping')}
        >
          Shipping
        </button>
      </nav>

      <main>
        <div className="filter-bar">
          <input type="text" placeholder="Search by flavor..." />
          <select>
            <option value="">All Categories</option>
          </select>
        </div>

        <div className="inventory-list">
          <h2>Inventory Items</h2>
          {loading ? (
            <p>Loading products...</p>
          ) : (
            products.map(product => {
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

      {selectedProduct && (
      <ManagementModal 
        product={selectedProduct} 
        // Find the category object from our map and pass it down
        category={categories[selectedProduct.categoryId]}
        onClose={() => setSelectedProduct(null)}
        onUpdate={handleProductUpdate}
      />
      )}
    </div>
  );
}

export default App;