import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import AppShell from '../components/AppShell'

const ROLE_LABELS = {
  gerencia: 'Gerencia operativa', jefe_base: 'Jefe de base', jefe_cgm: 'Jefe CGM',
  coordinador: 'Coordinador de turno', coordinador_cgm: 'Coordinador CGM',
  supervisor: 'Supervisor', agente: 'Agente de transito', admin: 'Administrador',
  director: 'Director', planeamiento: 'Planeamiento', operador_adicionales: 'Operador adicionales',
}

const TIPO_EVENTO = {
  mision_creada:       { label: 'Nueva mision',    color: '#185fa5', bg: '#e8f0fe',  icon: '📋' },
  mision_asignada:     { label: 'Asignada',         color: '#854f0b', bg: '#faeeda',  icon: '👤' },
  mision_aceptada:     { label: 'Aceptada',         color: '#0f6e56', bg: '#e8faf2',  icon: '✓'  },
  mision_interrumpida: { label: 'Interrumpida',     color: '#854f0b', bg: '#faeeda',  icon: '⚠'  },
  mision_cerrada:      { label: 'Cerrada',          color: '#0f6e56', bg: '#e8faf2',  icon: '✓'  },
  servicio_generado:   { label: 'Nuevo servicio',   color: '#534ab7', bg: '#eeedf8',  icon: '⭐' },
}

function tiempoRelativo(fecha) {
  if (!fecha) return ''
  const diff = Math.floor((Date.now() - new Date(fecha)) / 60000)
  if (diff < 1)    return 'ahora'
  if (diff < 60)   return `hace ${diff} min`
  if (diff < 1440) return `hace ${Math.floor(diff / 60)} h`
  return `hace ${Math.floor(diff / 1440)} d`
}

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos dias' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
}

function getFecha() {
  return new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ── Feed de notificaciones ────────────────────────────────────
function FeedNotificaciones({ actividad, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '0.5px solid #e5e5ea', opacity: 0.5 }}>
            <div style={{ height: 12, background: '#f5f5f7', borderRadius: 6, width: '60%', marginBottom: 8 }}/>
            <div style={{ height: 10, background: '#f5f5f7', borderRadius: 6, width: '40%' }}/>
          </div>
        ))}
      </div>
    )
  }

  if (actividad.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2744', marginBottom: 6 }}>Sin actividad reciente</div>
        <div style={{ fontSize: 13, color: '#aeaeb2' }}>Las notificaciones del sistema aparecerán aquí</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {actividad.map((a, i) => {
        const tipo = TIPO_EVENTO[a.tipo] ?? { label: a.tipo, color: '#636366', bg: '#f5f5f7', icon: '·' }
        return (
          <div key={a.id || i}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 20px', background: '#fff', borderBottom: i < actividad.length - 1 ? '0.5px solid #f5f5f7' : 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            {/* Ícono tipo */}
            <div style={{ width: 34, height: 34, borderRadius: 10, background: tipo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 1 }}>
              {tipo.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3, gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.descripcion}
                </span>
                <span style={{ fontSize: 11, color: '#aeaeb2', flexShrink: 0 }}>{tiempoRelativo(a.created_at)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 6, background: tipo.bg, color: tipo.color }}>
                  {tipo.label}
                </span>
                {a.nombre_completo && (
                  <span style={{ fontSize: 11, color: '#8e8e93' }}>{a.nombre_completo}</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tarjeta de modulo ─────────────────────────────────────────
function TarjetaModulo({ label, sub, path, iconBg, icon, navigate }) {
  return (
    <div onClick={() => navigate(path)}
      style={{ background: '#fff', borderRadius: 14, padding: 20, border: '0.5px solid #dde2ec', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s', boxShadow: '0 1px 4px rgba(26,39,68,0.06)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,39,68,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(26,39,68,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        {icon}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', marginBottom: 3, letterSpacing: '-0.2px' }}>{label}</div>
      <div style={{ fontSize: 12, color: '#8e8e93' }}>{sub}</div>
    </div>
  )
}

const ROLES_OS = ['gerencia', 'admin', 'jefe_base', 'director', 'planeamiento', 'jefe_cgm', 'coordinador_cgm']

function getModulos(rol) {
  const todos = [
    { id: 'misiones', label: 'Misiones', path: '/misiones', sub: rol === 'agente' ? 'Mis misiones del turno' : 'Operaciones del dia', iconBg: '#e8f0fe',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
    { id: 'os', label: 'Ordenes de servicio', path: '/os', sub: 'Planificacion semanal', iconBg: '#e4eaf5', soloRoles: ROLES_OS,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a2744" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
    { id: 'sa', label: 'Serv. adicionales', path: '/servicios-adicionales', sub: 'Gestion y convocatoria', iconBg: '#fef9e7', soloRoles: ['admin','operador_adicionales','gerencia','director','jefe_cgm'],
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#854f0b" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
    { id: 'equipo', label: 'Mi equipo', path: '/equipo', sub: 'Organigrama de la base', iconBg: '#eeedf8', soloRoles: ['gerencia','admin','jefe_base','jefe_cgm','director','coordinador','coordinador_cgm','supervisor'],
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#534ab7" strokeWidth="2"><circle cx="12" cy="8" r="3"/><path d="M6 20v-2a6 6 0 0112 0v2"/><circle cx="4" cy="14" r="2"/><path d="M2 20v-1a4 4 0 014-4"/><circle cx="20" cy="14" r="2"/><path d="M22 20v-1a4 4 0 00-4-4"/></svg> },
  ]
  return todos.filter(m => !m.soloRoles || m.soloRoles.includes(rol))
}

// ── Componente principal ──────────────────────────────────────
export default function Home() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const rol         = profile?.role ?? 'agente'

  const [actividad, setActividad] = useState([])
  const [loadingFeed, setLoadingFeed] = useState(true)
  const [time, setTime] = useState(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!profile || rol === 'agente') { setLoadingFeed(false); return }
    api.get('/api/actividad?limite=20')
      .then(data => setActividad(data ?? []))
      .catch(() => {})
      .finally(() => setLoadingFeed(false))
  }, [profile?.id])

  const modulos = getModulos(rol)

  return (
    <AppShell titulo="Inicio">
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 40px', display: 'flex', gap: 28, minHeight: 0 }}>

        {/* Columna izquierda */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Saludo */}
          <div style={{ background: '#1a2744', borderRadius: 18, padding: '28px 32px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
            {/* Detalle decorativo */}
            <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(245,200,0,0.04)', pointerEvents: 'none' }}/>
            <div style={{ position: 'absolute', bottom: -20, right: 80, width: 90, height: 90, borderRadius: '50%', background: 'rgba(78,205,196,0.04)', pointerEvents: 'none' }}/>

            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>{getGreeting()} · {getFecha()}</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.8px', lineHeight: 1.15, marginBottom: 14 }}>
              {profile?.nombre_completo ?? '—'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>
                {ROLE_LABELS[rol] ?? rol}
              </span>
              {profile?.base_nombre && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}>
                  {profile.base_nombre}
                </span>
              )}
              {profile?.turno && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: 'rgba(78,205,196,0.18)', color: '#4ecdc4' }}>
                  Turno {profile.turno}
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '-0.5px' }}>{time}</span>
            </div>
          </div>

          {/* Accesos */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Accesos rapidos</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {modulos.map(m => <TarjetaModulo key={m.id} {...m} navigate={navigate}/>)}
            </div>
          </div>

          {/* Datos de turno */}
          <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e5ea', padding: '18px 22px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Mi turno</div>
            {[
              { label: 'Base',   val: profile?.base_nombre ?? '—' },
              { label: 'Rol',    val: ROLE_LABELS[rol] ?? rol },
              { label: 'Legajo', val: profile?.legajo ? `CAT · ${profile.legajo}` : '—' },
              ...(profile?.turno ? [{ label: 'Turno', val: profile.turno }] : []),
            ].map((r, i, arr) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #f5f5f7' : 'none' }}>
                <span style={{ fontSize: 13, color: '#aeaeb2' }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Columna derecha: notificaciones */}
        {rol !== 'agente' && (
        <div style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e5ea', overflow: 'hidden', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #f0f0f5', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2744', letterSpacing: '0.04em' }}>Actividad reciente</div>
        {actividad.length > 0 && (
        <span style={{ fontSize: 11, fontWeight: 700, background: '#1a2744', color: '#fff', padding: '2px 8px', borderRadius: 10 }}>
            {actividad.length}
            </span>
            )}
          </div>
        <FeedNotificaciones actividad={actividad} loading={loadingFeed}/>
        </div>
        </div>
        )}
      </div>
    </AppShell>
  )
}
