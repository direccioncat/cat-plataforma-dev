import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { ESTADO_LABELS } from './ServiciosAdicionales'

const FILTROS = [
  { key: '',           label: 'Todos' },
  { key: 'en_gestion', label: 'En gestión' },
  { key: 'convocado',  label: 'Convocados' },
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

function ServicioCard({ servicio: s, onClick }) {
  const estado = ESTADO_LABELS[s.estado] || { label: s.estado, color: '#636366', bg: '#f5f5f7', text: '#636366' }
  const totalReq = (s.dotacion_agentes || 0) + (s.dotacion_supervisores || 0) + (s.dotacion_motorizados || 0)

  return (
    <div onClick={onClick}
      style={{
        background: '#fff', borderRadius: 16, border: '0.5px solid #dde2ec',
        padding: '18px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s',
        borderLeft: `4px solid ${estado.color}`,
        boxShadow: '0 1px 3px rgba(26,39,68,0.05)',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,39,68,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(26,39,68,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}>

      {/* Header card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.os_nombre || 'Sin nombre'}
          </div>
          {s.os_evento_motivo && (
            <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.os_evento_motivo}
            </div>
          )}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap',
          background: estado.bg, color: estado.text,
        }}>
          {estado.label}
        </span>
      </div>

      {/* Datos */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#636366' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {formatFecha(s.fecha_servicio)}
        </div>
        {s.horario_desde && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#636366' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {s.horario_desde?.slice(0,5)} – {s.horario_hasta?.slice(0,5)}
          </div>
        )}
        {s.base_nombre && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#636366' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {s.base_nombre}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.5px solid #e8ecf4', paddingTop: 10 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {totalReq > 0 && (
            <span style={{ fontSize: 12, color: '#636366' }}>
              <span style={{ fontWeight: 700, color: '#1a2744' }}>{totalReq}</span> requeridos
            </span>
          )}
          {s.total_confirmados > 0 && (
            <span style={{ fontSize: 12, color: '#0f6e56', fontWeight: 600 }}>
              ✓ {s.total_confirmados} confirmados
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: '#aeaeb2' }}>
          {s.modulos_calculados ? `${s.modulos_calculados} módulos` : ''}
        </span>
      </div>
    </div>
  )
}
