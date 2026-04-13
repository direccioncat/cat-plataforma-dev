import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SessionGuard from './components/SessionGuard'
import Login from './pages/Login'
import Home from './pages/Home'
import Misiones from './pages/Misiones'
import MisionesAgente from './pages/MisionesAgente'
import OrdenServicio from './pages/OrdenServicio'
import OSAdicionalPage from './pages/OSAdicionalPage'

function RutaMisiones() {
  const { profile } = useAuth()
  const role = profile?.role ?? 'agente'
  if (role === 'agente') return <MisionesAgente />
  return <Misiones />
}

function RutaOS() {
  const { profile } = useAuth()
  const role = profile?.role ?? 'agente'
  if (!['gerencia', 'admin', 'jefe_base', 'director', 'planeamiento', 'jefe_cgm'].includes(role)) {
    return <Navigate to="/" />
  }
  return <OrdenServicio />
}

function RutaOSAdicional() {
  const { profile } = useAuth()
  const role = profile?.role ?? 'agente'
  if (!['gerencia', 'admin', 'jefe_base', 'director', 'planeamiento', 'jefe_cgm'].includes(role)) {
    return <Navigate to="/" />
  }
  return <OSAdicionalPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionGuard>
          <Routes>
            <Route path="/login"             element={<Login />} />
            <Route path="/"                  element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/misiones"          element={<ProtectedRoute><RutaMisiones /></ProtectedRoute>} />
            <Route path="/os"                element={<ProtectedRoute><RutaOS /></ProtectedRoute>} />
            <Route path="/os-adicional"      element={<ProtectedRoute><RutaOSAdicional /></ProtectedRoute>} />
            <Route path="/os-adicional/:id"  element={<ProtectedRoute><RutaOSAdicional /></ProtectedRoute>} />
            <Route path="*"                  element={<Navigate to="/" />} />
          </Routes>
        </SessionGuard>
      </AuthProvider>
    </BrowserRouter>
  )
}
