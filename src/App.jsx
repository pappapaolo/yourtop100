import React, { useState, useEffect } from 'react';
import './index.css';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';

// User's specific list
const APP_DATA = [
  { id: 1, name: 'Blue Muji Pen 0.5', image: '/products/muji_pen_1765821401462.png', description: 'Blue click muji pen 0.5' },
  { id: 2, name: 'AirPods Pro 2', image: '/products/airpods_pro_1765821415964.png', description: 'Apple AirPods Pro 2' },
  { id: 3, name: 'MacBook Pro', image: '/products/macbook_pro_1765821428417.png', description: 'MacBook Pro' },
  { id: 4, name: 'Clipper Tea', image: 'https://placehold.co/800x800/png?text=Tea', description: 'Clipper Ginko Tea' },
  { id: 5, name: 'Amazon Basics Hoodie', image: 'https://placehold.co/800x800/png?text=Hoodie', description: 'Burgundy zipped Amazon Basics hoodie' },
  { id: 6, name: 'Blundstone Boots', image: 'https://placehold.co/800x800/png?text=Boots', description: 'Blundstone brown boots' },
  { id: 7, name: 'Kindle Paperwhite', image: 'https://placehold.co/800x800/png?text=Kindle', description: 'Kindle Paperwhite' },
  { id: 8, name: 'MagSafe Wallet', image: 'https://placehold.co/800x800/png?text=Wallet', description: 'MagSafe wallet' },
  { id: 9, name: 'JBL Go 4', image: 'https://placehold.co/800x800/png?text=JBL', description: 'JBL Go 4 black' },
  { id: 10, name: 'Swapfiets Bike', image: 'https://placehold.co/800x800/png?text=Bike', description: 'Swapfiets original bike yellow' }
  // ... (Adding safe fallback)
];

function App() {
  const [products, setProducts] = useState(APP_DATA); // Initialize directly
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    console.log("App mounted");
    const saved = localStorage.getItem('yourtop100_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed);
        } else {
          // If saved data is weird, revert
          console.warn("Saved data invalid, using default");
        }
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }

    // Check for admin flag in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const saveProducts = (newProducts) => {
    setProducts(newProducts);
    localStorage.setItem('yourtop100_data', JSON.stringify(newProducts));
  };

  const handleProductUpdate = (updatedProduct) => {
    const newProducts = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
    saveProducts(newProducts);
    setSelectedProduct(updatedProduct); // Keep modal open
  };

  const handleDelete = (id) => {
    console.log("Deleting instant", id);
    const newProducts = products.filter(p => p.id !== id);
    saveProducts(newProducts);
    setSelectedProduct(null);
    return true;
  };

  const handleAdd = () => {
    const newId = Date.now();
    const newProd = {
      id: newId,
      name: 'New Item',
      image: 'https://placehold.co/800x800/png',
      description: 'Description here.'
    };
    saveProducts([...products, newProd]);
    setSelectedProduct(newProd);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(products, null, 2);
    navigator.clipboard.writeText(dataStr);
    alert("Configuration copied to clipboard!");
  };

  const handleReset = () => {
    if (confirm("Reset to default list? This clears local changes.")) {
      setProducts(APP_DATA);
      localStorage.setItem('yourtop100_data', JSON.stringify(APP_DATA));
    }
  }

  // Paste logic (same as before)
  useEffect(() => {
    if (!isAdmin) return;
    const handlePaste = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target.result;
            const newProd = {
              id: Date.now(),
              name: 'New Item',
              image: base64,
              description: 'New pasted item.'
            };
            saveProducts([...products, newProd]);
            setSelectedProduct(newProd);
          };
          reader.readAsDataURL(blob);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isAdmin, products]);

  return (
    <div className="app">
      <header style={{
        paddingTop: '4rem',
        paddingBottom: '2rem',
        paddingLeft: '4rem',
        paddingRight: '4rem',
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          margin: 0
        }}>
          yourtop100
        </h1>
      </header>

      <main className="container" style={{ paddingTop: 0 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
        }}>
          {Array.isArray(products) && products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => setSelectedProduct(product)}
            />
          ))}
          {isAdmin && (
            <div
              onClick={handleAdd}
              style={{
                border: '2px dashed #eee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                minHeight: '200px'
              }}
            >
              + Add Item
            </div>
          )}
        </div>
      </main>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          isEditable={isAdmin}
          onSave={handleProductUpdate}
          onDelete={handleDelete}
        />
      )}

      <footer style={{ padding: '4rem 4rem', color: '#ccc', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
        <span>© 2025</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isAdmin && <button onClick={handleReset}>Reset Data</button>}
          {isAdmin && <button onClick={handleExport}>Export Config</button>}
          <button onClick={() => setIsAdmin(!isAdmin)} style={{ opacity: 0.2 }}>
            {isAdmin ? 'Exit Edit' : 'Admin'}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
