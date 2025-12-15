import React from 'react';

const ProductCard = ({ product, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        padding: '1rem',
        borderRadius: '0px',
        transition: 'opacity 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      className="product-card"
      onMouseEnter={(e) => e.currentTarget.style.opacity = 0.8}
      onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
    >
      <div style={{
        width: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <img
          src={product.image}
          alt={product.name}
          style={{
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  );
};

export default ProductCard;
