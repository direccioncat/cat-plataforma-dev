import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { ESTADO_LABELS } from './ServiciosAdicionales'

const FILTROS = [
  { key: '',           label: 'Todos' },
  { key: 'pendiente',  label: 'Pendientes' },
  { key: 'en_gestion', label: 'En gestión' },
  { key: 'convocado',  label: 'Convocados' },
  { key: 'en_curso',   label: 'En curso' },
  { key: 'cerrado',    label: 'Cerrados' },
]

function formatFecha(fecha) {
  if (!fecha) return '—'
  const d = new Date(fecha + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function SALista({ onSeleccionar, onVolver, sinHeader }) {
  const [servicios, setServicios] = useState([])
  const [cargando, setCargando]   = useState(true)
  const [filtro, setFiltro]       = useState('')
  const [error, setError]         = useState(null)

  useEffect(() => {
    cargar()
  }, [filtro])

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const path = filtro
        ? `/api/servicios-adicionales?estado=${filtro}`
        : '/api/servicios-adicionales'
      const data = await api.get(path)
      setServicios(data)
    } catch (e) {
      setError(e.message || 'Error al cargar servicios')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header — solo si no viene de ServiciosAdicionales wrapper */}
      {!sinHeader && (
        <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e5ea', padding: '20px 44px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={onVolver}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', padding: 0, display: 'flex', alignItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
              </button>
              <div>
                <div style={{ fontSize: 11, color: '#aeaeb2', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>Módulo</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1a2744', letterSpacing: '-0.5px' }}>Servicios Adicionales</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={cargar}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '0.5px solid #e5e5ea', background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
                Actualizar
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {FILTROS.map(f => (
              <button key={f.key} onClick={() => setFiltro(f.key)}
                style={{ padding: '8px 16px', borderRadius: '10px 10px 0 0', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s', background: filtro === f.key ? '#1a2744' : 'transparent', color: filtro === f.key ? '#fff' : '#8e8e93' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contenido */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 44px' }}>
        {cargando && (
          <div style={{ textAlign: 'center', padding: 60, color: '#aeaeb2', fontSize: 14 }}>
            Cargando servicios...
          </div>
        )}

        {error && (
          <div style={{ background: '#fff0f0', border: '0.5px solid #ffc0c0', borderRadius: 12, padding: '14px 18px', color: '#c0392b', fontSize: 14 }}>
            {error}
          </div>
        )}

        {!cargando && !error && servicios.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: 6 }}>
              No hay servicios {filtro ? `en estado "${ESTADO_LABELS[filtro]?.label}"` : ''}
            </div>
            <div style={{ fontSize: 14, color: '#aeaeb2' }}>
              Los servicios aparecen cuando se remite una OS adicional validada.
            </div>
          </div>
        )}

        {!cargando && servicios.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
            {servicios.map(s => (
              <ServicioCard key={s.id} servicio={s} onClick={() => onSeleccionar(s.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const DOT_TIPOS = [
  { key: 'dotacion_agentes',      label: 'Inf',  bg: '#eef1f8', color: '#1a2744' },
  { key: 'dotacion_supervisores', label: 'Sup',  bg: '#e8f5ee', color: '#0a5c3a' },
  { key: 'dotacion_motorizados',  label: 'Mot',  bg: '#f0ebff', color: '#5b21b6' },
]

function ServicioCard({ servicio: s, onClick }) {
  const estado      = ESTADO_LABELS[s.estado] || { label: s.estado, color: '#636366', bg: '#f5f5f7', text: '#636366' }
  const dotItems    = DOT_TIPOS.filter(d => (s[d.key] || 0) > 0)
  const totalReq    = dotItems.reduce((sum, d) => sum + (s[d.key] || 0), 0)
  const asignados   = parseInt(s.total_asignados) || 0
  const confirmados = parseInt(s.total_confirmados) || 0
  const base        = totalReq > 0 ? totalReq : asignados
  const pct         = base > 0 ? Math.min(100, Math.round(confirmados / base * 100)) : 0
  const barColor    = pct === 100 ? '#0f6e56' : pct >= 50 ? '#185fa5' : '#f5c800'

  return (
    <div onClick={onClick}
      style={{
        background: '#fff', borderRadius: 16, border: '0.5px solid #dde2ec',
        padding: '16px 18px', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s',
        borderLeft: `4px solid ${estado.color}`,
        boxShadow: '0 1px 3px rgba(26,39,68,0.05)',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,39,68,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(26,39,68,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}>

      {/* Nombre + estado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.os_nombre || 'Sin nombre'}
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 7, whiteSpace: 'nowrap', background: estado.bg, color: estado.text, flexShrink: 0 }}>
          {estado.label}
        </span>
      </div>

      {/* Evento/motivo */}
      {s.os_evento_motivo && (
        <div style={{ fontSize: 12, color: '#636366', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {s.os_evento_motivo}
        </div>
      )}

      {/* Fila central: dotación + horario */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', margin: '8px 0 12px' }}>
        {dotItems.map(d => (
          <span key={d.key} style={{
            fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
            background: d.bg, color: d.color,
          }}>
            {s[d.key]} {d.label}
          </span>
        ))}
        {s.modulos_calculados > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: '#f5f5f7', color: '#636366' }}>
            {s.modulos_calculados} mód.
          </span>
        )}
        {s.horario_desde && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8e8e93', marginLeft: dotItems.length > 0 ? 'auto' : 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {s.horario_desde.slice(0,5)} – {s.horario_hasta?.slice(0,5)}
          </span>
        )}
      </div>

      {/* Footer: barra de progreso — siempre visible */}
      <div style={{ borderTop: '0.5px solid #eef1f6', paddingTop: 10, marginTop: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: base > 0 ? 5 : 0 }}>
          <span style={{ fontSize: 12, color: confirmados > 0 ? '#0f6e56' : '#aeaeb2', fontWeight: confirmados > 0 ? 600 : 400 }}>
            {confirmados > 0 ? `✓ ${confirmados} confirmados` : asignados > 0 ? `${asignados} asignados` : 'Sin asignados aún'}
          </span>
          {base > 0 && (
            <span style={{ fontSize: 11, color: '#aeaeb2', fontWeight: 600 }}>
              {confirmados}/{base}
            </span>
          )}
        </div>
        {base > 0 && (
          <div style={{ height: 3, borderRadius: 2, background: '#eef1f6', overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', borderRadius: 2, background: barColor, transition: 'width 0.3s' }}/>
          </div>
        )}
      </div>
    </div>
  )
}
