import React, { useState, useEffect } from 'react';
import './index.css';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import { compressImage } from './utils/imageUtils';
import { get, set, del, getMany } from 'idb-keyval';

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

const ORDER_KEY = 'yourtop100_order';
const DATA_KEY_LEGACY = 'yourtop100_data'; // The old monolithic key

import { useStorageQuota } from './hooks/useStorageQuota';
import { AnimatePresence } from 'framer-motion';

function App() {
  const [products, setProducts] = useState([]); // Start empty to prevent flash of old content
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('Copied!');

  // Storage Quota Hook
  const { usage, quota, percentage, isCritical, checkQuota } = useStorageQuota();

  const showToastMessage = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Helper to save order
  const saveOrder = async (order) => {
    try {
      await set(ORDER_KEY, order);
    } catch (e) {
      console.error("Failed to save order", e);
      showToastMessage("⚠️ Save failed (Order)");
    }
  };

  // Load from IDB (or migrate) on mount
  useEffect(() => {
    console.log("App mounted - Loading data...");
    const loadData = async () => {
      try {
        // 1. Check for old monolithic data in IDB (Transition from v1 -> v2)
        const legacyData = await get(DATA_KEY_LEGACY);
        if (legacyData && Array.isArray(legacyData)) {
          console.log("FOUND LEGACY IDB DATA. Commencing migration...");
          // Migrate: Save each item individually + save order
          const order = legacyData.map(p => p.id);
          await Promise.all(legacyData.map(p => set(`product_${p.id}`, p)));
          await set(ORDER_KEY, order);
          // Delete legacy key
          await del(DATA_KEY_LEGACY);
          console.log("Migration complete.");
          setProducts(legacyData);
        } else {
          // 2. Normal load: Get order -> Get items
          const order = await get(ORDER_KEY);
          if (order && Array.isArray(order)) {
            // Fetch all products in parallel
            // const products = await Promise.all(order.map(id => get(`product_${id}`)));
            // Optimization: use getMany if available, or parallel get
            // Note: getMany returns values in order of keys, so we must be careful?
            // Actually idb-keyval getMany takes an array of keys and returns values in that order.
            const keys = order.map(id => `product_${id}`);
            const items = await getMany(keys);

            // Filter out any undefineds (corruption safeguard)
            const validItems = items.filter(Boolean);
            setProducts(validItems);
          } else {
            // 3. Fallback: Check localStorage legacy (v0 -> v2 direct migration)
            const localLegacy = localStorage.getItem('yourtop100_data');
            if (localLegacy) {
              console.log("Migrating from localStorage...");
              const parsed = JSON.parse(localLegacy);
              if (Array.isArray(parsed)) {
                const order = parsed.map(p => p.id);
                await Promise.all(parsed.map(p => set(`product_${p.id}`, p)));
                await set(ORDER_KEY, order);
                setProducts(parsed);
                localStorage.removeItem('yourtop100_data');
              }
            }
            // Else: use default APP_DATA (initial state), no need to write until user acts?
            // Or we could write APP_DATA to DB now to initialize it.
            // Let's leave it in memory until first edit to avoid spamming DB on fresh visit.
          }
        }
      } catch (err) {
        console.error("Load failed", err);
        showToastMessage("Error loading data");
      } finally {
        setIsLoaded(true);
        checkQuota(); // Initial quota check after loading data
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

  const handleProductUpdate = (updatedProduct) => {
    // Remove the ephemeral 'isNew' flag so it doesn't persist
    const { isNew, ...cleanProduct } = updatedProduct;

    // Functional update ensuring we work on latest state
    setProducts(current => {
      const newProducts = current.map(p => p.id === cleanProduct.id ? cleanProduct : p);

      // GRANULAR SAVE: Only save this product
      set(`product_${cleanProduct.id}`, cleanProduct)
        .then(() => checkQuota()) // Update quota after save
        .catch(e => {
          console.error("Failed to save product", e);
          showToastMessage("⚠️ Save failed");
        });

      return newProducts;
    });

    setSelectedProduct(cleanProduct);
  };

  const handleDelete = (id) => {
    console.log("Deleting", id);
    setProducts(current => {
      const newProducts = current.filter(p => p.id !== id);
      const newOrder = newProducts.map(p => p.id);

      // GRANULAR DELETE:
      // 1. Delete product data
      del(`product_${id}`).catch(e => console.error("Del failed", e));
      // 2. Update order
      saveOrder(newOrder).then(() => checkQuota()); // Update quota

      return newProducts;
    });
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

    setProducts(current => {
      const newProducts = [...current, newProd];
      const newOrder = newProducts.map(p => p.id);

      // GRANULAR SAVE:
      // 1. Save new product
      set(`product_${newId}`, newProd).catch(e => console.error("Add failed", e));
      // 2. Save new order
      saveOrder(newOrder).then(() => checkQuota());

      return newProducts;
    });

    setSelectedProduct(newProd);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(products, null, 2);
    navigator.clipboard.writeText(dataStr);
    showToastMessage("Configuration copied to clipboard!");
  };

  const handleNext = () => {
    if (!selectedProduct || products.length === 0) return;
    const currentIndex = products.findIndex(p => p.id === selectedProduct.id);
    const nextIndex = (currentIndex + 1) % products.length;
    setSelectedProduct(products[nextIndex]);
  };

  const handlePrev = () => {
    if (!selectedProduct || products.length === 0) return;
    const currentIndex = products.findIndex(p => p.id === selectedProduct.id);
    const prevIndex = (currentIndex - 1 + products.length) % products.length;
    setSelectedProduct(products[prevIndex]);
  };

  // Paste logic
  useEffect(() => {
    if (!isAdmin) return;
    const handlePaste = async (e) => {
      console.log("Paste detected");
      if (!isAdmin) { console.log("Not admin, ignoring paste"); return; }
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { console.log("Input focused, ignoring"); return; }

      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          console.log("Image found, processing...");
          const blob = items[i].getAsFile();
          if (!blob) continue;

          try {
            const compressedDataUrl = await compressImage(blob);

            const newProd = {
              id: Date.now(),
              name: 'New Item',
              image: compressedDataUrl,
              description: 'New pasted item.',
              isNew: true
            };

            setProducts(current => {
              const updated = [...current, newProd];
              const newOrder = updated.map(p => p.id);

              // GRANULAR SAVE
              set(`product_${newProd.id}`, newProd)
                .then(() => {
                  saveOrder(newOrder); // Update order after secure save of item
                  checkQuota(); // Update quota
                  showToastMessage("Image saved to Database!");
                })
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

  if (!isLoaded) {
    return <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--color-text-muted)', fontSize: '1.2rem'
    }}>Loading...</div>;
  }

  return (
    <div className="app">
      {/* Critical Storage Warning Banner */}
      {isCritical && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          backgroundColor: '#ff4444', color: 'white',
          padding: '10px', textAlign: 'center', zIndex: 2000,
          fontWeight: 'bold'
        }}>
          ⚠️ STORAGE FULL! You are running out of space ({(usage / 1024 / 1024).toFixed(1)}MB used).
          Please delete items before adding more images, or changes may not save.
        </div>
      )}

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

      <AnimatePresence>
        {selectedProduct && (
          <ProductModal
            key={selectedProduct.id}
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            isEditable={isAdmin}
            onSave={handleProductUpdate}
            onDelete={handleDelete}
            isCriticalStorage={isCritical}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
      </AnimatePresence>

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

        {/* Storage Indicator */}
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginRight: 'auto', marginLeft: '20px' }}>
          disk: {(usage / 1024 / 1024).toFixed(1)}MB / {(quota / 1024 / 1024).toFixed(0)}MB
          {isCritical && " (FULL)"}
        </div>

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
