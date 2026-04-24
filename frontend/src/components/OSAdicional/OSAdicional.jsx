/**
 * OSAdicional.jsx — v10
 * + Flujo de validación: borrador → validacion → validada / rechazada → cumplida
 * + Botones Validar/Rechazar para jefe_cgm, gerencia, director, admin
 * + Modal de rechazo con observación
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useOSAdicional } from './useOSAdicional'
import SidebarFases from './SidebarFases'
import MapaAdicional from './MapaAdicional'
import { ToolbarMapa, LeyendaMapa } from './ToolbarMapa'
import { BtnReporteOSAdicional } from './ReporteOSAdicional'

const ESTADOS = {
  borrador:   { label: 'Borrador',    color: '#854f0b', bg: '#faeeda' },
  validacion: { label: 'En validación', color: '#534ab7', bg: '#eeedf8' },
  validada:   { label: 'Validada',    color: '#0f6e56', bg: '#e8faf2' },
  rechazada:  { label: 'Rechazada',   color: '#c0392b', bg: '#fff0f0' },
  cumplida:   { label: 'Cumplida',    color: '#8e8e93', bg: '#f5f5f7' },
}

const ROLES_VALIDAR = ['admin', 'director', 'gerencia', 'jefe_cgm']

function fmtHora(h) {
  if (!h) return null
  const s = String(h).trim()
  if (!s || s === '00:00:00' || s === '00:00') return null
  return s.slice(0, 5)
}
function fmtFechas(fechas) {
  if (!fechas?.length) return null
  const toIso = f => (typeof f === 'object' && f.fecha ? String(f.fecha) : String(f)).slice(0, 10)
  const fmt = d => new Date(toIso(d) + 'T12:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'short' })
  if (fechas.length === 1) return fmt(fechas[0])
  if (fechas.length <= 3) return fechas.map(fmt).join(', ')
  return `${fmt(fechas[0])} · ${fmt(fechas[1])} · +${fechas.length - 2} mas`
}

// ── Título editable ───────────────────────────────────────────
function TituloEditable({ valor, onGuardar, readOnly }) {
  const [editando, setEditando] = useState(false)
  const [texto,    setTexto]    = useState(valor)
  const inputRef = useRef(null)
  useEffect(() => setTexto(valor), [valor])
  useEffect(() => { if (editando) inputRef.current?.select() }, [editando])
  function guardar() {
    setEditando(false)
    const trimmed = texto.trim()
    if (trimmed && trimmed !== valor) onGuardar(trimmed)
    else setTexto(valor)
  }
  if (editando) {
    return (
      <input ref={inputRef} value={texto} onChange={e => setTexto(e.target.value)}
        onBlur={guardar}
        onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') { setTexto(valor); setEditando(false) } }}
        style={{ fontSize:14, fontWeight:700, color:'#1a2744', background:'#f5f5f7', border:'none', borderRadius:8, padding:'3px 8px', outline:'none', fontFamily:'inherit', maxWidth:280 }}/>
    )
  }
  return (
    <span onClick={() => { if (!readOnly) setEditando(true) }} title={readOnly ? undefined : 'Click para editar'}
      style={{ fontSize:14, fontWeight:700, color:'#1a2744', cursor: readOnly ? 'default' : 'text', padding:'3px 4px', borderRadius:6, transition:'background 0.12s', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:280, display:'block' }}
      onMouseEnter={e => { if (!readOnly) e.currentTarget.style.background='#f0f0f5' }}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
      {valor || 'Sin nombre'}
    </span>
  )
}

// ── Modal editar datos básicos ────────────────────────────────
function ModalEditar({ os, onGuardar, onCancelar }) {
  const [nombre,       setNombre]       = useState(os?.nombre || '')
  const [eventoMotivo, setEventoMotivo] = useState(os?.evento_motivo || '')
  const INP = { width:'100%', background:'#f5f5f7', border:'none', borderRadius:10, padding:'10px 12px', fontSize:13, color:'#1d1d1f', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }
  const LBL = { fontSize:11, fontWeight:600, color:'#aeaeb2', letterSpacing:'0.05em', marginBottom:5 }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.28)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(3px)' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'26px', width:380, boxShadow:'0 20px 60px rgba(0,0,0,0.16)' }}>
        <div style={{ fontSize:16, fontWeight:700, color:'#1a2744', marginBottom:20 }}>Editar operativo</div>
        <div style={{ marginBottom:14 }}>
          <div style={LBL}>NOMBRE</div>
          <input value={nombre} onChange={e => setNombre(e.target.value)} style={INP} autoFocus/>
        </div>
        <div style={{ marginBottom:22 }}>
          <div style={LBL}>EVENTO MOTIVO</div>
          <input value={eventoMotivo} onChange={e => setEventoMotivo(e.target.value)} placeholder="Ej: Partido de futbol" style={INP}/>
        </div>
        <div style={{ display:'flex', gap:9 }}>
          <button onClick={onCancelar} style={{ flex:1, padding:'11px', borderRadius:12, border:'none', background:'#f5f5f7', color:'#636366', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
          <button disabled={!nombre.trim()} onClick={() => onGuardar({ nombre:nombre.trim(), evento_motivo:eventoMotivo })}
            style={{ flex:2, padding:'11px', borderRadius:12, border:'none', background:nombre.trim()?'#1a2744':'#e5e5ea', color:nombre.trim()?'#fff':'#aeaeb2', fontSize:13, fontWeight:700, cursor:nombre.trim()?'pointer':'not-allowed' }}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal rechazo ─────────────────────────────────────────────
function ModalRechazo({ onConfirmar, onCancelar, cargando }) {
  const [obs, setObs] = useState('')
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(3px)' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'28px', width:400, boxShadow:'0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ fontSize:16, fontWeight:700, color:'#c0392b', marginBottom:6 }}>Rechazar OS adicional</div>
        <div style={{ fontSize:13, color:'#636366', marginBottom:20 }}>
          La OS volverá al área operativa. Podés agregar una observación para indicar qué corregir.
        </div>
        <textarea
          value={obs}
          onChange={e => setObs(e.target.value)}
          placeholder="Motivo del rechazo (opcional)..."
          rows={3}
          style={{ width:'100%', background:'#f5f5f7', border:'none', borderRadius:10, padding:'10px 12px', fontSize:13, color:'#1d1d1f', fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box', marginBottom:20 }}
        />
        <div style={{ display:'flex', gap:9 }}>
          <button onClick={onCancelar} disabled={cargando}
            style={{ flex:1, padding:'11px', borderRadius:12, border:'none', background:'#f5f5f7', color:'#636366', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Cancelar
          </button>
          <button onClick={() => onConfirmar(obs)} disabled={cargando}
            style={{ flex:2, padding:'11px', borderRadius:12, border:'none', background:'#c0392b', color:'#fff', fontSize:13, fontWeight:700, cursor:cargando?'not-allowed':'pointer', opacity:cargando?0.7:1 }}>
            {cargando ? 'Rechazando...' : 'Confirmar rechazo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Banner de estado para validación/rechazo ──────────────────
function BannerEstado({ os }) {
  if (!os) return null

  if (os.estado === 'validacion') {
    return (
      <div style={{ background:'#eeedf8', borderBottom:'0.5px solid #c8c5ef', padding:'8px 16px', display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#534ab7' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span><strong>Pendiente de validación.</strong> Esta OS está siendo revisada por la jefatura.</span>
      </div>
    )
  }

  if (os.estado === 'rechazada') {
    return (
      <div style={{ background:'#fff0f0', borderBottom:'0.5px solid #f5c0c0', padding:'8px 16px', display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#c0392b' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span>
          <strong>OS rechazada.</strong>
          {os.obs_rechazo ? ` Motivo: ${os.obs_rechazo}` : ' Sin observación.'}
          {' '}Corregí y volvé a enviar a validación.
        </span>
      </div>
    )
  }

  if (os.estado === 'validada') {
    return (
      <div style={{ background:'#e8faf2', borderBottom:'0.5px solid #b0e8d0', padding:'8px 16px', display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#0f6e56' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span><strong>OS validada.</strong> Ya fue remitida al módulo de Servicios Adicionales.</span>
      </div>
    )
  }

  return null
}

// ── Componente principal ──────────────────────────────────────
export default function OSAdicional({ osId: osIdProp, fechasIniciales = [], onVolver }) {
  const { profile } = useAuth()
  const hook = useOSAdicional(null)
  const { os, turnos, fases, recursos, guardandoRecursos, cargar, actualizarCabecera, cambiarEstado, crearTurno, editarTurno, eliminarTurno, crearFase, eliminarFase, duplicarFase, moverFase, crearElemento, actualizarElemento, eliminarElemento, actualizarRecursos, guardarRecursos, setOS, setFases, setRecursos } = hook

  const [cargando,      setCargando]      = useState(true)
  const [creando,       setCreando]       = useState(false)
  const [modalEditar,   setModalEditar]   = useState(false)
  const [modalRechazo,  setModalRechazo]  = useState(false)
  const [accionando,    setAccionando]    = useState(false)
  const [herramienta,   setHerramienta]   = useState('mover')
  const [faseActiva,    setFaseActiva]    = useState(null)
  const [filtroFase,    setFiltroFase]    = useState('todas')
  const [elActivo,      setElActivo]      = useState(null)

  const rol = profile?.role

  useEffect(() => {
    if (!osIdProp) { setCargando(false); return }
    cargar(osIdProp).then(() => setCargando(false))
  }, [osIdProp, cargar])

  useEffect(() => {
    if (!osIdProp && !cargando && !os && !creando) handleCrearOSDefault()
  }, [osIdProp, cargando, os])

  async function handleCrearOSDefault() {
    setCreando(true)
    try {
      const payload = { nombre: 'Nuevo operativo' }
      if (fechasIniciales.length > 0) payload.fechas = fechasIniciales
      const nueva = await api.post('/api/os-adicional', payload)
      setOS(nueva); setFases(nueva.fases || []); setRecursos(nueva.recursos || [])
    } catch (e) { console.error('Error al crear OS:', e) }
    setCreando(false)
  }

  async function handleGuardarEditar(form) {
    await actualizarCabecera(form)
    setModalEditar(false)
  }

  async function handleActualizarFase(faseId, datos) {
    try {
      const updated = await api.put(`/api/os-adicional/fases/${faseId}`, datos)
      setFases(prev => prev.map(f => f.id === faseId ? { ...f, ...updated } : f))
    } catch (e) { console.error(e) }
  }

  // Enviar a validación (borrador → validacion)
  async function handleEnviarValidacion() {
    if (!window.confirm('¿Enviar esta OS a validación? No podrás editarla hasta que sea revisada.')) return
    setAccionando(true)
    try {
      const updated = await api.post(`/api/os-adicional/${os.id}/enviar-validacion`, {})
      setOS(prev => ({ ...prev, estado: updated.estado }))
    } catch (e) { alert(e.message) }
    finally { setAccionando(false) }
  }

  // Validar (validacion → validada) — solo ROLES_VALIDAR
  async function handleValidar() {
    if (!window.confirm('¿Validar esta OS adicional? Se creará automáticamente en el módulo de Servicios Adicionales.')) return
    setAccionando(true)
    try {
      const { os: updated } = await api.post(`/api/os-adicional/${os.id}/validar`, {})
      setOS(prev => ({ ...prev, ...updated }))
    } catch (e) { alert(e.message) }
    finally { setAccionando(false) }
  }

  // Rechazar (validacion → rechazada) — solo ROLES_VALIDAR
  async function handleRechazar(obs) {
    setAccionando(true)
    try {
      const updated = await api.post(`/api/os-adicional/${os.id}/rechazar`, { obs_rechazo: obs })
      setOS(prev => ({ ...prev, estado: updated.estado, obs_rechazo: updated.obs_rechazo }))
      setModalRechazo(false)
    } catch (e) { alert(e.message) }
    finally { setAccionando(false) }
  }

  // Re-enviar a validación desde rechazada (rechazada → validacion)
  async function handleReenviarValidacion() {
    if (!window.confirm('¿Volver a enviar esta OS a validación?')) return
    setAccionando(true)
    try {
      // Usamos el endpoint legacy /estado para el caso rechazada → validacion
      const updated = await api.post(`/api/os-adicional/${os.id}/estado`, { estado: 'validacion' })
      setOS(prev => ({ ...prev, estado: updated.estado }))
    } catch (e) { alert(e.message) }
    finally { setAccionando(false) }
  }

  const handleElementoCreado = useCallback(async (faseId, { tipo, geometria }) => {
    if (!faseId) return
    const el = await crearElemento(faseId, { tipo, geometria, nombre: '', instruccion: '' })
    if (el) { setElActivo({ ...el, fase_id: faseId }); setHerramienta('mover') }
  }, [crearElemento])

  const handleElementoClick      = useCallback((el) => setElActivo(el), [])
  const handleActualizarElemento = useCallback(async (elId, faseId, datos) => {
    await actualizarElemento(elId, faseId, datos)
    setElActivo(prev => prev ? { ...prev, ...datos } : null)
  }, [actualizarElemento])
  const handleEliminarElemento   = useCallback(async (elId, faseId) => {
    await eliminarElemento(elId, faseId)
    setElActivo(null)
  }, [eliminarElemento])

  if (cargando || creando) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#aeaeb2', fontSize:14 }}>
        {creando ? 'Creando operativo...' : 'Cargando...'}
      </div>
    )
  }

  const estadoInfo = ESTADOS[os?.estado || 'borrador']
  const estado     = os?.estado
  const esValidador = ROLES_VALIDAR.includes(rol)

  // readOnly: no se puede editar si está en validacion, validada o cumplida
  const readOnly = ['validacion', 'validada', 'cumplida'].includes(estado)

  const fechasOS      = os?.fechas || []
  const fechasMostrar = fechasOS.length ? fechasOS : fechasIniciales

  // ── Botones de acción según estado y rol ─────────────────────
  function renderBotonesAccion() {
    if (!os?.id || accionando) {
      return accionando
        ? <span style={{ fontSize:12, color:'#aeaeb2' }}>Guardando...</span>
        : null
    }

    // Quien creó / rol operativo: puede enviar a validación o re-enviar
    if (estado === 'borrador') {
      return (
        <button onClick={handleEnviarValidacion}
          style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'#534ab7', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
          Enviar a validación →
        </button>
      )
    }

    if (estado === 'rechazada') {
      return (
        <button onClick={handleReenviarValidacion}
          style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'#534ab7', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
          Re-enviar a validación →
        </button>
      )
    }

    // Validadores: pueden aprobar o rechazar cuando está en validacion
    if (estado === 'validacion' && esValidador) {
      return (
        <>
          <button onClick={() => setModalRechazo(true)}
            style={{ padding:'6px 14px', borderRadius:8, border:'1.5px solid #c0392b', background:'#fff', color:'#c0392b', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            Rechazar
          </button>
          <button onClick={handleValidar}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'#0f6e56', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            ✓ Validar OS
          </button>
        </>
      )
    }

    return null
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'#f5f5f7' }}>

      {/* TOPBAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px', background:'#fff', borderBottom:'0.5px solid #ebebeb', flexShrink:0, gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0, flex:1 }}>
          {onVolver && (
            <button onClick={onVolver}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#636366', padding:'4px', borderRadius:7, display:'flex', flexShrink:0 }}
              onMouseEnter={e => e.currentTarget.style.background='#f5f5f7'}
              onMouseLeave={e => e.currentTarget.style.background='none'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <TituloEditable valor={os?.nombre || 'Nuevo operativo'} onGuardar={nombre => actualizarCabecera({ nombre })} readOnly={readOnly}/>
              {os?.estado && (
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:6, background:estadoInfo.bg, color:estadoInfo.color, flexShrink:0, whiteSpace:'nowrap' }}>
                  {estadoInfo.label}
                </span>
              )}
            </div>
            <div style={{ fontSize:11, color:'#aeaeb2', marginTop:1, display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
              <span>OS adicional</span>
              {os?.evento_motivo && <><span>·</span><span style={{ color:'#636366' }}>{os.evento_motivo}</span></>}
              {fechasMostrar.length > 0 && <><span>·</span><span style={{ color:'#0f6e56', fontWeight:600 }}>{fmtFechas(fechasMostrar)}</span></>}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:7, alignItems:'center', flexShrink:0 }}>
          {os?.id && !readOnly && (
            <button onClick={() => setModalEditar(true)}
              style={{ padding:'6px 12px', borderRadius:8, border:'0.5px solid #e5e5ea', background:'#fff', color:'#636366', fontSize:12, cursor:'pointer' }}>
              Editar
            </button>
          )}
          {os?.id && <BtnReporteOSAdicional os={os} fases={fases} recursos={recursos}/>}
          {renderBotonesAccion()}
        </div>
      </div>

      {/* BANNER de estado */}
      <BannerEstado os={os} />

      {/* BODY */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <SidebarFases
          os={os} turnos={turnos} fases={fases} recursos={recursos} fechas={fechasOS}
          faseActiva={faseActiva} elementoActivo={elActivo}
          onActivarFase={setFaseActiva}
          onElementoClick={handleElementoClick}
          onEliminarElemento={handleEliminarElemento}
          onCrearFase={crearFase} onEliminarFase={eliminarFase}
          onActualizarFase={handleActualizarFase}
          onCrearTurno={crearTurno}
          onEditarTurno={editarTurno}
          onEliminarTurno={eliminarTurno}
          onDuplicarFase={duplicarFase}
          onMoverFase={moverFase}
          onRecursosChange={actualizarRecursos}
          onGuardarRecursos={() => guardarRecursos(recursos)}
          guardandoRecursos={guardandoRecursos}
          onActualizarDotacion={actualizarCabecera}
          readOnly={readOnly}
        />
        <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
          <ToolbarMapa herramienta={herramienta} onCambiarHerramienta={setHerramienta}
            faseActiva={faseActiva} fases={fases} filtroFase={filtroFase} onCambiarFiltro={setFiltroFase}/>
          <MapaAdicional fases={fases} filtroFase={filtroFase} herramienta={herramienta}
            faseActiva={faseActiva} elementoActivo={elActivo}
            onElementoCreado={handleElementoCreado} onElementoClick={handleElementoClick}
            onActualizarElemento={handleActualizarElemento}
            onEliminarElemento={handleEliminarElemento}
            onCerrarElemento={() => setElActivo(null)}/>
          <LeyendaMapa fases={fases} filtroFase={filtroFase}/>
        </div>
      </div>

      {modalEditar && (
        <ModalEditar os={os} onGuardar={handleGuardarEditar} onCancelar={() => setModalEditar(false)}/>
      )}
      {modalRechazo && (
        <ModalRechazo
          onConfirmar={handleRechazar}
          onCancelar={() => setModalRechazo(false)}
          cargando={accionando}
        />
      )}
    </div>
  )
}
