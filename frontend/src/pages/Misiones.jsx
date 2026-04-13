import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { useSocket } from '../lib/socket'
import Topbar from '../components/Topbar'
import NavbarMobile from '../components/NavbarMobile'
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

const FILTROS   = ['Todas', 'Sin asignar', 'Asignada', 'En curso', 'Cerrada']
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

function ChipAgentesLibres({ count }) {
  if (count === null) return null
  const color = count === 0 ? '#a32d2d' : count <= 2 ? '#854f0b' : '#0f6e56'
  const bg    = count === 0 ? '#fce8e8' : count <= 2 ? '#faeeda' : '#e8faf2'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: bg, borderRadius: 10, padding: '6px 12px' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}/>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>
        {count === 0 ? 'Sin agentes libres' : `${count} libre${count !== 1 ? 's' : ''}`}
      </span>
    </div>
  )
}

function MisionCard({ mision, onClick, onAsignar, isMobile, rol, selected }) {
  const estado   = ESTADOS[mision.estado] ?? ESTADOS.sin_asignar
  const agentes  = Array.isArray(mision.agentes) ? mision.agentes : []
  const puedeAsignar = PUEDE_ASIGNAR.includes(rol)
  const mostrarAsignar = ['sin_asignar', 'asignada'].includes(mision.estado) && puedeAsignar

  // Armar texto de ubicación
  let ubicacion = ''
  if (mision.modo_ubicacion === 'altura')       ubicacion = [mision.calle, mision.altura].filter(Boolean).join(' ')
  if (mision.modo_ubicacion === 'interseccion') ubicacion = [mision.calle, mision.calle2].filter(Boolean).join(' y ')
  if (mision.modo_ubicacion === 'entre_calles') ubicacion = `${mision.calle} entre ${mision.desde} y ${mision.hasta}`
  if (mision.modo_ubicacion === 'poligono')     ubicacion = mision.poligono_desc ?? ''

  return (
    <div
      onClick={() => onClick(mision)}
      style={{ background: selected ? '#f0f4ff' : '#fff', borderRadius: 14, padding: isMobile ? '12px 14px' : '14px 20px', marginBottom: 8, border: selected ? '1.5px solid #1a2744' : '0.5px solid #e5e5ea', cursor: 'pointer' }}
      onMouseEnter={e => !isMobile && !selected && (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)')}
      onMouseLeave={e => !isMobile && (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#534ab7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {mision.tipo === 'mision' ? 'Misión' : 'Servicio'}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: estado.bg, color: estado.color }}>
          {estado.label}
        </span>
      </div>

      <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: '#1d1d1f', marginBottom: 2, letterSpacing: '-0.2px' }}>
        {mision.titulo}
      </div>

      {ubicacion && (
        <div style={{ fontSize: 12, color: '#8e8e93', marginBottom: 4 }}>{ubicacion}</div>
      )}

      {mision.turno && (
        <div style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 6 }}>Turno: {mision.turno} · {mision.base_nombre ?? ''}</div>
      )}

      {agentes.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          {agentes.map((a, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: a.es_encargado ? '#1a2744' : '#eeedf8', color: a.es_encargado ? '#f5c800' : '#3c3489' }}>
              {a.nombre_completo}{a.es_encargado ? ' ★' : ''}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#aeaeb2' }}>{tiempoRelativo(mision.created_at)}</span>
        <div style={{ display: 'flex', gap: 7 }}>
          {mostrarAsignar && (
            <button onClick={e => { e.stopPropagation(); onAsignar(mision) }}
              style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 9, border: '1px solid #1a2744', background: '#fff', color: '#1a2744', cursor: 'pointer' }}>
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

function Seccion({ titulo, misiones, onClick, onAsignar, isMobile, rol, defaultOpen = true, selectedId, color }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!misiones.length) return null
  return (
    <div style={{ marginBottom: 4 }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 0', cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: color ?? '#aeaeb2', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{titulo}</span>
        <span style={{ fontSize: 11, color: color ?? '#aeaeb2', fontWeight: 600, opacity: 0.7 }}>({misiones.length})</span>
        <div style={{ marginLeft: 'auto', color: color ?? '#aeaeb2', transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      {open && misiones.map(m => (
        <MisionCard key={m.id} mision={m} onClick={onClick} onAsignar={onAsignar} isMobile={isMobile} rol={rol} selected={m.id === selectedId} />
      ))}
      <div style={{ borderBottom: '0.5px solid #ebebeb', marginBottom: 8 }} />
    </div>
  )
}

function ListaMisiones({ misiones, onClick, onAsignar, isMobile, rol, filtro, selectedId }) {
  const muestraSecciones = PUEDE_ASIGNAR.includes(rol) && filtro === 'Todas'

  if (!misiones.length) return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: '#aeaeb2', fontSize: 14 }}>
      Sin misiones para este filtro
    </div>
  )

  if (muestraSecciones) return (
    <>
      <Seccion titulo="Sin asignar"  misiones={misiones.filter(m => m.estado === 'sin_asignar')}  onClick={onClick} onAsignar={onAsignar} isMobile={isMobile} rol={rol} defaultOpen selectedId={selectedId} color="#a32d2d" />
      <Seccion titulo="Asignadas"    misiones={misiones.filter(m => m.estado === 'asignada')}     onClick={onClick} onAsignar={onAsignar} isMobile={isMobile} rol={rol} defaultOpen selectedId={selectedId} color="#854f0b" />
      <Seccion titulo="En curso"     misiones={misiones.filter(m => m.estado === 'en_mision')}    onClick={onClick} onAsignar={onAsignar} isMobile={isMobile} rol={rol} defaultOpen selectedId={selectedId} color="#185fa5" />
      <Seccion titulo="Interrumpidas" misiones={misiones.filter(m => m.estado === 'interrumpida')} onClick={onClick} onAsignar={onAsignar} isMobile={isMobile} rol={rol} defaultOpen selectedId={selectedId} color="#854f0b" />
      <Seccion titulo="Cerradas hoy" misiones={misiones.filter(m => m.estado === 'cerrada')}      onClick={onClick} onAsignar={onAsignar} isMobile={isMobile} rol={rol} defaultOpen={false} selectedId={selectedId} color="#0f6e56" />
    </>
  )

  return misiones.map(m => (
    <MisionCard key={m.id} mision={m} onClick={onClick} onAsignar={onAsignar} isMobile={isMobile} rol={rol} selected={m.id === selectedId} />
  ))
}

// ── MODAL NUEVA MISIÓN ────────────────────────────────────────
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

  const inputStyle = { width: '100%', padding: '10px 13px', borderRadius: 10, border: '1px solid #e5e5ea', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#f9f9fb', color: '#1d1d1f', boxSizing: 'border-box' }
  const labelStyle = { fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 800 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 20, padding: 28, zIndex: 801, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2744' }}>Nueva misión</div>
          <button onClick={onClose} style={{ background: '#f5f5f7', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#8e8e93' }}>✕</button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Tipo</label>
          <select value={form.tipo} onChange={e => set('tipo', e.target.value)} style={inputStyle}>
            <option value="servicio">Servicio</option>
            <option value="mision">Misión</option>
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Título *</label>
          <input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ej: Control de velocidad en Av. Corrientes" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Turno *</label>
          <input value={form.turno} onChange={e => set('turno', e.target.value)} placeholder="Ej: mañana" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>Calle</label>
            <input value={form.calle} onChange={e => set('calle', e.target.value)} placeholder="Av. Corrientes" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Altura</label>
            <input value={form.altura} onChange={e => set('altura', e.target.value)} placeholder="3400" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Descripción</label>
          <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Instrucciones adicionales..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
        </div>
        {error && <div style={{ background: '#fce8e8', color: '#a32d2d', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: '#1a2744', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creando...' : 'Crear misión'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── SHEET ACTIVIDAD MOBILE ────────────────────────────────────
function SheetActividadMobile({ open, onClose, rol, onSelectMision, nuevosActividad, socketRef }) {
  if (!open) return null
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '20px 20px 0 0', zIndex: 401, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 30px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e5e5ea' }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744' }}>Actividad</div>
            {nuevosActividad > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: '#e24b4a', color: '#fff', padding: '2px 7px', borderRadius: 10 }}>{nuevosActividad}</span>}
          </div>
          <button onClick={onClose} style={{ background: '#f5f5f7', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#8e8e93', cursor: 'pointer' }}>Cerrar</button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <FeedActividad rolUsuario={rol} onSelectMision={m => { onSelectMision(m); onClose() }} modoSheet socketRef={socketRef} />
        </div>
      </div>
    </>
  )
}

// ── MOBILE ────────────────────────────────────────────────────
function MobileMisiones({ misiones, loading, filtro, setFiltro, onSelect, onAsignar, rol, stats, agentesLibres, selected, onClose, onRefresh, profile, socketRef }) {
  const [showActividad, setShowActividad] = useState(false)
  const [nuevosActividad, setNuevosActividad] = useState(0)
  const [showNueva, setShowNueva] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', maxWidth: 430, margin: '0 auto', position: 'relative' }}>
      <div style={{ background: '#1a2744', padding: '48px 18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px' }}>Misiones</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{stats.total} total · {stats.en_curso} en curso</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ChipAgentesLibres count={agentesLibres} />
            {PUEDE_CREAR.includes(rol) && (
              <button onClick={() => setShowNueva(true)} style={{ width: 34, height: 34, borderRadius: '50%', background: '#f5c800', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a2744" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: '#1a2744' }}>
        <div style={{ background: '#f5f5f7', borderRadius: '20px 20px 0 0', padding: '14px 14px 0' }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
            {FILTROS.map(f => (
              <button key={f} onClick={() => setFiltro(f)} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, flexShrink: 0, background: filtro === f ? '#1a2744' : '#e5e5ea', color: filtro === f ? '#fff' : '#8e8e93' }}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: '#f5f5f7', padding: '4px 14px 90px' }}>
        {loading
          ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#aeaeb2', fontSize: 13 }}>Cargando...</div>
          : <ListaMisiones misiones={misiones} onClick={onSelect} onAsignar={onAsignar} isMobile rol={rol} filtro={filtro} selectedId={selected?.id} />}
      </div>

      <button onClick={() => setShowActividad(true)} style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 300, display: 'flex', alignItems: 'center', gap: 7, background: '#1a2744', color: '#fff', border: 'none', borderRadius: 22, padding: '10px 16px', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 20px rgba(26,39,68,0.35)', cursor: 'pointer' }}>
        Actividad
        {nuevosActividad > 0 && <span style={{ background: '#e24b4a', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 10 }}>{nuevosActividad}</span>}
      </button>

      <NavbarMobile onPlus={() => PUEDE_CREAR.includes(rol) && setShowNueva(true)} />

      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <PanelDetalle mision={selected} onClose={onClose} rol={rol} onRefresh={onRefresh} isMobile />
        </div>
      )}

      <SheetActividadMobile open={showActividad} onClose={() => setShowActividad(false)} rol={rol} onSelectMision={m => { onSelect(m); setShowActividad(false) }} nuevosActividad={nuevosActividad} socketRef={socketRef} />
      {showNueva && <ModalNuevaMision onClose={() => setShowNueva(false)} onCreada={() => { setShowNueva(false); onRefresh() }} profile={profile} />}
    </div>
  )
}

// ── DESKTOP ───────────────────────────────────────────────────
function DesktopMisiones({ misiones, loading, filtro, setFiltro, onSelect, onAsignar, rol, profile, stats, agentesLibres, selected, onClose, onRefresh, socketRef }) {
  const [showNueva, setShowNueva] = useState(false)

  return (
    <div style={{ height: '100vh', background: '#f5f5f7', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar onNuevaMision={() => PUEDE_CREAR.includes(rol) && setShowNueva(true)} />

      <div style={{ background: '#fff', padding: '18px 44px 14px', borderBottom: '0.5px solid #e5e5ea', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#1a2744', letterSpacing: '-0.7px', marginBottom: 3 }}>Misiones</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, color: '#aeaeb2' }}>{ROLE_LABELS[rol] ?? rol} · {profile?.base_nombre ?? '—'}</div>
              <ChipAgentesLibres count={agentesLibres} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Total',        val: stats.total,        bg: '#f5f5f7', color: '#1a2744' },
              { label: 'Sin asignar',  val: stats.sin_asignar,  bg: '#fce8e8', color: '#a32d2d' },
              { label: 'Asignadas',    val: stats.asignadas,    bg: '#faeeda', color: '#854f0b' },
              { label: 'En curso',     val: stats.en_curso,     bg: '#e8f0fe', color: '#185fa5' },
              { label: 'Cerradas',     val: stats.cerradas,     bg: '#e8faf2', color: '#0f6e56' },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, borderRadius: 12, padding: '8px 14px', textAlign: 'center', minWidth: 68 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: s.color, opacity: 0.7, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, padding: '16px 44px 20px', overflow: 'auto' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {FILTROS.map(f => (
              <button key={f} onClick={() => setFiltro(f)} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: filtro === f ? '#1a2744' : '#e5e5ea', color: filtro === f ? '#fff' : '#8e8e93' }}>{f}</button>
            ))}
          </div>
          {loading
            ? <div style={{ textAlign: 'center', padding: '60px 0', color: '#aeaeb2', fontSize: 15 }}>Cargando misiones...</div>
            : <ListaMisiones misiones={misiones} onClick={onSelect} onAsignar={onAsignar} rol={rol} filtro={filtro} selectedId={selected?.id} />}
        </div>
        {selected && <PanelDetalle mision={selected} onClose={onClose} rol={rol} onRefresh={onRefresh} />}
        <FeedActividad rolUsuario={rol} onSelectMision={onSelect} socketRef={socketRef} />
      </div>

      {showNueva && <ModalNuevaMision onClose={() => setShowNueva(false)} onCreada={() => { setShowNueva(false); onRefresh() }} profile={profile} />}
    </div>
  )
}

// ── PRINCIPAL ─────────────────────────────────────────────────
export default function Misiones() {
  const { profile } = useAuth()
  const isMobile = useIsMobile()
  const socketRef = useSocket(profile?.base_id)

  const [misiones, setMisiones]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [filtro, setFiltro]               = useState('Todas')
  const [selected, setSelected]           = useState(null)
  const [agentesLibres, setAgentesLibres] = useState(null)
  const [misionParaAsignar, setMisionParaAsignar] = useState(null)

  const rol = profile?.role ?? 'agente'

  useEffect(() => { if (profile) { fetchMisiones(); fetchAgentesLibres() } }, [filtro, profile])

  // Realtime: refrescar misiones al recibir eventos de socket
  useEffect(() => {
    const socket = socketRef?.current
    if (!socket) return
    const refresh = () => fetchMisiones()
    socket.on('mision:nueva',      refresh)
    socket.on('mision:asignada',   refresh)
    socket.on('mision:aceptada',   refresh)
    socket.on('mision:interrumpida', refresh)
    socket.on('mision:cerrada',    refresh)
    return () => {
      socket.off('mision:nueva',      refresh)
      socket.off('mision:asignada',   refresh)
      socket.off('mision:aceptada',   refresh)
      socket.off('mision:interrumpida', refresh)
      socket.off('mision:cerrada',    refresh)
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
    } catch (e) {
      console.warn('Error cargando misiones:', e)
    }
    setLoading(false)
  }

  async function fetchAgentesLibres() {
    try {
      const data = await api.get(`/api/profiles?role=agente&base_id=${profile?.base_id ?? ''}`)
      const libres = (data ?? []).filter(a => a.estado_turno === 'libre').length
      setAgentesLibres(libres)
    } catch (e) {
      console.warn('Error cargando agentes libres:', e)
    }
  }

  const stats = {
    total:       misiones.length,
    sin_asignar: misiones.filter(m => m.estado === 'sin_asignar').length,
    asignadas:   misiones.filter(m => m.estado === 'asignada').length,
    en_curso:    misiones.filter(m => m.estado === 'en_mision').length,
    cerradas:    misiones.filter(m => m.estado === 'cerrada').length,
  }

  const props = {
    misiones, loading, filtro, setFiltro,
    onSelect:  m => setSelected(m),
    onAsignar: m => setMisionParaAsignar(m),
    onClose:   () => setSelected(null),
    onRefresh: fetchMisiones,
    rol, profile, stats, agentesLibres, selected, socketRef,
  }

  return (
    <>
      {isMobile ? <MobileMisiones {...props} /> : <DesktopMisiones {...props} />}
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
