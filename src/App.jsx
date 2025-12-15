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
  const [showToast, setShowToast] = useState(false);

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
    showToastMessage("Configuration copied to clipboard!");
  };

  // Paste logic (same as before)
  useEffect(() => {
    if (!isAdmin) return;
    const handlePaste = async (e) => { // Made async
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          try {
            const compressedDataUrl = await compressImage(blob); // Use compressImage

            const newProd = {
              id: Date.now(),
              name: 'New Item',
              image: compressedDataUrl, // Use compressed image
              description: 'New pasted item.'
            };

            // Use functional update to avoid stale closure
            setProducts(current => {
              const updated = [...current, newProd];
              try {
                localStorage.setItem('yourtop100_data', JSON.stringify(updated));
                return updated;
              } catch (err) {
                console.error("Storage full!", err);
                showToastMessage("⚠️ Storage full! Image not saved.");
                return current; // Don't add if storage is full
              }
            });

            // Open modal immediately
            setSelectedProduct(newProd);
          } catch (err) {
            console.error("Paste error", err);
            showToastMessage("Error processing image.");
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
                  Copied!
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
