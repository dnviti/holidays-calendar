import React from 'react';

// Simple modal using standard portal later, or inline for now
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg rounded-lg shadow-xl border border-border" style={{
        backgroundColor: 'var(--card-color)',
        borderColor: 'var(--border-color)'
      }}>
        <div className="flex items-center justify-between p-4 border-b border-border" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-secondary hover:text-primary">✕</button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
