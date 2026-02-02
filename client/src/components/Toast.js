import React from 'react';

export default function Toast({ message, type = 'info' }) {
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  return (
    <div className={`toast toast-${type}`} role="alert">
      <span className="toast-icon">{icon}</span>
      <span className="toast-message">{message}</span>
    </div>
  );
}
