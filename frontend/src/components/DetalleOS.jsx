/**
 * DetalleOS.jsx
 * Vista de detalle de una OS ordinaria.
 */
import { useEffect, useState } from 'react'
import api from '../lib/api'
import OSItemPanel from './OSItemPanel'
import ResumenOS from './ResumenOS'

const ESTADO_OS = {
  borrador:   { label: 'Borrador',      bg: '#f5f5f7', color: '#8e8e93' },
  validacion: { label: 'En validacion', bg: '#faeeda', color: '#854f0b' },
  validada:   { label: 'Validada',      bg: '#e8faf2', color: '#0f6e56' },
  vigente:    { label: 'Vigente',       bg: '#e8faf2', color: '#0f6e56' },
  cumplida:   { label: 'Cumplida',      bg: '#f5f5f7', color: '#aeaeb2' },
}

const TIPOS_OS = [
  { id: 'ordinaria',   label: 'Ordinaria',   color: '#1a2744', bg: '#e4eaf5' },
  { id: 'adicional',   label: 'Adicional',   color: '#0f6e56', bg: '#e8faf2' },
  { id: 'alcoholemia', label: 'Alcoholemia', color: '#6b21a8', bg: '#f3e8ff' },
]

function fmtPeriodoOS(os) {
  const fmtDia = d => new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  if (os.fechas?.length > 0) {
    if (os.fechas.length === 1) return fmtDia(os.fechas[0])
    if (os.fechas.length <= 4) return os.fechas.map(fmtDia).join(', ')
    return fmtDia(os.fechas[0]) + ' ... ' + fmtDia(os.fechas[os.fechas.length - 1]) + ' (' + os.fechas.length + ' dias)'
  }
  if (os.semana_inicio && os.semana_fin) {
    const fmt = d => new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
    return fmt(os.semana_inicio) + ' - ' + fmt(os.semana_fin)
  }
  return 'Sin fechas'
}

export default function DetalleOS({ os, onBack, onRefresh }) {
  const [items, setItems]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [publicando, setPublicando]   = useState(false)
  const [showResumen, setShowResumen] = useState(false)

  useEffect(() => { fetchItems() }, [os.id])

  async function fetchItems() {
    setLoading(true)
    try {
      const data = await api.get('/api/os/' + os.id)
      setItems(data.items ?? [])
    } catch (e) { console.warn('Error cargando items:', e) }
    setLoading(false)
  }

  async function handleEnviarValidacion() {
    setPublicando(true)
    try {
      await api.post('/api/os/' + os.id + '/enviar-validacion', {})
      onRefresh(); onBack()
    } catch (e) { console.warn('Error enviando a validacion:', e) }
    setPublicando(false)
  }

  async function handleGenerarHoy() {
    setPublicando(true)
    try {
      const res = await api.post('/api/os/' + os.id + '/generar-hoy', {})
      alert('Se generaron ' + res.misiones_creadas + ' misiones.')
    } catch (e) {
      if (e.status === 409) alert('Ya se generaron misiones hoy para esta OS.')
      else alert('Error al generar misiones.')
    }
    setPublicando(false)
  }

  const readOnly   = os.estado === 'cumplida' || os.estado === 'validacion'
  const esBorrador = os.estado === 'borrador'
  const esVigente  = os.estado === 'vigente'
  const tieneItems = items.filter(i => !i._local).length > 0
  const tipoInfo   = TIPOS_OS.find(t => t.id === os.tipo) ?? TIPOS_OS[0]
  const estadoInfo = ESTADO_OS[os.estado] ?? ESTADO_OS.borrador

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>

      {showResumen && <ResumenOS os={os} onClose={() => setShowResumen(false)}/>}

      {/* Subheader — igual que el de Misiones */}
      <div style={{ background: '#fff', padding: '12px 32px', borderBottom: '0.5px solid #e0e4ed', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>

          {/* Botón volver */}
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', padding: '4px 2px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#1a2744'}
            onMouseLeave={e => e.currentTarget.style.color = '#aeaeb2'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Ordenes</span>
          </button>

          <div style={{ width: 1, height: 20, background: '#e0e4ed', flexShrink: 0 }}/>

          {/* Identidad de la OS */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2744' }}>
              OS-{String(os.numero).padStart(3, '0')}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: tipoInfo.bg, color: tipoInfo.color }}>
              {tipoInfo.label}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: estadoInfo.bg, color: estadoInfo.color }}>
              {estadoInfo.label}
            </span>
            <span style={{ fontSize: 12, color: '#aeaeb2' }}>{fmtPeriodoOS(os)}</span>
            <span style={{ fontSize: 12, color: '#c7c7cc' }}>· {items.filter(i => !i._local).length} items</span>
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {tieneItems && (
              <button onClick={() => setShowResumen(true)}
                style={{ padding: '7px 14px', borderRadius: 9, border: '0.5px solid #dde2ec', background: '#fff', color: '#1a2744', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 1px 3px rgba(26,39,68,0.06)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                Resumen
              </button>
            )}
            {esVigente && (
              <button onClick={handleGenerarHoy} disabled={publicando}
                style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: '#185fa5', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 4px rgba(24,95,165,0.25)' }}>
                {publicando ? '...' : 'Generar hoy'}
              </button>
            )}
            {esBorrador && tieneItems && (
              <button onClick={handleEnviarValidacion} disabled={publicando}
                style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: '#854f0b', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {publicando ? '...' : 'Enviar a validacion'}
              </button>
            )}
            {os.estado === 'validacion' && (
              <div style={{ fontSize: 12, color: '#854f0b', background: '#faeeda', padding: '6px 12px', borderRadius: 8, fontWeight: 600, border: '0.5px solid #f5c800' }}>
                Pendiente de aprobacion
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '20px 28px 0', background: '#eef1f6' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#aeaeb2' }}>Cargando...</div>
        ) : (
          <OSItemPanel os={os} items={items} onItemsChange={fetchItems} readOnly={readOnly}/>
        )}
      </div>
    </div>
  )
}
