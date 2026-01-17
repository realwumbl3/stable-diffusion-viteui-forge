import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import api from './Api.ts'
import './index.css'

// Make the API available globally as sd_backend
window.sd_backend = api;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)