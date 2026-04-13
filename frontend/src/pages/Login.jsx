import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a2744',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      {/* Logo / Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: '#f5c800', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px', fontWeight: '800',
          color: '#1a2744'
        }}>
          BA
        </div>
        <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          Plataforma CAT
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: 0 }}>
          Cuerpo de Agentes de Tránsito · GCBA
        </p>
      </div>

      {/* Card de login */}
      <div style={{
        background: '#fff', borderRadius: '24px', padding: '28px 24px',
        width: '100%', maxWidth: '360px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a2744', margin: '0 0 20px' }}>
          Ingresar
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
              Usuario / Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '12px',
                border: '1.5px solid #e5e5ea', fontSize: '14px', outline: 'none',
                fontFamily: 'inherit', color: '#1d1d1f', background: '#f9f9fb'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '12px',
                border: '1.5px solid #e5e5ea', fontSize: '14px', outline: 'none',
                fontFamily: 'inherit', color: '#1d1d1f', background: '#f9f9fb'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fce8e8', color: '#a32d2d', borderRadius: '10px',
              padding: '10px 14px', fontSize: '13px', marginBottom: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px',
              background: loading ? '#e5e5ea' : '#1a2744',
              color: loading ? '#8e8e93' : '#fff',
              fontSize: '15px', fontWeight: '700', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              letterSpacing: '-0.2px'
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#8e8e93' }}>
          ¿Olvidaste tu contraseña?{' '}
          <span style={{ color: '#185fa5', cursor: 'pointer', fontWeight: '600' }}>
            Recuperar
          </span>
        </p>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginTop: '32px' }}>
        GCBA · Gobierno de la Ciudad de Buenos Aires
      </p>
    </div>
  )
}
