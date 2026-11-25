import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Disable default right-click context menu (essential for Interactive Touch TV / Kiosk mode)
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
}, { passive: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
