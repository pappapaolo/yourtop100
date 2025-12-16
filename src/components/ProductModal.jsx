import React, { useEffect, useState, useRef } from 'react';
import { compressImage } from '../utils/imageUtils';
import { Upload, Copy, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProductModal = ({ product, onClose, isEditable, onSave, onDelete, isCriticalStorage, onNext, onPrev }) => {
    const [editedProduct, setEditedProduct] = useState(product);
    const [showImageMenu, setShowImageMenu] = useState(false);
    const nameInputRef = useRef(null);
    const descriptionRef = useRef(null);
    const fileInputRef = useRef(null);

    // Update internal state when product changes (navigating)
    useEffect(() => {
        setEditedProduct(product);
    }, [product]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && onNext) onNext();
            if (e.key === 'ArrowLeft' && onPrev) onPrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [onClose, onNext, onPrev]);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Separate effect for focus/select - ONLY for new items
    useEffect(() => {
        if (isEditable && product.isNew && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditable, product.isNew]);

    const handleChange = (field, value) => {
        const newer = { ...editedProduct, [field]: value };
        setEditedProduct(newer);
        onSave(newer);
    };

    const handleNameKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (descriptionRef.current) {
                // Focus and place cursor at end
                descriptionRef.current.focus();
                descriptionRef.current.select();
            }
        }
    };

    const handleDescriptionKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onClose();
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedBase64 = await compressImage(file);
                handleChange('image', compressedBase64);
                setShowImageMenu(false);
            } catch (err) {
                console.error("Image upload failed", err);
                alert("Failed to process image.");
            }
        }
    };

    const handleImageClick = (e) => {
        // Advanced "Smart Click": Check if click is on transparent pixel or letterbox area
        try {
            const img = e.target;
            const rect = img.getBoundingClientRect();

            // 1. Calculate the actual rendered image dimensions (handling object-fit: contain)
            const naturalRatio = img.naturalWidth / img.naturalHeight;
            const visibleRatio = rect.width / rect.height;

            let renderWidth, renderHeight, leftOffset, topOffset;

            if (naturalRatio > visibleRatio) {
                // Image constrained by width (looks like wide letterbox)
                renderWidth = rect.width;
                renderHeight = rect.width / naturalRatio;
                leftOffset = 0;
                topOffset = (rect.height - renderHeight) / 2;
            } else {
                // Image constrained by height (looks like tall pillars)
                renderHeight = rect.height;
                renderWidth = rect.height * naturalRatio;
                topOffset = 0;
                leftOffset = (rect.width - renderWidth) / 2;
            }

            // Click coordinates relative to the element
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            // 2. Check if click is in the "letterbox" (empty space inside img element)
            if (
                clickX < leftOffset ||
                clickX > leftOffset + renderWidth ||
                clickY < topOffset ||
                clickY > topOffset + renderHeight
            ) {
                // Clicked on empty space (letterbox) -> Treat as background click (Close)
                // Let event bubble to onClose
                return;
            }

            // 3. Pixel Transparency Check
            // Map click to natural image coordinates
            const naturalX = Math.floor((clickX - leftOffset) * (img.naturalWidth / renderWidth));
            const naturalY = Math.floor((clickY - topOffset) * (img.naturalHeight / renderHeight));

            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');

            // Draw only the 1x1 pixel we care about
            ctx.drawImage(img, naturalX, naturalY, 1, 1, 0, 0, 1, 1);
            const pixel = ctx.getImageData(0, 0, 1, 1).data;
            const alpha = pixel[3]; // 0-255

            if (alpha < 10) {
                // Transparent pixel -> Treat as background click
                return;
            }

        } catch (err) {
            console.warn("Smart click check failed (likely CORS), falling back to standard behavior", err);
            // Fallback: If we can't check, assume it's part of the image
        }

        // If we got here, it's a solid part of the image
        e.stopPropagation();
        if (isEditable) setShowImageMenu(!showImageMenu);
    };

    const handleImageMenuAction = async (action) => {
        if (action === 'upload') {
            fileInputRef.current.click();
        } else if (action === 'copy') {
            try {
                const response = await fetch(editedProduct.image);
                const blob = await response.blob();
                const item = new ClipboardItem({ [blob.type]: blob });
                await navigator.clipboard.write([item]);
            } catch (err) {
                console.error("Copy failed", err);
                alert("Failed to copy. Try manual right-click.");
            }
        } else if (action === 'download') {
            const link = document.createElement('a');
            link.href = editedProduct.image;
            link.download = "product_" + editedProduct.id + ".png";
            document.body.appendChild(link); // Required for FF
            link.click();
            document.body.removeChild(link);
        } else if (action === 'shop') {
            window.open("https://google.com/search?q=buy+" + editedProduct.name, '_blank');
        }
        if (action !== 'upload') setShowImageMenu(false);
    };

    if (!product) return null;

    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 1000 : direction < 0 ? -1000 : 0,
            opacity: 0,
            zIndex: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : direction > 0 ? -1000 : 0,
            opacity: direction === 0 ? 1 : 0 // If closing (0), keep opaque so layoutId works. Else fade out for slide.
        })
    };

    const ProductModal = ({ product, onClose, isEditable, onSave, onDelete, isCriticalStorage, onNext, onPrev, direction }) => {
        // ... (state hooks)

        // ... (useEffect hook for keydown)

        // ... (logic)

        return (
            <div
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    // We move usage of cursor pointer to backdrop
                }}
            >
                {/* 1. Backdrop - Handles the dark fade */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'var(--color-bg-modal)',
                        backdropFilter: 'blur(5px)',
                        cursor: 'pointer'
                    }}
                />

                {/* Navigation Arrows */}
                {!isEditable && onPrev && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onPrev(); }}
                        style={{
                            position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', color: 'var(--color-text-muted)',
                            cursor: 'pointer', padding: '20px', zIndex: 1001
                        }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--color-text)'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--color-text-muted)'}
                    >
                        <ChevronLeft size={48} />
                    </button>
                )}
                {!isEditable && onNext && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onNext(); }}
                        style={{
                            position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', color: 'var(--color-text-muted)',
                            cursor: 'pointer', padding: '20px', zIndex: 1001
                        }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--color-text)'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--color-text-muted)'}
                    >
                        <ChevronRight size={48} />
                    </button>
                )}

                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div
                        key={product.id}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        className='modal-content-wrapper'
                        style={{
                            position: 'relative', // Context for content
                            width: '100%', maxWidth: '1200px', height: '90vh',
                            display: 'grid', gridTemplateColumns: '1.5fr 1fr',
                            gap: '4rem', padding: '2rem',
                            cursor: 'default',
                            color: 'var(--color-text)',
                            pointerEvents: 'none' // Allow clicks to pass through gaps to backdrop
                        }}
                    >
                        {/* Image Section */}
                        <div
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                                height: '100%',
                                pointerEvents: 'auto' // Re-enable pointer events for content
                            }}
                        >
                            <motion.img
                                layoutId={`product-image-${product.id}`}
                                src={editedProduct.image}
                                alt={editedProduct.name}
                                onClick={handleImageClick}
                                style={{
                                    maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                                    cursor: isEditable ? 'pointer' : 'default'
                                }}
                                transition={{ type: "spring", stiffness: 350, damping: 40 }}
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                            />
                            <div style={{ display: 'none', position: 'absolute' }}>Image Load Failed</div>

                            {/* Image Menu Overlay */}
                            {isEditable && showImageMenu && (
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'absolute',
                                        backgroundColor: 'var(--color-bg-menu)',
                                        boxShadow: 'var(--shadow-menu)',
                                        borderRadius: '12px',
                                        padding: '8px',
                                        display: 'flex', flexDirection: 'column', gap: '4px',
                                        zIndex: 10,
                                        border: '1px solid var(--color-border)',
                                        minWidth: '180px'
                                    }}>
                                    <button onClick={() => handleImageMenuAction('upload')} className="menu-btn">
                                        <Upload size={16} /> <span>Upload replacement</span>
                                    </button>
                                    <button onClick={() => handleImageMenuAction('copy')} className="menu-btn">
                                        <Copy size={16} /> <span>Copy image</span>
                                    </button>
                                    <button onClick={() => handleImageMenuAction('download')} className="menu-btn">
                                        <Download size={16} /> <span>Save image</span>
                                    </button>
                                    <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />
                                    <button onClick={() => handleImageMenuAction('shop')} className="menu-btn">
                                        <Search size={16} /> <span>Search Google</span>
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handleImageUpload}
                                        accept="image/*"
                                    />
                                </div>
                            )}

                            {isEditable && (
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: 0, transition: 'opacity 0.2s',
                                    pointerEvents: showImageMenu ? 'none' : 'auto'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                                >
                                </div>
                            )}
                        </div>

                        {/* Text/Inputs Section */}
                        <motion.div
                            // Add exit fade for text specifically
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            style={{
                                display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '2rem',
                                pointerEvents: 'auto'
                            }}
                        >
                            {isEditable ? (
                                <>
                                    {isCriticalStorage && (
                                        <div style={{
                                            color: '#ff4444',
                                            fontWeight: 'bold',
                                            marginBottom: '1rem',
                                            border: '1px solid #ff4444',
                                            padding: '8px',
                                            borderRadius: '4px',
                                            fontSize: '0.9rem'
                                        }}>
                                            ⚠️ Storage Full. Changes may not save.
                                        </div>
                                    )}
                                    <input
                                        ref={nameInputRef}
                                        value={editedProduct.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={handleNameKeyDown}
                                        style={{
                                            fontSize: '2rem', marginBottom: '1rem', fontWeight: 600,
                                            border: 'none', background: 'transparent', outline: 'none',
                                            width: '100%', padding: 0, color: 'var(--color-text)'
                                        }}
                                        placeholder="Product Name"
                                    />
                                    <textarea
                                        ref={descriptionRef}
                                        value={editedProduct.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={handleDescriptionKeyDown}
                                        style={{
                                            fontSize: '1.1rem', lineHeight: 1.6, color: 'var(--color-text-muted)',
                                            height: '200px', border: 'none', background: 'transparent', outline: 'none',
                                            resize: 'none', width: '100%', fontFamily: 'inherit', padding: 0
                                        }}
                                        placeholder="Description"
                                    />
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }} onClick={(e) => e.stopPropagation()}>
                                        <input
                                            value={editedProduct.price || ''}
                                            onChange={(e) => handleChange('price', e.target.value)}
                                            style={{
                                                fontSize: '0.9rem', color: 'var(--color-text)',
                                                border: '1px solid var(--color-border)', background: 'transparent',
                                                width: '80px', padding: '5px', borderRadius: '4px'
                                            }}
                                            placeholder="Price"
                                        />
                                        <input
                                            value={editedProduct.sponsoredLink || ''}
                                            onChange={(e) => handleChange('sponsoredLink', e.target.value)}
                                            style={{
                                                fontSize: '0.9rem', color: 'var(--color-text-muted)',
                                                border: '1px solid var(--color-border)', background: 'transparent',
                                                flex: 1, padding: '5px', borderRadius: '4px'
                                            }}
                                            placeholder="Link URL..."
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 600, color: 'var(--color-text)' }}
                                    >
                                        {product.name}
                                    </h2>
                                    <p
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'var(--color-text-muted)' }}
                                    >
                                        {product.description}
                                    </p>
                                    {product.sponsoredLink && (
                                        <div style={{ marginTop: '1rem' }}>
                                            <a
                                                href={product.sponsoredLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    display: 'inline-block',
                                                    textDecoration: 'none',
                                                    fontSize: '0.9rem',
                                                    padding: '8px 16px',
                                                    borderRadius: '20px',
                                                    border: '1px solid var(--color-border)',
                                                    color: 'var(--color-text)',
                                                    backgroundColor: 'var(--color-card-hover)',
                                                    fontWeight: 500
                                                }}
                                                onMouseEnter={(e) => e.target.style.borderColor = '#999'}
                                                onMouseLeave={(e) => e.target.style.borderColor = 'var(--color-border)'}
                                            >
                                                {product.price ? product.price : 'Shop'} ↗
                                            </a>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                </AnimatePresence>

                {/* Fixed Bottom Right Delete Button */}
                {isEditable && (
                    <div style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        zIndex: 1100
                    }}>
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onDelete(product.id)) onClose();
                            }}
                            style={{
                                fontSize: '0.8rem', color: 'var(--color-text)',
                                opacity: 0.6,
                                cursor: 'pointer',
                                padding: '10px'
                            }}
                            onMouseEnter={(e) => { e.target.style.color = '#ff4444'; e.target.style.opacity = 1; }}
                            onMouseLeave={(e) => { e.target.style.color = 'var(--color-text)'; e.target.style.opacity = 0.6; }}
                        >
                            Delete Item
                        </span>
                    </div>
                )}
            </div>
        );
    };

    export default ProductModal;
