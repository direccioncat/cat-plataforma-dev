import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import api from '../lib/api'

const AuthContext = createContext({})

const INACTIVITY_MS = 30 * 60 * 1000
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Ref para el timer — evita stale closures en los callbacks de eventos
  const timerRef   = useRef(null)
  // Ref para saber si el watcher esta activo — evita agregar listeners multiples
  const watchingRef = useRef(false)

  // cerrarSesion en ref para que resetTimer siempre tenga la version mas reciente
  const cerrarSesionRef = useRef(null)

  function _cerrarSesion(porInactividad = false) {
    _stopWatcher()
    const refreshToken = sessionStorage.getItem('cat_refresh_token')
    const token        = sessionStorage.getItem('cat_token')
    if (refreshToken || token) {
      // Enviamos ambos: refreshToken para eliminarlo, token para revocarlo por jti
      api.post('/api/auth/logout', { refreshToken, token }).catch(() => {})
    }
    sessionStorage.removeItem('cat_token')
    sessionStorage.removeItem('cat_refresh_token')
    sessionStorage.removeItem('cat_user')
    sessionStorage.removeItem('cat_session_active')
    if (porInactividad) sessionStorage.setItem('cat_inactividad', '1')
    setUser(null)
    setProfile(null)
  }

  // Mantener la ref actualizada
  cerrarSesionRef.current = _cerrarSesion

  // resetTimer usa ref para no quedar atrapado en una closure vieja
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      cerrarSesionRef.current(true)
    }, INACTIVITY_MS)
  }, []) // sin dependencias — solo usa refs

  function _startWatcher() {
    if (watchingRef.current) return
    watchingRef.current = true
    resetTimer()
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }))
  }

  function _stopWatcher() {
    if (timerRef.current) clearTimeout(timerRef.current)
    ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetTimer))
    watchingRef.current = false
  }

  // ── Inicializacion ─────────────────────────────────────────
  useEffect(() => {
    const storedUser = sessionStorage.getItem('cat_user')
    const token      = sessionStorage.getItem('cat_token')

    if (storedUser && token) {
      const parsed = JSON.parse(storedUser)
      setUser(parsed)
      setProfile(parsed)
      _startWatcher()
    }
    setLoading(false)

    const onExpired = () => cerrarSesionRef.current(true)
    window.addEventListener('cat:session_expired', onExpired)

    return () => {
      window.removeEventListener('cat:session_expired', onExpired)
      _stopWatcher()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── signIn ─────────────────────────────────────────────────
  async function signIn(email, password) {
    try {
      const data = await api.post('/api/auth/login', { email, password })

      sessionStorage.setItem('cat_token',          data.token)
      sessionStorage.setItem('cat_refresh_token',  data.refreshToken)
      sessionStorage.setItem('cat_user',           JSON.stringify(data.user))
      sessionStorage.setItem('cat_session_active', '1')

      setUser(data.user)
      setProfile(data.user)
      _startWatcher()
      return { error: null }
    } catch (err) {
      return { error: { message: mapearErrorAuth(err) } }
    }
  }

  async function signOut() {
    _cerrarSesion(false)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

function mapearErrorAuth(err) {
  const status = err?.status
  const msg    = err?.message ?? ''
  if (status === 401 || msg.includes('incorrectas')) return 'Usuario o contrasena incorrectos.'
  if (status === 429 || msg.includes('intentos'))    return 'Demasiados intentos. Espera unos minutos.'
  if (msg.includes('conexion') || msg.includes('fetch')) return 'Error de conexion. Verifica tu red e intenta nuevamente.'
  return 'No se pudo iniciar sesion. Intenta nuevamente o contacta al administrador.'
}

export const useAuth = () => useContext(AuthContext)
