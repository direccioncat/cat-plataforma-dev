import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#1a2744',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px', background: '#f5c800',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: '20px', fontWeight: '800', color: '#1a2744'
        }}>BA</div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Cargando...</p>
      </div>
    </div>
  )

  return user ? children : <Navigate to="/login" replace />
}
