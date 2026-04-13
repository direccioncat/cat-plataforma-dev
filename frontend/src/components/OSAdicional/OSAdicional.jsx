/**
 * OSAdicional.jsx — v9
 * + Pasa recursos al BtnReporteOSAdicional para el PDF
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../../lib/api'
import { useOSAdicional } from './useOSAdicional'
import SidebarFases from './SidebarFases'
import MapaAdicional from './MapaAdicional'
import { ToolbarMapa, LeyendaMapa } from './ToolbarMapa'
import { BtnReporteOSAdicional } from './ReporteOSAdicional'

const ESTADOS = {
  borrador:   { label: 'Borrador',   color: '#854f0b', bg: '#faeeda' },
  validacion: { label: 'Validacion', color: '#534ab7', bg: '#eeedf8' },
  vigente:    { label: 'Vigente',    color: '#0f6e56', bg: '#e8faf2' },
  cumplida:   { label: 'Cumplida',   color: '#8e8e93', bg: '#f5f5f7' },
}
const TRANSICIONES       = { borrador: 'validacion', validacion: 'vigente', vigente: 'cumplida' }
const TRANSICIONES_LABEL = { validacion: 'Enviar a validacion', vigente: 'Publicar', cumplida: 'Marcar cumplida' }

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

export default function OSAdicional({ osId: osIdProp, fechasIniciales = [], onVolver }) {
  const hook = useOSAdicional(null)
  const { os, fases, recursos, cargar, actualizarCabecera, cambiarEstado, crearFase, eliminarFase, crearElemento, actualizarElemento, eliminarElemento, actualizarRecursos, setOS, setFases, setRecursos } = hook

  const [cargando,    setCargando]    = useState(true)
  const [creando,     setCreando]     = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [herramienta, setHerramienta] = useState('mover')
  const [faseActiva,  setFaseActiva]  = useState(null)
  const [filtroFase,  setFiltroFase]  = useState('todas')
  const [elActivo,    setElActivo]    = useState(null)

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

  async function handleActualizarDotacion(form) {
    await actualizarCabecera(form)
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

  const estadoInfo    = ESTADOS[os?.estado || 'borrador']
  const sigEstado     = TRANSICIONES[os?.estado]
  const sigLabel      = TRANSICIONES_LABEL[sigEstado]
  const readOnly      = os?.estado === 'cumplida'
  const fechasOS      = os?.fechas || []
  const fechasMostrar = fechasOS.length ? fechasOS : fechasIniciales

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
          {/* PDF — pasa os, fases Y recursos */}
          {os?.id && <BtnReporteOSAdicional os={os} fases={fases} recursos={recursos}/>}
          {os?.id && !readOnly && sigEstado && (
            <button onClick={() => { if (window.confirm(`Cambiar a "${sigLabel}"?`)) cambiarEstado(sigEstado) }}
              style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'#1a2744', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              {sigLabel}
            </button>
          )}
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <SidebarFases
          os={os} fases={fases} recursos={recursos} fechas={fechasOS}
          faseActiva={faseActiva} elementoActivo={elActivo}
          onActivarFase={setFaseActiva}
          onElementoClick={handleElementoClick}
          onEliminarElemento={handleEliminarElemento}
          onCrearFase={crearFase} onEliminarFase={eliminarFase}
          onActualizarFase={handleActualizarFase}
          onRecursosChange={actualizarRecursos}
          onActualizarDotacion={handleActualizarDotacion}
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
    </div>
  )
}
