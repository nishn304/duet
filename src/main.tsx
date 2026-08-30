import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installWebMCPCompat } from './webmcp/compat';
import './index.css';
import App from './App.tsx';

// Bridge navigator.modelContext <-> document.modelContext before React mounts,
// so the WebMCP hooks see whichever surface this browser provides.
installWebMCPCompat();

// Dev-only: drive the store from the console when there's no WebMCP host to test
// against. Never referenced by the shipped UI.
if (import.meta.env.DEV) {
  import('./model/store').then(({ useDuet }) => {
    (window as unknown as { __duet: unknown }).__duet = useDuet;
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
