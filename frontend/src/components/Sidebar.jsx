/**
 * Sidebar.jsx
 * Navegacion global desktop. Colapsable. Scope por rol.
 * Soporta grupos colapsables para agrupar sub-módulos.
 */
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

const ROLES_OS           = ['gerencia', 'admin', 'jefe_base', 'director', 'planeamiento', 'jefe_cgm', 'coordinador_cgm']
const ROLES_SERVICIOS_AD = ['admin', 'operador_adicionales', 'gerencia', 'director', 'jefe_cgm']
const ROLES_EQUIPO       = ['gerencia', 'admin', 'jefe_base', 'jefe_cgm', 'director', 'coordinador', 'coordinador_cgm', 'supervisor']
const ROLES_SSAA_GRUPO   = [...new Set([...ROLES_OS, ...ROLES_SERVICIOS_AD])]

// ── Íconos ────────────────────────────────────────────────────
const Icons = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  misiones: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  ),
  os: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  ssaaGrupo: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  osAdicional: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  ),
  gestionSA: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  equipo: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3"/>
      <path d="M6 20v-2a6 6 0 0112 0v2"/>
      <circle cx="4" cy="14" r="2"/><path d="M2 20v-1a4 4 0 014-4"/>
      <circle cx="20" cy="14" r="2"/><path d="M22 20v-1a4 4 0 00-4-4"/>
    </svg>
  ),
  chevronLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  chevronRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  chevronDown: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  chevronRight2: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
}

// ── Estructura de navegación ──────────────────────────────────
function getNavItems(rol) {
  const items = [
    {
      id: 'home',
      label: 'Inicio',
      path: '/',
      icon: Icons.home,
    },
    {
      id: 'misiones',
      label: 'Misiones',
      path: '/misiones',
      icon: Icons.misiones,
    },
    {
      id: 'os',
      label: 'Ordenes de servicio',
      path: '/os',
      icon: Icons.os,
      soloRoles: ROLES_OS,
    },
    {
      id: 'ssaa',
      label: 'Servicios Adicionales',
      icon: Icons.ssaaGrupo,
      soloRoles: ROLES_SSAA_GRUPO,
      group: true,
      children: [
        {
          id: 'os_adicional',
          label: 'OS Adicional',
          path: '/os-adicional',
          icon: Icons.osAdicional,
          soloRoles: ROLES_OS,
        },
        {
          id: 'gestion_ssaa',
          label: 'Gestión SS.AA.',
          path: '/servicios-adicionales',
          icon: Icons.gestionSA,
          soloRoles: ROLES_SERVICIOS_AD,
        },
      ],
    },
    {
      id: 'equipo',
      label: 'Mi equipo',
      path: '/equipo',
      icon: Icons.equipo,
      soloRoles: ROLES_EQUIPO,
    },
  ]

  return items
    .filter(i => !i.soloRoles || i.soloRoles.includes(rol))
    .map(i => {
      if (i.group && i.children) {
        return {
          ...i,
          children: i.children.filter(c => !c.soloRoles || c.soloRoles.includes(rol)),
        }
      }
      return i
    })
    .filter(i => !i.group || i.children?.length > 0)
}

const ROLE_LABELS = {
  gerencia: 'Gerencia', jefe_base: 'Jefe de base', jefe_cgm: 'Jefe CGM',
  coordinador: 'Coordinador', coordinador_cgm: 'Coord. CGM',
  supervisor: 'Supervisor', agente: 'Agente',
  admin: 'Admin', director: 'Director', planeamiento: 'Planeamiento',
  operador_adicionales: 'Op. Adicionales', operador_disciplinario: 'Op. Disciplinario',
}

// ── Estilos compartidos ───────────────────────────────────────
const activeBar = {
  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
  width: 3, height: 18, background: '#f5c800', borderRadius: '0 2px 2px 0',
}

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const [expanded, setExpanded]           = useState(true)
  const [expandedGroups, setExpandedGroups] = useState({ ssaa: true })

  const rol    = profile?.role ?? 'agente'
  const items  = getNavItems(rol)
  const nombre = profile?.nombre_completo ?? ''
  const partes = nombre.trim().split(' ')
  const initials = partes.length >= 2
    ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
    : (partes[0]?.[0] ?? '?').toUpperCase()

  const W = expanded ? 220 : 60

  function isActive(path) {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  function toggleGroup(id) {
    if (!expanded) {
      // Sidebar colapsado: expandir sidebar y abrir el grupo
      setExpanded(true)
      setExpandedGroups(g => ({ ...g, [id]: true }))
    } else {
      setExpandedGroups(g => ({ ...g, [id]: !g[id] }))
    }
  }

  function navItemStyle(active, compact = false) {
    return {
      display: 'flex', alignItems: 'center', gap: 10,
      padding: compact
        ? (expanded ? '7px 10px 7px 30px' : '7px 0')
        : (expanded ? '9px 10px' : '9px 0'),
      justifyContent: expanded ? 'flex-start' : 'center',
      borderRadius: 9, cursor: 'pointer',
      background: active
        ? (compact ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.1)')
        : 'transparent',
      color: active ? '#fff' : (compact ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.45)'),
      transition: 'background 0.12s, color 0.12s',
      position: 'relative',
    }
  }

  return (
    <div style={{
      width: W, minWidth: W, height: '100vh',
      background: '#1a2744',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      flexShrink: 0, overflow: 'hidden',
      position: 'relative', zIndex: 10,
    }}>

      {/* Logo + colapso */}
      <div style={{
        padding: expanded ? '18px 16px 16px' : '18px 0 16px',
        display: 'flex', alignItems: 'center',
        justifyContent: expanded ? 'space-between' : 'center',
        borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
      }}>
        {expanded && (
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div style={{ width: 30, height: 30, background: '#f5c800', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#1a2744', flexShrink: 0 }}>BA</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px', lineHeight: 1.2 }}>Plataforma CAT</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>GCBA · DGCAT</div>
            </div>
          </div>
        )}
        {!expanded && (
          <div onClick={() => navigate('/')} style={{ width: 30, height: 30, background: '#f5c800', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#1a2744', cursor: 'pointer' }}>BA</div>
        )}
        <button onClick={() => setExpanded(e => !e)}
          style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 7, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}>
          {expanded ? Icons.chevronLeft : Icons.chevronRight}
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        {items.map(item => {

          // ── Grupo colapsable ──────────────────────────────
          if (item.group) {
            const groupOpen     = !!expandedGroups[item.id]
            const anyChildActive = item.children.some(c => isActive(c.path))

            return (
              <div key={item.id}>
                {/* Cabecera del grupo */}
                <div
                  onClick={() => toggleGroup(item.id)}
                  title={!expanded ? item.label : undefined}
                  style={navItemStyle(anyChildActive)}
                  onMouseEnter={e => {
                    if (!anyChildActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                    e.currentTarget.style.color = anyChildActive ? '#fff' : 'rgba(255,255,255,0.75)'
                  }}
                  onMouseLeave={e => {
                    if (!anyChildActive) e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = anyChildActive ? '#fff' : 'rgba(255,255,255,0.45)'
                  }}>
                  {anyChildActive && <div style={activeBar}/>}
                  <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                  {expanded && (
                    <>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: anyChildActive ? 600 : 400, letterSpacing: '-0.1px', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.25)', display: 'flex', flexShrink: 0 }}>
                        {groupOpen ? Icons.chevronDown : Icons.chevronRight2}
                      </span>
                    </>
                  )}
                </div>

                {/* Sub-ítems */}
                {expanded && groupOpen && item.children.map(child => {
                  const childActive = isActive(child.path)
                  return (
                    <div key={child.id}
                      onClick={() => navigate(child.path)}
                      style={navItemStyle(childActive, true)}
                      onMouseEnter={e => {
                        if (!childActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.color = childActive ? '#fff' : 'rgba(255,255,255,0.65)'
                      }}
                      onMouseLeave={e => {
                        if (!childActive) e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = childActive ? '#fff' : 'rgba(255,255,255,0.38)'
                      }}>
                      {childActive && (
                        <div style={{ ...activeBar, height: 14 }}/>
                      )}
                      <span style={{ flexShrink: 0, display: 'flex' }}>{child.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: childActive ? 600 : 400, letterSpacing: '-0.1px', whiteSpace: 'nowrap' }}>
                        {child.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          }

          // ── Ítem regular ──────────────────────────────────
          const active = isActive(item.path)
          return (
            <div key={item.id}
              onClick={() => navigate(item.path)}
              title={!expanded ? item.label : undefined}
              style={navItemStyle(active)}
              onMouseEnter={e => {
                if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.color = active ? '#fff' : 'rgba(255,255,255,0.75)'
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = active ? '#fff' : 'rgba(255,255,255,0.45)'
              }}>
              {active && <div style={activeBar}/>}
              <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>
              {expanded && (
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, letterSpacing: '-0.1px', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer: perfil + cerrar sesión */}
      <div style={{ padding: expanded ? '12px 8px 16px' : '12px 0 16px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: expanded ? '8px 10px' : '8px 0', justifyContent: expanded ? 'flex-start' : 'center', borderRadius: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f5c800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#1a2744', flexShrink: 0 }}>
            {initials}
          </div>
          {expanded && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {partes[0]} {partes[1] ?? ''}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                {ROLE_LABELS[rol] ?? rol}
              </div>
            </div>
          )}
          {expanded && (
            <button onClick={signOut} title="Cerrar sesion"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4, borderRadius: 6, display: 'flex', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
