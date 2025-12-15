import React, { useEffect, useState } from 'react';

const ProductModal = ({ product, onClose, isEditable, onSave, onDelete }) => {
    const [editedProduct, setEditedProduct] = useState(product);

    useEffect(() => {
        setEditedProduct(product);
    }, [product]);

    useEffect(() => {
        const handleEsc = (e) => {
            // If editing, maybe don't close on escape instantly? leaving as is for now
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    const handleChange = (field, value) => {
        const newer = { ...editedProduct, [field]: value };
        setEditedProduct(newer);
        onSave(newer); // Auto-save immediately on change
    };

    if (!product) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 1, transition: 'opacity 0.2s ease'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: '1200px', height: '90vh',
                    display: 'grid', gridTemplateColumns: '1.5fr 1fr',
                    gap: '4rem', padding: '2rem'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

                    {/* Image */}
                    <img
                        src={editedProduct.image}
                        alt={editedProduct.name}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                    />
                    <div style={{ display: 'none', position: 'absolute' }}>Image Load Failed</div>

                    {isEditable && (
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0, transition: 'opacity 0.2s'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                        >
                            <input
                                value={editedProduct.image}
                                onChange={(e) => handleChange('image', e.target.value)}
                                placeholder="Paste Image URL or Data URI"
                                style={{
                                    background: 'rgba(255,255,255,0.9)',
                                    border: '1px solid #ddd', padding: '10px',
                                    width: '80%', fontSize: '0.8rem', borderRadius: '4px'
                                }}
                            />
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '2rem' }}>

                    {/* Name: Editable or View */}
                    {isEditable ? (
                        <input
                            value={editedProduct.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            style={{
                                fontSize: '2rem', marginBottom: '1rem', fontWeight: 600,
                                border: 'none', background: 'transparent', outline: 'none',
                                width: '100%', padding: 0
                            }}
                            placeholder="Product Name"
                        />
                    ) : (
                        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 600 }}>{product.name}</h2>
                    )}

                    {/* Description: Editable or View */}
                    {isEditable ? (
                        <textarea
                            value={editedProduct.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            style={{
                                fontSize: '1.1rem', lineHeight: 1.6, color: '#444',
                                height: '300px', border: 'none', background: 'transparent', outline: 'none',
                                resize: 'none', width: '100%', fontFamily: 'inherit', padding: 0
                            }}
                            placeholder="Description"
                        />
                    ) : (
                        <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: '#444' }}>
                            {product.description}
                        </p>
                    )}

                    {isEditable && (
                        <div style={{ marginTop: 'auto', marginBottom: '1rem' }}>
                            <span
                                onClick={() => { if (onDelete(product.id)) onClose(); }}
                                style={{
                                    fontSize: '0.8rem', color: '#ff4444',
                                    cursor: 'pointer', textDecoration: 'underline'
                                }}
                            >
                                Delete Item
                            </span>
                        </div>
                    )}

                    {!isEditable && <div style={{ marginTop: 'auto' }}></div>}


                </div>
            </div>
        </div>
    );
};

export default ProductModal;
