import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { useSocket } from '../lib/socket'
import AppShell from '../components/AppShell'
import PanelDetalle from '../components/PanelDetalle'
import FeedActividad from '../components/FeedActividad'
import SheetAsignacion from '../components/SheetAsignacion'

const ESTADOS = {
  sin_asignar:  { label: 'Sin asignar', bg: '#fce8e8', color: '#a32d2d' },
  asignada:     { label: 'Asignada',    bg: '#faeeda', color: '#854f0b' },
  en_mision:    { label: 'En curso',    bg: '#e8f0fe', color: '#185fa5' },
  interrumpida: { label: 'Interrumpida',bg: '#faeeda', color: '#854f0b' },
  cerrada:      { label: 'Cerrada',     bg: '#e8faf2', color: '#0f6e56' },
}

const FILTROS     = ['Todas', 'Sin asignar', 'Asignada', 'En curso', 'Cerrada']
const ROLE_LABELS = {
  gerencia: 'Gerencia', jefe_base: 'Jefe de base',
  coordinador: 'Coordinador', supervisor: 'Supervisor',
  agente: 'Agente', admin: 'Administrador',
}
const PUEDE_ASIGNAR = ['gerencia', 'jefe_base', 'coordinador', 'supervisor', 'admin']
const PUEDE_CREAR   = ['gerencia', 'jefe_base', 'admin']

function tiempoRelativo(fecha) {
  if (!fecha) return '—'
  const diff = Math.floor((Date.now() - new Date(fecha)) / 60000)
  if (diff < 1) return 'ahora'
  if (diff < 60) return `hace ${diff} min`
  if (diff < 1440) return `hace ${Math.floor(diff / 60)} h`
  return `hace ${Math.floor(diff / 1440)} d`
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

// ── Chip agentes libres ───────────────────────────────────────
function ChipAgentesLibres({ count }) {
  if (count === null) return null
  const color = count === 0 ? '#a32d2d' : count <= 2 ? '#854f0b' : '#0f6e56'
  const bg    = count === 0 ? '#fce8e8' : count <= 2 ? '#faeeda' : '#e8faf2'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: bg, borderRadius: 10, padding: '5px 11px' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}/>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>
        {count === 0 ? 'Sin agentes libres' : `${count} libre${count !== 1 ? 's' : ''}`}
      </span>
    </div>
  )
}

// ── Card de misión ────────────────────────────────────────────
function MisionCard({ mision, onClick, onAsignar, isMobile, rol, selected }) {
  const estado         = ESTADOS[mision.estado] ?? ESTADOS.sin_asignar
  const agentes        = Array.isArray(mision.agentes) ? mision.agentes : []
  const puedeAsignar   = PUEDE_ASIGNAR.includes(rol)
  const mostrarAsignar = ['sin_asignar', 'asignada'].includes(mision.estado) && puedeAsignar

  let ubicacion = ''
  if (mision.modo_ubicacion === 'altura')       ubicacion = [mision.calle, mision.altura].filter(Boolean).join(' ')
  if (mision.modo_ubicacion === 'interseccion') ubicacion = [mision.calle, mision.calle2].filter(Boolean).join(' y ')
  if (mision.modo_ubicacion === 'entre_calles') ubicacion = `${mision.calle} entre ${mision.desde} y ${mision.hasta}`
  if (mision.modo_ubicacion === 'poligono')     ubicacion = mision.poligono_desc ?? ''

  return (
    <div
      onClick={() => onClick(mision)}
      style={{
        background: selected ? '#f0f4ff' : '#fff',
        borderRadius: 14,
        padding: isMobile ? '12px 14px' : '14px 20px',
        marginBottom: 8,
        border: selected ? '1.5px solid #1a2744' : '0.5px solid #dde2ec',
        cursor: 'pointer',
        boxShadow: selected ? 'none' : '0 1px 3px rgba(26,39,68,0.05)',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => {
        if (!isMobile && !selected) {
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(26,39,68,0.1)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={e => {
        if (!isMobile && !selected) {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(26,39,68,0.05)'
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
    >
      {/* Tipo + estado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#534ab7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {mision.tipo === 'mision' ? 'Misión' : 'Servicio'}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: estado.bg, color: estado.color }}>
          {estado.label}
        </span>
      </div>

      {/* Título */}
      <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: '#1a2744', marginBottom: 3, letterSpacing: '-0.2px', lineHeight: 1.3 }}>
        {mision.titulo}
      </div>

      {/* Ubicación */}
      {ubicacion && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span style={{ fontSize: 12, color: '#8e8e93' }}>{ubicacion}</span>
        </div>
      )}

      {/* Turno */}
      {mision.turno && (
        <div style={{ fontSize: 11, color: '#aeaeb2', marginBottom: agentes.length ? 8 : 10 }}>
          Turno {mision.turno}{mision.base_nombre ? ` · ${mision.base_nombre}` : ''}
        </div>
      )}

      {/* Agentes */}
      {agentes.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {agentes.map((a, i) => (
            <span key={i} style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
              background: a.es_encargado ? '#1a2744' : '#eeedf8',
              color: a.es_encargado ? '#f5c800' : '#3c3489',
            }}>
              {a.nombre_completo}{a.es_encargado ? ' ★' : ''}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#c7c7cc' }}>{tiempoRelativo(mision.created_at)}</span>
        <div style={{ display: 'flex', gap: 7 }}>
          {mostrarAsignar && (
            <button onClick={e => { e.stopPropagation(); onAsignar(mision) }}
              style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 9, border: '1.5px solid #1a2744', background: '#fff', color: '#1a2744', cursor: 'pointer' }}>
              Asignar
            </button>
          )}
          {mision.estado === 'en_mision' && (
            <button onClick={e => { e.stopPropagation(); onClick(mision) }}
              style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 9, border: 'none', background: '#e8f0fe', color: '#185fa5', cursor: 'pointer' }}>
              Ver seguimiento
            </button>
          )}
          {mision.estado === 'cerrada' && (
            <button onClick={e => { e.stopPropagation(); onClick(mision) }}
              style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 9, border: 'none', background: '#e8faf2', color: '#0f6e56', cursor: 'pointer' }}>
              Ver reporte
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sección colapsable ────────────────────────────────────────
function Seccion({ titulo, misiones, onClick, onAsignar, isMobile, rol, defaultOpen = true, selectedId, color }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!misiones.length) return null
  return (
    <div style={{ marginBottom: 4 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 4px', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: color ?? '#aeaeb2', flexShrink: 0 }}/>
        <span style={{ fontSize: 11, fontWeight: 700, color: color ?? '#aeaeb2', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{titulo}</span>
        <span style={{ fontSize: 11, color: color ?? '#aeaeb2', fontWeight: 600, opacity: 0.6 }}>({misiones.length})</span>
        <div style={{ marginLeft: 'auto', color: '#c7c7cc', transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      {open && misiones.map(m => (
        <MisionCard key={m.id} mision={m} onClick={onClick} onAsignar={onAsignar} isMobile={isMobile} rol={rol} selected={m.id === selectedId} />
      ))}
      <div style={{ borderBottom: '0.5px solid #e4e8f0', marginBottom: 10, marginTop: 4 }} />
    </div>
  )
}

// ── Lista de misiones ─────────────────────────────────────────
function ListaMisiones({ misiones, onClick, onAsignar, isMobile, rol, filtro, selectedId }) {
  const muestraSecciones = PUEDE_ASIGNAR.includes(rol) && filtro === 'Todas'

  if (!misiones.length) return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2744', marginBottom: 6 }}>Sin misiones</div>
      <div style={{ fontSize: 13, color: '#aeaeb2' }}>No hay misiones para este filtro</div>
    </div>
  )

  if (muestraSecciones) return (
    <>
      <Seccion titulo="Sin asignar"   misiones={misiones.filter(m => m.estado === 'sin_asignar')}  onClick={onClick} onAsignar={onAsignar} isMobile={isMobile} rol={rol} defaultOpen selectedId={selectedId} color="#a32d2d" />
      <Seccion titulo="Asignadas"     misiones={misiones.filter(m => m.estado === 'asignada')}     onClick={onClick} onAsignar={onAsignar} isMobile={isMobile} rol={rol} defaultOpen selectedId={selectedId} color="#854f0b" />
      <Seccion titulo="En curso"      misiones={misiones.filter(m => m.estado === 'en_mision')}    onClick={onClick} onAsignar={onAsignar} isMobile={isMobile} rol={rol} defaultOpen selectedId={selectedId} color="#185fa5" />
      <Seccion titulo="Interrumpidas" misiones={misiones.filter(m => m.estado === 'interrumpida')} onClick={onClick} onAsignar={onAsignar} isMobile={isMobile} rol={rol} defaultOpen selectedId={selectedId} color="#854f0b" />
      <Seccion titulo="Cerradas hoy"  misiones={misiones.filter(m => m.estado === 'cerrada')}      onClick={onClick} onAsignar={onAsignar} isMobile={isMobile} rol={rol} defaultOpen={false} selectedId={selectedId} color="#0f6e56" />
    </>
  )

  return misiones.map(m => (
    <MisionCard key={m.id} mision={m} onClick={onClick} onAsignar={onAsignar} isMobile={isMobile} rol={rol} selected={m.id === selectedId} />
  ))
}

// ── Modal nueva misión ────────────────────────────────────────
function ModalNuevaMision({ onClose, onCreada, profile }) {
  const [form, setForm] = useState({ titulo: '', tipo: 'servicio', descripcion: '', turno: profile?.turno ?? '', modo_ubicacion: 'altura', calle: '', altura: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleGuardar() {
    if (!form.titulo.trim() || !form.turno.trim()) { setError('Título y turno son obligatorios.'); return }
    setSaving(true)
    try {
      await api.post('/api/misiones', { ...form, base_id: profile?.base_id })
      onCreada()
    } catch (e) {
      setError('Error al crear la misión. Intentá nuevamente.')
      setSaving(false)
    }
  }

  const inp = { width: '100%', padding: '10px 13px', borderRadius: 10, border: '1px solid #dde2ec', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#f9f9fb', color: '#1d1d1f', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 800 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 20, padding: 28, zIndex: 801, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2744' }}>Nueva misión</div>
          <button onClick={onClose} style={{ background: '#eef1f6', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#8e8e93' }}>✕</button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Tipo</label>
          <select value={form.tipo} onChange={e => set('tipo', e.target.value)} style={inp}>
            <option value="servicio">Servicio</option>
            <option value="mision">Misión</option>
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Título *</label>
          <input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ej: Control de velocidad en Av. Corrientes" style={inp} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Turno *</label>
          <input value={form.turno} onChange={e => set('turno', e.target.value)} placeholder="Ej: mañana" style={inp} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 2 }}>
            <label style={lbl}>Calle</label>
            <input value={form.calle} onChange={e => set('calle', e.target.value)} placeholder="Av. Corrientes" style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Altura</label>
            <input value={form.altura} onChange={e => set('altura', e.target.value)} placeholder="3400" style={inp} />
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Descripción</label>
          <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Instrucciones adicionales..." rows={3} style={{ ...inp, resize: 'none' }} />
        </div>
        {error && <div style={{ background: '#fce8e8', color: '#a32d2d', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #dde2ec', background: '#fff', color: '#8e8e93', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: '#1a2744', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creando...' : 'Crear misión'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Sheet actividad mobile ────────────────────────────────────
function SheetActividadMobile({ open, onClose, rol, onSelectMision, socketRef }) {
  if (!open) return null
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '20px 20px 0 0', zIndex: 401, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 30px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#dde2ec' }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744' }}>Actividad</div>
          <button onClick={onClose} style={{ background: '#eef1f6', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#8e8e93', cursor: 'pointer' }}>Cerrar</button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <FeedActividad rolUsuario={rol} onSelectMision={m => { onSelectMision(m); onClose() }} modoSheet socketRef={socketRef} />
        </div>
      </div>
    </>
  )
}

// ── Contenido principal ───────────────────────────────────────
function ContenidoMisiones({ misiones, loading, filtro, setFiltro, onSelect, onAsignar, rol, profile, stats, agentesLibres, selected, onClose, onRefresh, isMobile, socketRef, showNueva, setShowNueva }) {
  const [showActividad, setShowActividad] = useState(false)

  return (
    <>
      {/* Subheader */}
      <div style={{ background: '#fff', padding: '12px 32px', borderBottom: '0.5px solid #e0e4ed', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>

          {/* Izquierda: contexto + chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#8e8e93', fontWeight: 500 }}>
              {ROLE_LABELS[rol] ?? rol}
              {profile?.base_nombre ? ` · ${profile.base_nombre}` : ''}
            </span>
            <ChipAgentesLibres count={agentesLibres} />
          </div>

          {/* Derecha: stat chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Total',       val: stats.total,       bg: '#eef1f6',  color: '#1a2744' },
              { label: 'Sin asignar', val: stats.sin_asignar, bg: '#fce8e8',  color: '#a32d2d' },
              { label: 'Asignadas',   val: stats.asignadas,   bg: '#fef3e2',  color: '#854f0b' },
              { label: 'En curso',    val: stats.en_curso,    bg: '#e8f0fe',  color: '#185fa5' },
              { label: 'Cerradas',    val: stats.cerradas,    bg: '#e8faf2',  color: '#0f6e56' },
            ].map((s, i) => (
              <div key={i} style={{
                background: s.bg, borderRadius: 10, padding: '6px 14px',
                textAlign: 'center', minWidth: 60,
                border: `0.5px solid ${s.color}22`,
              }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: s.color, opacity: 0.75, marginTop: 2, fontWeight: 600, letterSpacing: '0.02em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Lista */}
        <div style={{ flex: 1, padding: '16px 24px 20px', overflow: 'auto' }}>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {FILTROS.map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{
                  padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  background: filtro === f ? '#1a2744' : '#fff',
                  color: filtro === f ? '#fff' : '#8e8e93',
                  boxShadow: filtro === f ? 'none' : '0 1px 3px rgba(26,39,68,0.08)',
                  border: filtro === f ? 'none' : '0.5px solid #dde2ec',
                  transition: 'all 0.15s',
                }}>
                {f}
              </button>
            ))}
          </div>

          {loading
            ? <div style={{ textAlign: 'center', padding: '60px 0', color: '#aeaeb2', fontSize: 14 }}>Cargando misiones...</div>
            : <ListaMisiones misiones={misiones} onClick={onSelect} onAsignar={onAsignar} isMobile={isMobile} rol={rol} filtro={filtro} selectedId={selected?.id} />
          }
        </div>

        {/* Panel detalle */}
        {selected && <PanelDetalle mision={selected} onClose={onClose} rol={rol} onRefresh={onRefresh} />}

        {/* Feed actividad desktop */}
        {!isMobile && <FeedActividad rolUsuario={rol} onSelectMision={onSelect} socketRef={socketRef} />}
      </div>

      {/* Botón actividad mobile */}
      {isMobile && (
        <button onClick={() => setShowActividad(true)}
          style={{ position: 'fixed', bottom: 72, right: 16, zIndex: 300, display: 'flex', alignItems: 'center', gap: 7, background: '#1a2744', color: '#fff', border: 'none', borderRadius: 22, padding: '10px 16px', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 20px rgba(26,39,68,0.35)', cursor: 'pointer' }}>
          Actividad
        </button>
      )}

      <SheetActividadMobile open={showActividad} onClose={() => setShowActividad(false)} rol={rol} onSelectMision={onSelect} socketRef={socketRef} />
      {showNueva && <ModalNuevaMision onClose={() => setShowNueva(false)} onCreada={() => { setShowNueva(false); onRefresh() }} profile={profile} />}
    </>
  )
}

// ── Principal ─────────────────────────────────────────────────
export default function Misiones() {
  const { profile } = useAuth()
  const isMobile    = useIsMobile()
  const socketRef   = useSocket(profile?.base_id)

  const [misiones, setMisiones]                   = useState([])
  const [loading, setLoading]                     = useState(true)
  const [filtro, setFiltro]                       = useState('Todas')
  const [selected, setSelected]                   = useState(null)
  const [agentesLibres, setAgentesLibres]         = useState(null)
  const [misionParaAsignar, setMisionParaAsignar] = useState(null)
  const [showNueva, setShowNueva]                 = useState(false)

  const rol = profile?.role ?? 'agente'

  useEffect(() => { if (profile) { fetchMisiones(); fetchAgentesLibres() } }, [filtro, profile])

  useEffect(() => {
    const socket = socketRef?.current
    if (!socket) return
    const refresh = () => fetchMisiones()
    socket.on('mision:nueva',        refresh)
    socket.on('mision:asignada',     refresh)
    socket.on('mision:aceptada',     refresh)
    socket.on('mision:interrumpida', refresh)
    socket.on('mision:cerrada',      refresh)
    return () => {
      socket.off('mision:nueva',        refresh)
      socket.off('mision:asignada',     refresh)
      socket.off('mision:aceptada',     refresh)
      socket.off('mision:interrumpida', refresh)
      socket.off('mision:cerrada',      refresh)
    }
  }, [socketRef?.current])

  async function fetchMisiones() {
    setLoading(true)
    try {
      const hoy = new Date().toISOString().split('T')[0]
      const filtroEstado = { 'Sin asignar': 'sin_asignar', 'Asignada': 'asignada', 'En curso': 'en_mision', 'Cerrada': 'cerrada' }
      let url = `/api/misiones?fecha=${hoy}`
      if (filtro !== 'Todas' && filtroEstado[filtro]) url += `&estado=${filtroEstado[filtro]}`
      const data = await api.get(url)
      setMisiones(data ?? [])
      if (selected) {
        const updated = (data ?? []).find(m => m.id === selected.id)
        if (updated) setSelected(updated)
      }
    } catch (e) { console.warn('Error cargando misiones:', e) }
    setLoading(false)
  }

  async function fetchAgentesLibres() {
    try {
      const data   = await api.get(`/api/profiles?role=agente&base_id=${profile?.base_id ?? ''}`)
      const libres = (data ?? []).filter(a => a.estado_turno === 'libre').length
      setAgentesLibres(libres)
    } catch (e) { console.warn('Error cargando agentes libres:', e) }
  }

  const stats = {
    total:       misiones.length,
    sin_asignar: misiones.filter(m => m.estado === 'sin_asignar').length,
    asignadas:   misiones.filter(m => m.estado === 'asignada').length,
    en_curso:    misiones.filter(m => m.estado === 'en_mision').length,
    cerradas:    misiones.filter(m => m.estado === 'cerrada').length,
  }

  const accionHeader = PUEDE_CREAR.includes(rol)
    ? { label: '+ Nueva misión', onClick: () => setShowNueva(true) }
    : undefined

  return (
    <>
      <AppShell titulo="Misiones" accionHeader={accionHeader}>
        <ContenidoMisiones
          misiones={misiones} loading={loading} filtro={filtro} setFiltro={setFiltro}
          onSelect={m => setSelected(m)} onAsignar={m => setMisionParaAsignar(m)}
          onClose={() => setSelected(null)} onRefresh={fetchMisiones}
          rol={rol} profile={profile} stats={stats} agentesLibres={agentesLibres}
          selected={selected} isMobile={isMobile} socketRef={socketRef}
          showNueva={showNueva} setShowNueva={setShowNueva}
        />
      </AppShell>

      {misionParaAsignar && (
        <SheetAsignacion
          mision={misionParaAsignar}
          onClose={() => setMisionParaAsignar(null)}
          onAsignado={() => { setMisionParaAsignar(null); fetchMisiones() }}
        />
      )}
    </>
  )
}
