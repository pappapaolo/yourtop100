import React, { useState, useEffect } from 'react';
import './index.css';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import { compressImage } from './utils/imageUtils';
import { get, set } from 'idb-keyval';

// User's specific list
const APP_DATA = [
  // ... (unchanged)
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
  const [products, setProducts] = useState(APP_DATA); // Default fallback
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('Copied!');

  const showToastMessage = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Load from IDB (or migrate from localStorage) on mount
  useEffect(() => {
    console.log("App mounted - Loading data...");
    const loadData = async () => {
      try {
        // 1. Check for legacy localStorage data (Migration)
        const legacy = localStorage.getItem('yourtop100_data');
        if (legacy) {
          console.log("Migrating from localStorage to IDB...");
          try {
            const parsed = JSON.parse(legacy);
            if (Array.isArray(parsed)) {
              await set('yourtop100_data', parsed); // Save to IDB
              setProducts(parsed);
              localStorage.removeItem('yourtop100_data'); // Cleanup legacy
            }
          } catch (e) {
            console.error("Migration failed", e);
          }
        } else {
          // 2. Load from IDB
          const val = await get('yourtop100_data');
          if (val) {
            setProducts(val);
          }
        }
      } catch (err) {
        console.error("Load failed", err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();

    // Check for admin flag in local storage or URL
    const savedAdmin = localStorage.getItem('isAdmin') === 'true';
    const urlParams = new URLSearchParams(window.location.search);
    const magicToken = urlParams.get('edit');

    if (magicToken || savedAdmin) {
      setIsAdmin(true);
      if (magicToken) {
        localStorage.setItem('isAdmin', 'true');
        // Clean URL so it looks nice
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Save helper
  const saveProducts = (newProducts) => {
    setProducts(newProducts);
    // Async save to IDB (optimistic UI update)
    set('yourtop100_data', newProducts).catch(err => {
      console.error("Save failed", err);
      showToastMessage("⚠️ Save failed (Storage Error)");
    });
  };

  const handleProductUpdate = (updatedProduct) => {
    // Remove the ephemeral 'isNew' flag so it doesn't persist
    const { isNew, ...cleanProduct } = updatedProduct;

    // Functional update ensuring we work on latest state
    setProducts(current => {
      const newProducts = current.map(p => p.id === cleanProduct.id ? cleanProduct : p);
      set('yourtop100_data', newProducts).catch(e => console.error("Save failed", e));
      return newProducts;
    });

    setSelectedProduct(cleanProduct);
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
    showToastMessage("Configuration copied to clipboard!");
  };

  // Paste logic (same as before)
  useEffect(() => {
    if (!isAdmin) return;
    const handlePaste = async (e) => { // Made async
      console.log("Paste detected");
      if (!isAdmin) { console.log("Not admin, ignoring paste"); return; }
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { console.log("Input focused, ignoring"); return; }

      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      console.log("Clipboard items:", items.length);
      for (let i = 0; i < items.length; i++) {
        console.log("Checking item", i, items[i].type);
        if (items[i].type.indexOf("image") !== -1) {
          console.log("Image found, processing...");
          const blob = items[i].getAsFile();
          if (!blob) {
            console.error("Clipboard item is not a file/blob");
            showToastMessage("Error: Clipboard data empty.");
            continue;
          }
          try {
            const compressedDataUrl = await compressImage(blob); // Use compressImage

            const newProd = {
              id: Date.now(),
              name: 'New Item',
              image: compressedDataUrl, // Use compressed image
              description: 'New pasted item.',
              isNew: true // Flag for auto-selection
            };

            // Use functional update to avoid stale closure
            setProducts(current => {
              const updated = [...current, newProd];
              // Async save
              set('yourtop100_data', updated)
                .then(() => showToastMessage("Image saved to Database!"))
                .catch(err => {
                  console.error("Database Error", err);
                  showToastMessage("⚠️ Database Error: " + err.message);
                });
              return updated;
            });

            // Open modal immediately
            setSelectedProduct(newProd);
          } catch (err) {
            console.error("Paste error", err);
            showToastMessage("Error: " + (err.message || "Failed to process image"));
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isAdmin]); // Removed 'products' dependency as we use functional update now

  return (
    <div className="app">
      <header style={{
        paddingTop: '4rem',
        paddingBottom: '2rem',
        paddingLeft: '4rem',
        paddingRight: '4rem',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '4rem',
          fontWeight: 800,
          marginBottom: '2rem',
          marginTop: '2rem',
          letterSpacing: '-0.05em',
          color: 'var(--color-text)'
        }}>
          the best things
        </h1>
      </header>

      <main className="container" style={{ paddingTop: 0, paddingBottom: '100px' }}>
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
        </div>
      </main>

      {selectedProduct && (
        <ProductModal
          key={selectedProduct.id}
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          isEditable={isAdmin}
          onSave={handleProductUpdate}
          onDelete={handleDelete}
        />
      )}

      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '1rem 4rem',
        color: 'var(--color-text-muted)', fontSize: '0.8rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'var(--color-bg-modal)',
        backdropFilter: 'blur(10px)',
        zIndex: 900
      }}>
        <span>© 2025</span>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {isAdmin ? (
            <>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button onClick={() => {
                  const url = window.location.origin + window.location.pathname;
                  navigator.clipboard.writeText(url);
                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 2000);
                }} style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>
                  🔗 Copy Public Link
                </button>
                <span style={{
                  position: 'absolute',
                  left: '100%',
                  marginLeft: '10px',
                  backgroundColor: 'var(--color-text)',
                  color: 'var(--color-bg)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  opacity: showToast ? 1 : 0,
                  transform: showToast ? 'translateX(0)' : 'translateX(-10px)',
                  transition: 'all 0.3s ease',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap'
                }}>
                  {toastMsg}
                </span>
              </div>
              <span style={{ color: 'var(--color-border)', margin: '0 10px' }}>|</span>
              <button onClick={handleExport} style={{ color: 'var(--color-text-muted)' }}>Export</button>
              <span style={{ color: 'var(--color-border)', margin: '0 10px' }}>|</span>
              <button onClick={() => {
                localStorage.removeItem('isAdmin');
                setIsAdmin(false);
              }} style={{ color: 'var(--color-text-muted)' }}>Exit Admin</button>
            </>
          ) : (
            <div style={{ opacity: 0 }}>.</div>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
