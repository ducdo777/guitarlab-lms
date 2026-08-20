import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './admin.css'
import AdminPage from './AdminPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminPage />
  </StrictMode>,
)
