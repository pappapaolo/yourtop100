import React, { useEffect, useState, useRef } from 'react';

const ProductModal = ({ product, onClose, isEditable, onSave, onDelete }) => {
    const [editedProduct, setEditedProduct] = useState(product);
    const [showImageMenu, setShowImageMenu] = useState(false);
    const nameInputRef = useRef(null);
    const descriptionRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        setEditedProduct(product);
    }, [product]);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    // Separate effect for focus to avoid re-running when onClose changes
    useEffect(() => {
        if (isEditable && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditable]);

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
            }
        }
    };

    const handleDescriptionKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onClose();
        }
    };


    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                handleChange('image', event.target.result);
                setShowImageMenu(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageMenuAction = (action) => {
        if (action === 'upload') {
            fileInputRef.current.click();
        } else if (action === 'copy') {
            // Copy logic
            alert("Copy image not implemented (requires HTTPS/Blob).");
        } else if (action === 'download') {
            const link = document.createElement('a');
            link.href = editedProduct.image;
            link.download = `product_${editedProduct.id}.png`;
            link.click();
        } else if (action === 'shop') {
            window.open(`https://google.com/search?q=buy+${editedProduct.name}`, '_blank');
        }
        if (action !== 'upload') setShowImageMenu(false);
    };

    if (!product) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'var(--color-bg-modal)',
                zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 1, transition: 'opacity 0.2s ease',
                cursor: 'pointer',
                backdropFilter: 'blur(5px)'
            }}
        >
            <div
                // Clicking the white container ALSO closes, unless stopPropagation is called on children
                onClick={onClose}
                className='modal-content-wrapper'
                style={{
                    width: '100%', maxWidth: '1200px', height: '90vh',
                    display: 'grid', gridTemplateColumns: '1.5fr 1fr',
                    gap: '4rem', padding: '2rem',
                    cursor: 'default',
                    color: 'var(--color-text)'
                }}
            >
                {/* Image Section */}
                <div
                    onClick={(e) => e.stopPropagation()} // Stop closing when clicking image area
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                        height: '100%'
                    }}
                >
                    <img
                        src={editedProduct.image}
                        alt={editedProduct.name}
                        onClick={() => isEditable && setShowImageMenu(!showImageMenu)}
                        style={{
                            maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                            cursor: isEditable ? 'pointer' : 'default'
                        }}
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                    />
                    <div style={{ display: 'none', position: 'absolute' }}>Image Load Failed</div>

                    {/* Image Menu Overlay */}
                    {isEditable && showImageMenu && (
                        <div style={{
                            position: 'absolute',
                            backgroundColor: 'var(--color-bg-menu)',
                            boxShadow: 'var(--shadow-menu)',
                            borderRadius: '8px',
                            padding: '10px',
                            display: 'flex', flexDirection: 'column', gap: '8px',
                            zIndex: 10,
                            border: '1px solid var(--color-border)'
                        }}>
                            <button onClick={() => handleImageMenuAction('upload')} style={{ color: 'var(--color-text)' }}>Upload from computer</button>
                            <button onClick={() => handleImageMenuAction('copy')} style={{ color: 'var(--color-text)' }}>Copy image</button>
                            <button onClick={() => handleImageMenuAction('download')} style={{ color: 'var(--color-text)' }}>Download image</button>
                            <button onClick={() => handleImageMenuAction('shop')} style={{ color: 'var(--color-text)' }}>Shop</button>
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
                            pointerEvents: showImageMenu ? 'none' : 'auto' // Prevent interfering if menu open? Actually, keeping as is.
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                        >
                            {/* Only show "Paste" hint if menu not open, purely extra UI. Skipping changes to keep simple. */}
                        </div>
                    )}
                </div>

                {/* Text/Inputs Section */}
                <div
                    onClick={(e) => e.stopPropagation()} // Stop closing when clicking text area
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '2rem' }}
                >
                    {isEditable ? (
                        <>
                            <input
                                ref={nameInputRef}
                                value={editedProduct.name}
                                onChange={(e) => handleChange('name', e.target.value)}
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
                                onKeyDown={handleDescriptionKeyDown}
                                style={{
                                    fontSize: '1.1rem', lineHeight: 1.6, color: 'var(--color-text-muted)',
                                    height: '200px', border: 'none', background: 'transparent', outline: 'none',
                                    resize: 'none', width: '100%', fontFamily: 'inherit', padding: 0
                                }}
                                placeholder="Description"
                            />
                            <input
                                value={editedProduct.sponsoredLink || ''}
                                onChange={(e) => handleChange('sponsoredLink', e.target.value)}
                                style={{
                                    fontSize: '0.9rem', color: 'var(--color-text-muted)',
                                    marginTop: '1rem',
                                    border: 'none', background: 'transparent', outline: 'none',
                                    width: '100%', padding: 0, fontStyle: 'italic'
                                }}
                                placeholder="Add a sponsored link..."
                            />
                        </>
                    ) : (
                        <>
                            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>{product.name}</h2>
                            <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
                                {product.description}
                            </p>
                            {product.sponsoredLink && (
                                <a
                                    href={product.sponsoredLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ marginTop: '1rem', color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}
                                >
                                    Shop Link ↗
                                </a>
                            )}
                        </>
                    )}
                </div>
            </div>

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
                            fontSize: '0.8rem', color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            padding: '10px'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#ff4444'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--color-text-muted)'}
                    >
                        Delete Item
                    </span>
                </div>
            )}
        </div>
    );
};

export default ProductModal;
