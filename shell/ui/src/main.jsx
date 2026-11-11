import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.jsx';
import { applyCachedTheme } from './app/themes.js';
import { persistent, session } from './lib/storage.js';
import './styles.css';

applyCachedTheme();

// Pulihkan posisi terakhir: kalau shell dibuka dari alamat dasar di tab baru,
// lanjutkan ke layer tempat admin terakhir berada.
if (!session.get('booted', false)) {
  session.set('booted', true);
  const lastPath = persistent.get('lastPath', '/');
  if (window.location.pathname === '/' && typeof lastPath === 'string' && lastPath.startsWith('/') && lastPath !== '/') {
    window.history.replaceState(null, '', lastPath);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
