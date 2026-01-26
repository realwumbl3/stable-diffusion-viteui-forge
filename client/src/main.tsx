import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import api from './Api'
import './index.css'
import './lib/memory-debug' // Memory debugging utilities
import './lib/logger-test' // Logger testing utilities (dev only)

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
    <WorkspaceProvider>
      <App />
    </WorkspaceProvider>
  </React.StrictMode>,
)