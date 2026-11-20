import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

function injectPngPwaManifest() {
  try {
    const makeIconDataUrl = (size) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#0b0e14';
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = '#00e676';
      ctx.lineWidth = Math.max(4, size * 0.03);
      ctx.strokeRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88);

      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#00e676');
      grad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = grad;
      ctx.font = `900 ${Math.round(size * 0.3)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Thek', size / 2, size / 2);

      return canvas.toDataURL('image/png');
    };

    const manifestObj = {
      short_name: 'Thek',
      name: 'Thek — Voice & Stage Canvas',
      start_url: window.location.origin + '/',
      scope: window.location.origin + '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#0b0e14',
      theme_color: '#0b0e14',
      icons: [
        { src: makeIconDataUrl(192), sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: makeIconDataUrl(512), sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    };

    const blob = new Blob([JSON.stringify(manifestObj)], { type: 'application/manifest+json' });
    const manifestUrl = URL.createObjectURL(blob);

    let linkEl = document.querySelector('link[rel="manifest"]');
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.rel = 'manifest';
      document.head.appendChild(linkEl);
    }
    linkEl.href = manifestUrl;
  } catch (e) {
    console.warn('PWA manifest warning:', e);
  }
}

injectPngPwaManifest();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
