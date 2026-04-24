import { useState, useEffect } from 'react'
import api from '../../lib/api'

const ESTADOS = [
  { key: 'pendiente',      label: 'Pendiente',      bg: '#f5f5f7', color: '#8e8e93',  dot: '#c7c7cc' },
  { key: 'solicitado',     label: 'Solicitado',     bg: '#fff8e1', color: '#b45309',  dot: '#f5c800' },
  { key: 'confirmado',     label: 'Confirmado',     bg: '#e8f5e9', color: '#1a7c4a',  dot: '#22c55e' },
  { key: 'no_disponible',  label: 'No disponible',  bg: '#feecec', color: '#c0392b',  dot: '#e24b4a' },
]

function estadoInfo(key) {
  return ESTADOS.find(e => e.key === key) || ESTADOS[0]
}

function RecursoRow({ recurso, onUpdate }) {
  const [editando,    setEditando]    = useState(false)
  const [estado,      setEstado]      = useState(recurso.estado || 'pendiente')
  const [observacion, setObservacion] = useState(recurso.observacion || '')
  const [guardando,   setGuardando]   = useState(false)
  const info = estadoInfo(estado)

  async function guardar() {
    setGuardando(true)
    const result = await onUpdate(recurso.id, { estado, observacion: observacion || null })
    if (result) setEditando(false)
    setGuardando(false)
  }

  function cancelar() {
    setEstado(recurso.estado || 'pendiente')
    setObservacion(recurso.observacion || '')
    setEditando(false)
  }

  const INP = {
    width: '100%', boxSizing: 'border-box',
    background: '#f5f5f7', border: 'none', borderRadius: 8,
    padding: '7px 10px', fontSize: 12, color: '#1d1d1f',
    fontFamily: 'inherit', outline: 'none', resize: 'vertical',
  }

  return (
    <div style={{ background: '#fff', border: '0.5px solid #e5e5ea', borderRadius: 12, marginBottom: 6, overflow: 'hidden' }}>
      {/* Fila principal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        {/* Cantidad */}
        <div style={{ minWidth: 36, height: 36, borderRadius: 9, background: '#f0f0f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1a2744' }}>{recurso.cantidad}</span>
        </div>

        {/* Tipo */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{recurso.tipo}</div>
          {recurso.observacion && !editando && (
            <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {recurso.observacion}
            </div>
          )}
        </div>

        {/* Badge estado */}
        {!editando && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: estadoInfo(recurso.estado || 'pendiente').bg, flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: estadoInfo(recurso.estado || 'pendiente').dot }}/>
            <span style={{ fontSize: 11, fontWeight: 600, color: estadoInfo(recurso.estado || 'pendiente').color }}>
              {estadoInfo(recurso.estado || 'pendiente').label}
            </span>
          </div>
        )}

        {/* Botón editar */}
        <button onClick={() => editando ? cancelar() : setEditando(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c7c7cc', padding: '4px', borderRadius: 6, flexShrink: 0, fontSize: 13 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#636366'; e.currentTarget.style.background = '#f5f5f7' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#c7c7cc'; e.currentTarget.style.background = 'none' }}>
          {editando ? '✕' : '✎'}
        </button>
      </div>

      {/* Panel de edición */}
      {editando && (
        <div style={{ padding: '0 14px 14px', borderTop: '0.5px solid #f5f5f7' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {ESTADOS.map(e => (
              <button key={e.key} onClick={() => setEstado(e.key)}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: estado === e.key ? e.dot : '#f5f5f7',
                  color: estado === e.key ? '#fff' : '#636366',
                  transition: 'all 0.12s',
                }}>
                {e.label}
              </button>
            ))}
          </div>
          <textarea
            value={observacion}
            onChange={e => setObservacion(e.target.value)}
            placeholder="Observación (opcional)..."
            rows={2}
            style={INP}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={cancelar}
              style={{ flex: 1, padding: '7px', borderRadius: 9, border: '0.5px solid #e5e5ea', background: '#fff', color: '#636366', fontSize: 12, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando}
              style={{ flex: 2, padding: '7px', borderRadius: 9, border: 'none', background: guardando ? '#aeaeb2' : '#1a2744', color: '#fff', fontSize: 12, fontWeight: 700, cursor: guardando ? 'default' : 'pointer' }}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SeccionRecursos({ titulo, icono, recursos, onUpdate }) {
  if (recursos.length === 0) return null
  const confirmados = recursos.filter(r => r.estado === 'confirmado').length
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #dde2ec', padding: '20px 24px', marginBottom: 20 }}>
      {/* Header sección */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icono}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2744', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{titulo}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#f0f0f5', color: '#636366' }}>{recursos.length}</span>
        </div>
        {confirmados > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#e8f5e9', color: '#1a7c4a' }}>
            {confirmados}/{recursos.length} confirmados
          </span>
        )}
      </div>
      {recursos.map(r => (
        <RecursoRow key={r.id} recurso={r} onUpdate={onUpdate} />
      ))}
    </div>
  )
}

export default function SATabRecursos({ servicioId }) {
  const [recursos,  setRecursos]  = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => { cargar() }, [servicioId])

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const data = await api.get('/api/servicios-adicionales/' + servicioId + '/recursos')
      setRecursos(data)
    } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }

  async function handleUpdate(recursoId, body) {
    try {
      const updated = await api.patch(
        `/api/servicios-adicionales/${servicioId}/recursos/${recursoId}/estado`,
        body
      )
      setRecursos(prev => prev.map(r =>
        r.id === recursoId ? { ...r, estado: updated.estado, observacion: updated.observacion } : r
      ))
      return true
    } catch (e) {
      alert('Error al guardar: ' + e.message)
      return false
    }
  }

  const vehiculos = recursos.filter(r => r.categoria === 'vehiculo')
  const elementos = recursos.filter(r => r.categoria === 'elemento')

  if (cargando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#aeaeb2', fontSize: 14 }}>
      Cargando recursos…
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#c0392b', fontSize: 14 }}>
      {error}
    </div>
  )

  if (recursos.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10 }}>
      <span style={{ fontSize: 36 }}>📦</span>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2744' }}>Sin recursos asignados</div>
      <div style={{ fontSize: 13, color: '#aeaeb2' }}>La OS adicional vinculada no tiene recursos cargados todavía</div>
    </div>
  )

  // Resumen de estados
  const stats = ESTADOS.map(e => ({ ...e, count: recursos.filter(r => (r.estado || 'pendiente') === e.key).length })).filter(e => e.count > 0)

  return (
    <div style={{ padding: '28px 44px', maxWidth: 860 }}>

      {/* Resumen */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {stats.map(e => (
          <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, background: e.bg, border: '0.5px solid ' + e.dot + '40' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: e.dot }}/>
            <span style={{ fontSize: 12, fontWeight: 600, color: e.color }}>{e.count} {e.label}{e.count !== 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>

      <SeccionRecursos titulo="Vehículos" icono="🚗" recursos={vehiculos} onUpdate={handleUpdate} />
      <SeccionRecursos titulo="Elementos" icono="📦" recursos={elementos} onUpdate={handleUpdate} />
    </div>
  )
}
