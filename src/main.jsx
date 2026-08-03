import React from 'react'
import ReactDOM from 'react-dom/client'
import { pdfjs } from 'react-pdf'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import App from './App.jsx'
import './index.css'

// Point pdf.js at the bundled worker so everything works offline and the
// worker version always matches the API version react-pdf ships with.
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
