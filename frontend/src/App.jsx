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
import MiEquipo from './pages/MiEquipo'
import ServiciosAdicionalesPage from './pages/ServiciosAdicionalesPage'
import PostularPage from './pages/PostularPage'

const ROLES_OS = ['gerencia', 'admin', 'jefe_base', 'director', 'planeamiento', 'jefe_cgm', 'coordinador_cgm']
const ROLES_SERVICIOS_ADICIONALES = ['admin', 'operador_adicionales', 'gerencia', 'director', 'jefe_cgm']

function RutaMisiones() {
  const { profile } = useAuth()
  const role = profile?.role ?? 'agente'
  if (role === 'agente') return <MisionesAgente />
  return <Misiones />
}

function RutaOS() {
  const { profile } = useAuth()
  const role = profile?.role ?? 'agente'
  if (!ROLES_OS.includes(role)) return <Navigate to="/" />
  return <OrdenServicio />
}

function RutaOSAdicional() {
  const { profile } = useAuth()
  const role = profile?.role ?? 'agente'
  if (!ROLES_OS.includes(role)) return <Navigate to="/" />
  return <OSAdicionalPage />
}

function RutaServiciosAdicionales() {
  const { profile } = useAuth()
  const role = profile?.role ?? 'agente'
  if (!ROLES_SERVICIOS_ADICIONALES.includes(role)) return <Navigate to="/" />
  return <ServiciosAdicionalesPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionGuard>
          <Routes>
            <Route path="/login"                          element={<Login />} />
            <Route path="/"                               element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/misiones"                       element={<ProtectedRoute><RutaMisiones /></ProtectedRoute>} />
            <Route path="/os"                             element={<ProtectedRoute><RutaOS /></ProtectedRoute>} />
            <Route path="/os-adicional"                   element={<ProtectedRoute><RutaOSAdicional /></ProtectedRoute>} />
            <Route path="/os-adicional/:id"               element={<ProtectedRoute><RutaOSAdicional /></ProtectedRoute>} />
            <Route path="/equipo"                         element={<ProtectedRoute><MiEquipo /></ProtectedRoute>} />
            <Route path="/servicios-adicionales"          element={<ProtectedRoute><RutaServiciosAdicionales /></ProtectedRoute>} />
            <Route path="/servicios-adicionales/:id"      element={<ProtectedRoute><RutaServiciosAdicionales /></ProtectedRoute>} />
            <Route path="/postular/:token"                element={<PostularPage />} />
            <Route path="*"                               element={<Navigate to="/" />} />
          </Routes>
        </SessionGuard>
      </AuthProvider>
    </BrowserRouter>
  )
}
