// VITE UI
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import api from './Api'
import './index.css'

// Make the API available globally as sd_backend
declare global {
  interface Window {
    sd_backend: typeof api;
  }
}

window.sd_backend = api;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)