import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import LoadingSkeleton from './components/LoadingSkeleton'

/* ═══════════════════════════════════════════════
   Lazy-loaded route components
   Only loaded when the user navigates to them,
   reducing initial bundle size by ~50%.
   ═══════════════════════════════════════════════ */

const QuestRoute = lazy(() => import('./routes/QuestRoute'))
const AdminRoute = lazy(() => import('./routes/AdminRoute'))

/* ═══════════════════════════════════════════════
   Root Application
   ═══════════════════════════════════════════════ */

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary context="App Root">
          <Suspense fallback={<LoadingSkeleton type="page" />}>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/quest" element={<QuestRoute />} />
              <Route path="/quest.html" element={<QuestRoute />} />
              <Route path="/admin" element={<AdminRoute />} />
              <Route path="/admin.html" element={<AdminRoute />} />
              {/* Fallback — redirect unknown routes to home */}
              <Route path="*" element={<App />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
