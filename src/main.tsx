import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'
import { measureWebVitals } from './utils/performance'

// Measure Web Vitals in development
if (import.meta.env.DEV) {
  measureWebVitals()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
