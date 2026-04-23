/**
 * AppShell.jsx
 * Layout principal del sistema CAT.
 * Sidebar colapsable (desktop) + topbar + navbar mobile.
 * Reemplaza Topbar.jsx en todos los modulos.
 *
 * Props:
 *   children     — contenido del modulo
 *   accionHeader — { label, onClick } boton de accion contextual (ej: "+ Nueva OS")
 */
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ── Paleta ────────────────────────────────────────────────────
const C = {
  sidebar:      '#1a2744',
  sidebarHover: '#243356',
  sidebarActive:'#2d4a8a',
  accent:       '#f5c800',
  text:         '#fff',
  textMuted:    'rgba(255,255,255,0.38)',
  textSub:      'rgba(255,255,255,0.6)',
  bg:           '#eef1f6',
  border:       'rgba(255,255,255,0.08)',
}

// ── Navegacion por rol ────────────────────────────────────────
const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Inicio',
    path: '/',
    exact: true,
    roles: null, // todos
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'misiones',
    label: 'Misiones',
    path: '/misiones',
    roles: null,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    id: 'os',
    label: 'Ordenes de servicio',
    path: '/os',
    roles: ['gerencia', 'admin', 'jefe_base', 'director', 'planeamiento', 'jefe_cgm', 'coordinador_cgm'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    id: 'servicios_adicionales',
    label: 'Serv. adicionales',
    path: '/servicios-adicionales',
    roles: ['admin', 'operador_adicionales', 'gerencia', 'director', 'jefe_cgm'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    id: 'equipo',
    label: 'Mi equipo',
    path: '/equipo',
    roles: ['gerencia', 'admin', 'jefe_base', 'jefe_cgm', 'director', 'coordinador', 'coordinador_cgm', 'supervisor'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3"/>
        <path d="M6 20v-2a6 6 0 0112 0v2"/>
        <circle cx="4" cy="14" r="2"/><path d="M2 20v-1a4 4 0 014-4"/>
        <circle cx="20" cy="14" r="2"/><path d="M22 20v-1a4 4 0 00-4-4"/>
      </svg>
    ),
  },
]

// ── Iniciales ─────────────────────────────────────────────────
function getInitials(nombre) {
  if (!nombre) return '?'
  const p = nombre.trim().split(' ')
  return p.length >= 2
    ? `${p[0][0]}${p[1][0]}`.toUpperCase()
    : p[0][0].toUpperCase()
}

// ── Sidebar item ──────────────────────────────────────────────
function SidebarItem({ item, active, expanded, onClick }) {
  const [hovered, setHovered] = useState(false)
  const highlighted = active || hovered

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={!expanded ? item.label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: expanded ? '9px 14px' : '9px 0',
        justifyContent: expanded ? 'flex-start' : 'center',
        borderRadius: 10,
        cursor: 'pointer',
        background: active
          ? C.sidebarActive
          : hovered
          ? C.sidebarHover
          : 'transparent',
        color: active ? '#fff' : hovered ? 'rgba(255,255,255,0.9)' : C.textSub,
        transition: 'background 0.15s, color 0.15s',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* indicador activo */}
      {active && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: '20%',
          height: '60%',
          width: 3,
          borderRadius: '0 3px 3px 0',
          background: C.accent,
        }}/>
      )}
      <span style={{ flexShrink: 0, display: 'flex', opacity: active ? 1 : 0.75 }}>
        {item.icon}
      </span>
      {expanded && (
        <span style={{
          fontSize: 13,
          fontWeight: active ? 700 : 500,
          letterSpacing: '-0.1px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          opacity: 1,
          transition: 'opacity 0.15s',
        }}>
          {item.label}
        </span>
      )}
    </div>
  )
}

// ── SIDEBAR DESKTOP ───────────────────────────────────────────
function Sidebar({ expanded, onToggle, items, currentPath, onNavigate, profile, onSignOut }) {
  const W = expanded ? 220 : 60

  return (
    <div style={{
      width: W,
      minWidth: W,
      height: '100vh',
      background: C.sidebar,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'width 0.2s cubic-bezier(0.4,0,0.2,1), min-width 0.2s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
      borderRight: `1px solid ${C.border}`,
      zIndex: 50,
    }}>

      {/* Logo + toggle */}
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: expanded ? 'space-between' : 'center',
        padding: expanded ? '0 14px 0 16px' : '0',
        flexShrink: 0,
        borderBottom: `1px solid ${C.border}`,
      }}>
        {expanded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 28, height: 28,
              background: C.accent,
              borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 900, color: C.sidebar, letterSpacing: '-0.5px',
              flexShrink: 0,
            }}>
              CAT
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px', lineHeight: 1.2 }}>Plataforma</div>
              <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.05em' }}>GCBA · DGCAT</div>
            </div>
          </div>
        )}
        {!expanded && (
          <div style={{
            width: 28, height: 28,
            background: C.accent,
            borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 900, color: C.sidebar,
          }}>
            CAT
          </div>
        )}
        {expanded && (
          <button
            onClick={onToggle}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.textMuted, padding: 4, borderRadius: 6, display: 'flex',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: expanded ? '12px 10px' : '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        {!expanded && (
          <button
            onClick={onToggle}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.textMuted, padding: '8px 0', borderRadius: 8,
              display: 'flex', justifyContent: 'center', marginBottom: 6,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
            title="Expandir menú"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
        {items.map(item => {
          const active = item.exact
            ? currentPath === item.path
            : currentPath.startsWith(item.path) && item.path !== '/'
              ? true
              : item.exact === undefined && item.path === '/'
              ? currentPath === '/'
              : currentPath === item.path
          return (
            <SidebarItem
              key={item.id}
              item={item}
              active={active}
              expanded={expanded}
              onClick={() => onNavigate(item.path)}
            />
          )
        })}
      </nav>

      {/* Footer: perfil + logout */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        padding: expanded ? '12px 10px' : '12px 8px',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: expanded ? '8px 10px' : '8px 0',
          justifyContent: expanded ? 'flex-start' : 'center',
          borderRadius: 10,
        }}>
          {/* Avatar */}
          <div style={{
            width: 30, height: 30,
            borderRadius: '50%',
            background: C.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: C.sidebar,
            flexShrink: 0,
          }}>
            {getInitials(profile?.nombre_completo)}
          </div>
          {expanded && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.nombre_completo?.split(' ')[0] ?? '—'}
              </div>
              <div style={{ fontSize: 10, color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.base_nombre ?? '—'}
              </div>
            </div>
          )}
          {expanded && (
            <button
              onClick={onSignOut}
              title="Cerrar sesion"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.textMuted, padding: 4, borderRadius: 6, display: 'flex',
                flexShrink: 0, transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#e24b4a'}
              onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── TOPBAR DESKTOP ────────────────────────────────────────────
function TopbarDesktop({ titulo, accionHeader, subtitulo }) {
  return (
    <div style={{
      height: 56,
      background: '#fff',
      borderBottom: '0.5px solid #e0e4ed',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2744', letterSpacing: '-0.4px' }}>
          {titulo}
        </div>
        {subtitulo && (
          <div style={{ fontSize: 13, color: '#aeaeb2', fontWeight: 400 }}>{subtitulo}</div>
        )}
      </div>
      {accionHeader && (
        <button
          onClick={accionHeader.onClick}
          style={{
            padding: '8px 18px',
            borderRadius: 10,
            border: 'none',
            background: '#1a2744',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {accionHeader.icon && <span>{accionHeader.icon}</span>}
          {accionHeader.label}
        </button>
      )}
    </div>
  )
}

// ── NAVBAR MOBILE ─────────────────────────────────────────────
function NavbarMobileShell({ items, currentPath, onNavigate }) {
  // Mobile muestra solo los primeros 4 items mas relevantes
  const itemsMobile = items.slice(0, 4)

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      background: 'rgba(17,24,39,0.97)',
      backdropFilter: 'blur(16px)',
      borderTop: `1px solid ${C.border}`,
      padding: '8px 0 20px',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 100,
    }}>
      {itemsMobile.map(item => {
        const active = item.exact
          ? currentPath === item.path
          : currentPath === item.path
        return (
          <div
            key={item.id}
            onClick={() => onNavigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              padding: '4px 16px',
              color: active ? C.accent : C.textMuted,
              transition: 'color 0.15s',
            }}
          >
            <span style={{ display: 'flex' }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: '0.02em' }}>
              {item.label.split(' ')[0]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── APP SHELL (componente principal) ─────────────────────────
export default function AppShell({ children, titulo, accionHeader }) {
  const { profile, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem('cat_sidebar') !== 'collapsed' } catch { return true }
  })
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  function toggleSidebar() {
    setExpanded(v => {
      const next = !v
      try { localStorage.setItem('cat_sidebar', next ? 'expanded' : 'collapsed') } catch {}
      return next
    })
  }

  function handleNavigate(path) {
    navigate(path)
  }

  // Filtrar items segun rol
  const rol = profile?.role ?? 'agente'
  const items = NAV_ITEMS.filter(item => !item.roles || item.roles.includes(rol))

  // Titulo inferido si no se pasa
  const tituloActual = titulo ?? (
    NAV_ITEMS.find(i => i.exact
      ? location.pathname === i.path
      : location.pathname.startsWith(i.path) && i.path !== '/'
      ? true
      : location.pathname === i.path
    )?.label ?? 'Plataforma CAT'
  )

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 64 }}>
        {/* Topbar mobile */}
        <div style={{
          background: C.sidebar,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 24, height: 24, background: C.accent, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: C.sidebar }}>CAT</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{tituloActual}</span>
          </div>
          {accionHeader && (
            <button onClick={accionHeader.onClick} style={{ background: C.accent, border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sidebar} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          )}
        </div>
        {children}
        <NavbarMobileShell items={items} currentPath={location.pathname} onNavigate={handleNavigate} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.bg }}>
      <Sidebar
        expanded={expanded}
        onToggle={toggleSidebar}
        items={items}
        currentPath={location.pathname}
        onNavigate={handleNavigate}
        profile={profile}
        onSignOut={signOut}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopbarDesktop
          titulo={tituloActual}
          accionHeader={accionHeader}
          subtitulo={location.pathname === '/' ? new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : undefined}
        />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
