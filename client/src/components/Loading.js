import React from 'react';

export default function Loading({ message = 'جاري التحميل...' }) {
  return (
    <div className="loading-wrapper">
      <div className="loading-spinner" />
      <p className="loading-message">{message}</p>
    </div>
  );
}
