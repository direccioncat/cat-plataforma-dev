import { useEffect, useState, useRef } from 'react'
import api from '../lib/api'

// ── Config por tipo ───────────────────────────────────────────
const TIPOS_CONFIG = {
  mision_asignada:     { label: 'Asignada',     color: '#854f0b', dot: '#f59e0b' },
  mision_aceptada:     { label: 'Aceptada',     color: '#0f6e56', dot: '#10b981' },
  mision_rechazada:    { label: 'Rechazada',    color: '#a32d2d', dot: '#ef4444' },
  mision_en_curso:     { label: 'En curso',     color: '#185fa5', dot: '#3b82f6' },
  mision_cerrada:      { label: 'Cerrada',      color: '#0f6e56', dot: '#10b981' },
  mision_interrumpida: { label: 'Interrumpida', color: '#854f0b', dot: '#f59e0b' },
  mision_creada:       { label: 'Nueva',        color: '#185fa5', dot: '#3b82f6' },
  agente_reasignado:   { label: 'Reasignado',   color: '#534ab7', dot: '#8b5cf6' },
  agente_liberado:     { label: 'Liberado',     color: '#636366', dot: '#9ca3af' },
}

function tiempoRelativo(fecha) {
  if (!fecha) return ''
  const diff = Math.floor((Date.now() - new Date(fecha)) / 1000)
  if (diff < 60)    return 'ahora'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

// ── Item del timeline ─────────────────────────────────────────
function ItemActividad({ item, onClick, esUltimo }) {
  const cfg        = TIPOS_CONFIG[item.tipo] ?? { label: item.tipo, color: '#8e8e93', dot: '#c7c7cc' }
  const esMisionLink = !!item.mision_id
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => esMisionLink && onClick && onClick(item)}
      onMouseEnter={() => esMisionLink && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: 0,
        cursor: esMisionLink ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      {/* Línea + punto */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
        <div style={{
          width: 9, height: 9,
          borderRadius: '50%',
          background: cfg.dot,
          flexShrink: 0,
          marginTop: 4,
          zIndex: 1,
          boxShadow: `0 0 0 2px #fff, 0 0 0 3px ${cfg.dot}44`,
          transition: 'transform 0.15s',
          transform: hovered ? 'scale(1.3)' : 'scale(1)',
        }}/>
        {!esUltimo && (
          <div style={{ width: 1, flex: 1, background: '#e8ecf4', minHeight: 16, marginTop: 4 }}/>
        )}
      </div>

      {/* Contenido */}
      <div style={{
        flex: 1,
        paddingBottom: esUltimo ? 0 : 18,
        paddingRight: 6,
        background: hovered ? '#f8f9fc' : 'transparent',
        borderRadius: 10,
        padding: hovered ? '6px 8px 6px 4px' : '0 6px 18px 4px',
        marginLeft: -2,
        transition: 'background 0.15s, padding 0.1s',
      }}>
        {/* Descripción */}
        <div style={{
          fontSize: 12,
          color: esMisionLink ? '#1a2744' : '#636366',
          lineHeight: 1.45,
          fontWeight: esMisionLink ? 500 : 400,
        }}>
          {item.descripcion}
        </div>

        {/* Misión tag */}
        {item.mision_titulo && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#eef1f6', borderRadius: 6,
            padding: '2px 7px', marginTop: 4,
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            <span style={{ fontSize: 10, color: '#8e8e93', fontWeight: 600 }}>{item.mision_titulo}</span>
          </div>
        )}

        {/* Meta: tiempo + agente + tipo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: '#c7c7cc', fontWeight: 500 }}>
            {tiempoRelativo(item.created_at)}
          </span>
          {item.nombre_completo && (
            <>
              <span style={{ color: '#e0e4ed', fontSize: 10 }}>·</span>
              <span style={{ fontSize: 10, color: '#aeaeb2' }}>{item.nombre_completo}</span>
            </>
          )}
          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: `${cfg.dot}18`, color: cfg.color, marginLeft: 'auto' }}>
            {cfg.label}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Separador de tiempo ───────────────────────────────────────
function SeparadorTiempo({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0 12px', paddingLeft: 14 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#c7c7cc', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: '#f0f2f8' }}/>
    </div>
  )
}

// ── Agrupar items por franja horaria ──────────────────────────
function agruparPorTiempo(items) {
  const grupos = []
  let grupoActual = null

  for (const item of items) {
    const diff = Math.floor((Date.now() - new Date(item.created_at)) / 60000)
    const franja = diff < 15 ? 'Ahora' : diff < 60 ? 'Última hora' : diff < 1440 ? 'Hoy' : 'Anterior'

    if (!grupoActual || grupoActual.franja !== franja) {
      grupoActual = { franja, items: [] }
      grupos.push(grupoActual)
    }
    grupoActual.items.push(item)
  }
  return grupos
}

// ── Componente principal ──────────────────────────────────────
export default function FeedActividad({ onSelectMision, rolUsuario, modoSheet = false, onNuevosChange, socketRef }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [nuevos, setNuevos]   = useState(0)
  const listRef = useRef(null)

  const esSupervisorOSuperior = ['gerencia', 'jefe_base', 'coordinador', 'supervisor', 'admin'].includes(rolUsuario)

  useEffect(() => {
    if (!esSupervisorOSuperior) return
    fetchActividad()
    const socket = socketRef?.current
    if (socket) {
      socket.on('actividad:nueva', (evento) => {
        setItems(prev => [evento, ...prev.slice(0, 49)])
        setNuevos(n => n + 1)
      })
      return () => socket.off('actividad:nueva')
    }
  }, [])

  useEffect(() => {
    if (onNuevosChange) onNuevosChange(nuevos)
  }, [nuevos])

  async function fetchActividad() {
    setLoading(true)
    try {
      const data = await api.get('/api/actividad?limite=50')
      setItems(data ?? [])
    } catch (e) { console.warn('Error cargando actividad:', e) }
    setLoading(false)
  }

  async function handleClick(item) {
    if (!item.mision_id || !onSelectMision) return
    try {
      const mision = await api.get(`/api/misiones/${item.mision_id}`)
      if (mision) onSelectMision(mision)
    } catch (e) { console.warn('Error cargando misión desde actividad:', e) }
    setNuevos(0)
  }

  if (!esSupervisorOSuperior) return null

  const grupos = agruparPorTiempo(items)

  const contenido = loading ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '16px 14px' }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ display: 'flex', gap: 12, opacity: 0.4 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#dde2ec', marginTop: 4, flexShrink: 0 }}/>
          <div style={{ flex: 1 }}>
            <div style={{ height: 10, background: '#eef1f6', borderRadius: 5, width: '80%', marginBottom: 6 }}/>
            <div style={{ height: 8, background: '#eef1f6', borderRadius: 5, width: '45%' }}/>
          </div>
        </div>
      ))}
    </div>
  ) : items.length === 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: 10 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: '#eef1f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="1.5">
          <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/>
        </svg>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2744', textAlign: 'center' }}>Sin actividad aún</div>
      <div style={{ fontSize: 12, color: '#aeaeb2', textAlign: 'center', lineHeight: 1.5 }}>Las acciones del sistema aparecerán aquí en tiempo real</div>
    </div>
  ) : (
    <div style={{ padding: '8px 14px 16px' }}>
      {grupos.map((grupo, gi) => {
        const todosLosItems = grupo.items
        return (
          <div key={gi}>
            <SeparadorTiempo label={grupo.franja} />
            {todosLosItems.map((item, ii) => (
              <ItemActividad
                key={item.id}
                item={item}
                onClick={handleClick}
                esUltimo={ii === todosLosItems.length - 1 && gi === grupos.length - 1}
              />
            ))}
          </div>
        )
      })}
    </div>
  )

  if (modoSheet) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div ref={listRef} style={{ flex: 1, overflow: 'auto', scrollbarWidth: 'none' }}>
        {contenido}
      </div>
    </div>
  )

  return (
    <div style={{ width: 280, flexShrink: 0, borderLeft: '0.5px solid #e0e4ed', display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '0.5px solid #e8ecf4', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>Actividad</span>
            {nuevos > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#e24b4a', color: '#fff', padding: '1px 7px', borderRadius: 10 }}>
                {nuevos}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px #dcfce7' }}/>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#8e8e93', letterSpacing: '0.04em' }}>EN VIVO</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#c7c7cc' }}>Tiempo real · {items.length} eventos</div>
      </div>

      {/* Lista */}
      <div ref={listRef} style={{ flex: 1, overflow: 'auto', scrollbarWidth: 'none' }}>
        {contenido}
      </div>
    </div>
  )
}
