import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/* ---------- Host Log Bridge ---------- */
declare global {
    interface Window {
        __hostLog?: (msg: string) => void
    }
}
window.__hostLog = (msg) => {
    console.log(msg);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
