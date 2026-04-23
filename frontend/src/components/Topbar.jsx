/**
 * Topbar.jsx
 * Header interno de módulo. Liviano, sin lógica de navegación global.
 * La navegación global la maneja Sidebar / AppShell.
 *
 * Props opcionales:
 *   title       — título principal del módulo
 *   subtitle    — texto secundario (base, turno, contexto)
 *   actions     — nodo React con botones de acción a la derecha
 *   onBack      — si se pasa, muestra botón volver (para sub-vistas)
 *   backLabel   — texto del botón volver (default: módulo padre)
 */
export default function Topbar({ title, subtitle, actions, onBack, backLabel }) {
  return (
    <div style={{
      background: '#fff',
      borderBottom: '0.5px solid #e5e5ea',
      padding: '0 40px',
      height: 58,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
      gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {onBack && (
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', padding: '4px 6px 4px 0', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500, flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#1a2744'}
            onMouseLeave={e => e.currentTarget.style.color = '#aeaeb2'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            {backLabel && <span>{backLabel}</span>}
          </button>
        )}
        {onBack && (title || subtitle) && (
          <div style={{ width: 1, height: 20, background: '#e5e5ea', flexShrink: 0 }}/>
        )}
        <div style={{ minWidth: 0 }}>
          {title && (
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2744', letterSpacing: '-0.4px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </div>
          )}
          {subtitle && (
            <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: title ? 2 : 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
