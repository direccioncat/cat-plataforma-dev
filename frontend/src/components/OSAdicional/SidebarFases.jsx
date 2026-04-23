/**
 * SidebarFases.jsx — v8
 * + dotacion_motorizados en turnos
 * + Sin tab Dotación (removida)
 * + Input numérico manual en recursos
 * + Fix: modal nuevo turno + handler correcto
 */
import { useState, useRef, useEffect } from 'react'

const TIPO_LABEL = { punto_control:'Punto', tramo:'Tramo', zona_area:'Area', desvio:'Desvio' }
const COLORES_FASE = ['#e24b4a','#f5c800','#4ecdc4','#8b5cf6','#f97316','#22c55e']
const RECURSOS_TIPOS = ['Cono','Cartel luminoso','Baston luminoso','Moto','Movil','Valla','Otro']

function TipoIcon({ tipo, color, size=13 }) {
  switch (tipo) {
    case 'punto_control': return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill={color}/></svg>
    case 'desvio': return <svg width={size} height={size} viewBox="0 0 24 24"><polygon points="12,4 21,20 3,20" fill={color}/></svg>
    case 'tramo': return <svg width={size} height={size} viewBox="0 0 24 24"><path d="M4 16 Q8 6 12 12 Q16 18 20 8" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"/></svg>
    case 'zona_area': return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="2.5"/></svg>
    default: return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill={color}/></svg>
  }
}

function fmtFecha(f) {
  if (!f) return ''
  return new Date(String(f).slice(0,10) + 'T12:00:00').toLocaleDateString('es-AR', { weekday:'short', day:'2-digit', month:'short' })
}
function isoFecha(f) {
  if (!f) return ''
  return String(typeof f === 'object' && f.fecha ? f.fecha : f).slice(0, 10)
}
function fmtHora(h) { return h ? String(h).slice(0,5) : '' }

const DOTACION_CAMPOS = [
  ['dotacion_agentes',          'Infantes'],
  ['dotacion_supervisores',     'Supervisores'],
  ['dotacion_choferes',         'Choferes'],
  ['dotacion_motorizados',      'Motorizados'],
  ['dotacion_choferes_gruas',   'Choferes de grúas'],
  ['dotacion_coordinadores',    'Coordinadores'],
]

// ── Counter numérico ──────────────────────────────────────────
function Counter({ value, onChange, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, background:'#f9f9fb', borderRadius:10, padding:'8px 12px' }}>
      <span style={{ fontSize:13, color:'#1d1d1f' }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <button onClick={() => onChange(Math.max(0, value - 1))}
          style={{ width:26, height:26, borderRadius:7, border:'0.5px solid #e5e5ea', background:'#fff', cursor:'pointer', fontSize:14, color:'#636366', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
        <input
          type="number" min="0" value={value}
          onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          style={{ width:42, textAlign:'center', border:'0.5px solid #e5e5ea', borderRadius:7, padding:'4px 0', fontSize:14, fontWeight:700, color:'#1a2744', fontFamily:'inherit', outline:'none', background:'#fff' }}/>
        <button onClick={() => onChange(value + 1)}
          style={{ width:26, height:26, borderRadius:7, border:'none', background:'#1a2744', cursor:'pointer', fontSize:14, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
      </div>
    </div>
  )
}

// ── ElementoRow ───────────────────────────────────────────────
function ElementoRow({ elemento, faseColor, isActive, onClick, onEliminar }) {
  const [hover, setHover] = useState(false)
  return (
    <div onClick={() => onClick(elemento)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:8, cursor:'pointer', marginBottom:1, background: isActive ? faseColor+'18' : hover ? '#f5f5f7' : 'transparent', border: isActive ? '1px solid '+faseColor+'44' : '1px solid transparent', transition:'all 0.1s' }}>
      <div style={{ flexShrink:0 }}><TipoIcon tipo={elemento.tipo} color={faseColor}/></div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:500, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {elemento.nombre || TIPO_LABEL[elemento.tipo] || 'Sin nombre'}
        </div>
        {elemento.instruccion && <div style={{ fontSize:10, color:'#aeaeb2', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:1 }}>{elemento.instruccion}</div>}
      </div>
      {hover && (
        <button onClick={e => { e.stopPropagation(); onEliminar(elemento.id) }}
          style={{ background:'none', border:'none', padding:'2px 4px', borderRadius:5, cursor:'pointer', color:'#d1d1d6', fontSize:12 }}
          onMouseEnter={e => { e.currentTarget.style.color='#e24b4a'; e.currentTarget.style.background='#fce8e8' }}
          onMouseLeave={e => { e.currentTarget.style.color='#d1d1d6'; e.currentTarget.style.background='none' }}>✕</button>
      )}
    </div>
  )
}

// ── Menú ··· de fase ──────────────────────────────────────────
function MenuFase({ fase, turnos, onDuplicar, onMover, onEliminar, readOnly }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!abierto) return
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [abierto])

  if (readOnly) return null

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={e => { e.stopPropagation(); setAbierto(p => !p) }}
        style={{ background:'none', border:'none', cursor:'pointer', color:'#c7c7cc', padding:'2px 5px', borderRadius:5, fontSize:13, lineHeight:1, letterSpacing:'1px' }}
        onMouseEnter={e => { e.currentTarget.style.color='#636366'; e.currentTarget.style.background='#f5f5f7' }}
        onMouseLeave={e => { e.currentTarget.style.color='#c7c7cc'; e.currentTarget.style.background='none' }}
        title="Opciones">···</button>
      {abierto && (
        <div style={{ position:'absolute', right:0, top:'100%', zIndex:300, background:'#fff', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,0.14)', border:'0.5px solid #e5e5ea', minWidth:170, padding:'4px 0', marginTop:3 }}>
          <MenuItem icon="⧉" label="Duplicar fase" onClick={() => { setAbierto(false); onDuplicar(fase.id) }}/>
          {turnos.length > 1 && (
            <>
              <div style={{ height:'0.5px', background:'#f5f5f7', margin:'3px 0' }}/>
              <div style={{ fontSize:10, fontWeight:700, color:'#aeaeb2', padding:'4px 14px', letterSpacing:'0.06em' }}>MOVER A TURNO</div>
              {turnos.filter(t => t.id !== fase.turno_id).map(t => (
                <MenuItem key={t.id} icon="→"
                  label={t.nombre || (fmtFecha(t.fecha) + (fmtHora(t.hora_inicio) ? ' ' + fmtHora(t.hora_inicio) : ''))}
                  onClick={() => { setAbierto(false); onMover(fase.id, t.id) }}/>
              ))}
              {fase.turno_id && <MenuItem icon="✕" label="Quitar de turno" onClick={() => { setAbierto(false); onMover(fase.id, null) }}/>}
            </>
          )}
          <div style={{ height:'0.5px', background:'#f5f5f7', margin:'3px 0' }}/>
          <MenuItem icon="🗑" label="Eliminar fase" danger onClick={() => { setAbierto(false); if (window.confirm('Eliminar fase "' + fase.nombre + '"?')) onEliminar(fase.id) }}/>
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, label, onClick, danger }) {
  const [hover, setHover] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', cursor:'pointer', fontSize:12, color: danger ? '#c0392b' : '#1d1d1f', background: hover ? (danger ? '#fff0f0' : '#f5f5f7') : 'transparent', transition:'background 0.1s' }}>
      <span style={{ fontSize:13 }}>{icon}</span>{label}
    </div>
  )
}

// ── FaseCard ──────────────────────────────────────────────────
function FaseCard({ fase, turnos, faseActiva, elementoActivo, isOpen, onToggle, onActivar, onElementoClick, onEliminarElemento, onEliminar, onActualizarFase, onDuplicar, onMover, readOnly }) {
  const isActive = faseActiva === fase.id
  const elementos = fase.elementos || []
  const [editNombre, setEditNombre] = useState(false)
  const [nombre, setNombre] = useState(fase.nombre)
  const [desde, setDesde] = useState(fmtHora(fase.horario_desde))
  const [hasta, setHasta] = useState(fmtHora(fase.horario_hasta))
  const nombreRef = useRef(null)

  useEffect(() => { setNombre(fase.nombre); setDesde(fmtHora(fase.horario_desde)); setHasta(fmtHora(fase.horario_hasta)) }, [fase.id, fase.nombre, fase.horario_desde, fase.horario_hasta])
  useEffect(() => { if (editNombre) nombreRef.current?.focus() }, [editNombre])

  function guardarNombre() {
    setEditNombre(false)
    if (nombre.trim() && nombre.trim() !== fase.nombre) onActualizarFase(fase.id, { nombre: nombre.trim() })
    else setNombre(fase.nombre)
  }

  const INP_SM = { background:'#f5f5f7', border:'none', borderRadius:7, padding:'4px 7px', fontSize:11, color:'#1d1d1f', fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box' }

  return (
    <div style={{ borderRadius:12, marginBottom:5, overflow:'hidden', border: isActive ? '1.5px solid '+fase.color : '1px solid #ebebeb', background:'#fff', boxShadow: isActive ? '0 2px 16px '+fase.color+'20' : '0 1px 3px rgba(0,0,0,0.04)', transition:'all 0.15s' }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 10px', background: isActive ? fase.color+'0e' : 'transparent' }}>
        <div onClick={onToggle} style={{ display:'flex', alignItems:'center', gap:7, flex:1, minWidth:0, cursor:'pointer' }}>
          <div style={{ width:9, height:9, borderRadius:'50%', background:fase.color, flexShrink:0, boxShadow:'0 0 0 2px '+fase.color+'30' }}/>
          {editNombre ? (
            <input ref={nombreRef} value={nombre} onChange={e => setNombre(e.target.value)}
              onBlur={guardarNombre}
              onKeyDown={e => { if (e.key==='Enter') guardarNombre(); if (e.key==='Escape') { setNombre(fase.nombre); setEditNombre(false) } }}
              onClick={e => e.stopPropagation()}
              style={{ ...INP_SM, fontSize:12, fontWeight:700, flex:1 }}/>
          ) : (
            <div style={{ flex:1, minWidth:0 }}>
              <div onDoubleClick={e => { e.stopPropagation(); if (!readOnly) setEditNombre(true) }}
                style={{ fontSize:12, fontWeight:700, color:'#1a2744', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', cursor: readOnly ? 'default' : 'text' }}>
                {fase.nombre}
              </div>
              {(desde || hasta) && <div style={{ fontSize:10, color:'#8e8e93', marginTop:1 }}>{[desde, hasta].filter(Boolean).join(' – ')}hs</div>}
            </div>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
          {elementos.length > 0 && <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20, background:fase.color+'20', color:fase.color }}>{elementos.length}</span>}
          <svg onClick={onToggle} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5"
            style={{ transform:isOpen?'rotate(180deg)':'none', transition:'transform 0.18s', cursor:'pointer' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <MenuFase fase={fase} turnos={turnos} onDuplicar={onDuplicar} onMover={onMover} onEliminar={onEliminar} readOnly={readOnly}/>
        </div>
      </div>

      {isOpen && (
        <div style={{ padding:'4px 9px 10px' }}>
          {!readOnly && (
            <div style={{ display:'flex', gap:5, marginBottom:7 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9, fontWeight:600, color:'#aeaeb2', letterSpacing:'0.04em', marginBottom:3 }}>DESDE</div>
                <input type="time" value={desde} onChange={e => { setDesde(e.target.value); onActualizarFase(fase.id, { horario_desde: e.target.value || null }) }} style={INP_SM}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9, fontWeight:600, color:'#aeaeb2', letterSpacing:'0.04em', marginBottom:3 }}>HASTA</div>
                <input type="time" value={hasta} onChange={e => { setHasta(e.target.value); onActualizarFase(fase.id, { horario_hasta: e.target.value || null }) }} style={INP_SM}/>
              </div>
            </div>
          )}
          {!readOnly && (
            <button onClick={() => onActivar(fase.id)}
              style={{ width:'100%', padding:'6px 8px', borderRadius:8, border:'none', marginBottom:6, background: isActive ? fase.color : '#f5f5f7', color: isActive ? '#fff' : '#636366', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, transition:'all 0.15s' }}>
              {isActive ? <>✏ Dibujando en esta fase</> : <><span style={{ opacity:0.5 }}>✏</span> Activar para dibujar</>}
            </button>
          )}
          {elementos.length === 0
            ? <div style={{ fontSize:11, color:'#c7c7cc', textAlign:'center', padding:'6px 0', fontStyle:'italic' }}>Sin elementos</div>
            : elementos.map(el => (
                <ElementoRow key={el.id} elemento={el} faseColor={fase.color}
                  isActive={elementoActivo?.id === el.id}
                  onClick={onElementoClick}
                  onEliminar={elId => onEliminarElemento(elId, fase.id)}/>
              ))
          }
        </div>
      )}
    </div>
  )
}

// ── TurnoCard ─────────────────────────────────────────────────
function TurnoCard({ turno, fases, turnos, faseActiva, elementoActivo, fasesAbiertas, onToggleFase, onActivarFase, onElementoClick, onEliminarElemento, onEliminarFase, onActualizarFase, onDuplicarFase, onMoverFase, onCrearFase, onEditarTurno, onEliminarTurno, readOnly }) {
  const [abierto, setAbierto] = useState(true)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({
    nombre: turno.nombre || '',
    hora_inicio: fmtHora(turno.hora_inicio),
    hora_fin: fmtHora(turno.hora_fin),
    dotacion_agentes:         turno.dotacion_agentes         || 0,
    dotacion_supervisores:    turno.dotacion_supervisores    || 0,
    dotacion_choferes:        turno.dotacion_choferes        || 0,
    dotacion_motorizados:     turno.dotacion_motorizados     || 0,
    dotacion_choferes_gruas:  turno.dotacion_choferes_gruas  || 0,
    dotacion_coordinadores:   turno.dotacion_coordinadores   || 0,
  })

  useEffect(() => {
    setForm({
      nombre: turno.nombre || '',
      hora_inicio: fmtHora(turno.hora_inicio),
      hora_fin: fmtHora(turno.hora_fin),
      dotacion_agentes:         turno.dotacion_agentes         || 0,
      dotacion_supervisores:    turno.dotacion_supervisores    || 0,
      dotacion_choferes:        turno.dotacion_choferes        || 0,
      dotacion_motorizados:     turno.dotacion_motorizados     || 0,
      dotacion_choferes_gruas:  turno.dotacion_choferes_gruas  || 0,
      dotacion_coordinadores:   turno.dotacion_coordinadores   || 0,
      })
  }, [turno.id])

  async function guardarTurno() {
    await onEditarTurno(turno.id, form)
    setEditando(false)
  }

  const INP = { background:'#f0f0f5', border:'none', borderRadius:7, padding:'5px 8px', fontSize:12, color:'#1d1d1f', fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box' }

  const horaStr = [fmtHora(turno.hora_inicio), fmtHora(turno.hora_fin)].filter(Boolean).join(' – ')
  const fechaStr = turno.fecha ? fmtFecha(turno.fecha) : ''
  const dotTotal = (turno.dotacion_agentes||0) + (turno.dotacion_supervisores||0) + (turno.dotacion_choferes||0) + (turno.dotacion_motorizados||0) + (turno.dotacion_choferes_gruas||0) + (turno.dotacion_coordinadores||0)
  return (
    <div style={{ borderRadius:14, marginBottom:10, background:'#fff', border:'0.5px solid #e5e5ea', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div style={{ padding:'10px 12px', background:'#1a2744', display:'flex', alignItems:'center', gap:8 }}>
        <div onClick={() => setAbierto(p => !p)} style={{ flex:1, minWidth:0, cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"
              style={{ transform:abierto?'rotate(90deg)':'none', transition:'transform 0.15s', flexShrink:0 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <div style={{ fontSize:12, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {turno.nombre || ('Turno' + (fechaStr ? ' · ' + fechaStr : '') + (horaStr ? ' · ' + horaStr : ''))}
            </div>
          </div>
          {(fechaStr || horaStr || dotTotal > 0) && (
            <div style={{ display:'flex', gap:8, marginTop:3, marginLeft:20, flexWrap:'wrap' }}>
              {fechaStr && <span style={{ fontSize:10, color:'rgba(255,255,255,0.55)' }}>{fechaStr}</span>}
              {horaStr && <span style={{ fontSize:10, color:'#f5c800', fontWeight:600 }}>{horaStr}hs</span>}
              {dotTotal > 0 && <span style={{ fontSize:10, color:'rgba(255,255,255,0.55)' }}>{dotTotal} personas</span>}
            </div>
          )}
        </div>
        {!readOnly && (
          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
            <button onClick={e => { e.stopPropagation(); setEditando(p => !p) }}
              style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:7, padding:'4px 7px', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:11 }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}>✎</button>
            <button onClick={e => { e.stopPropagation(); if (window.confirm('Eliminar turno? Las fases quedarán sin turno.')) onEliminarTurno(turno.id) }}
              style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:7, padding:'4px 7px', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:11 }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(200,50,50,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}>✕</button>
          </div>
        )}
      </div>

      {/* Form editar */}
      {editando && !readOnly && (
        <div style={{ padding:'12px', background:'#f5f5f7', borderBottom:'0.5px solid #e5e5ea' }}>
          <div style={{ display:'flex', gap:6, marginBottom:8 }}>
            <div style={{ flex:2 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'#aeaeb2', marginBottom:3 }}>NOMBRE</div>
              <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Mañana" style={INP}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'#aeaeb2', marginBottom:3 }}>DESDE</div>
              <input type="time" value={form.hora_inicio} onChange={e => setForm(p => ({ ...p, hora_inicio: e.target.value }))} style={INP}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'#aeaeb2', marginBottom:3 }}>HASTA</div>
              <input type="time" value={form.hora_fin} onChange={e => setForm(p => ({ ...p, hora_fin: e.target.value }))} style={INP}/>
            </div>
          </div>
          <div style={{ fontSize:10, fontWeight:700, color:'#aeaeb2', marginBottom:6 }}>DOTACIÓN</div>
          {DOTACION_CAMPOS.map(([k, l]) => (
            <Counter key={k} label={l} value={form[k]} onChange={v => setForm(p => ({ ...p, [k]: v }))}/>
          ))}
          <div style={{ display:'flex', gap:6, marginTop:10 }}>
            <button onClick={() => setEditando(false)} style={{ flex:1, padding:'7px', borderRadius:9, border:'0.5px solid #e5e5ea', background:'#fff', color:'#636366', fontSize:12, cursor:'pointer' }}>Cancelar</button>
            <button onClick={guardarTurno} style={{ flex:2, padding:'7px', borderRadius:9, border:'none', background:'#1a2744', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>Guardar</button>
          </div>
        </div>
      )}

      {/* Fases */}
      {abierto && (
        <div style={{ padding:'8px' }}>
          {fases.length === 0
            ? <div style={{ fontSize:11, color:'#c7c7cc', textAlign:'center', padding:'10px 0', fontStyle:'italic' }}>Sin fases en este turno</div>
            : fases.map(fase => (
                <FaseCard key={fase.id} fase={fase} turnos={turnos}
                  faseActiva={faseActiva} elementoActivo={elementoActivo}
                  isOpen={fasesAbiertas[fase.id] !== false}
                  onToggle={() => onToggleFase(fase.id)}
                  onActivar={onActivarFase}
                  onElementoClick={onElementoClick}
                  onEliminarElemento={onEliminarElemento}
                  onEliminar={onEliminarFase}
                  onActualizarFase={onActualizarFase}
                  onDuplicar={onDuplicarFase}
                  onMover={onMoverFase}
                  readOnly={readOnly}/>
              ))
          }
          {!readOnly && (
            <button onClick={() => onCrearFase(turno.id)}
              style={{ width:'100%', padding:'7px', borderRadius:9, border:'1px dashed #d1d1d6', background:'none', color:'#8e8e93', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}
              onMouseEnter={e => e.currentTarget.style.background='#f9f9fb'}
              onMouseLeave={e => e.currentTarget.style.background='none'}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nueva fase
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Modal nuevo turno ─────────────────────────────────────────
function ModalNuevoTurno({ fechasOS, onCrear, onCerrar }) {
  const [form, setForm] = useState({
    nombre: '',
    fecha: isoFecha(fechasOS[0]) || '',
    hora_inicio: '',
    hora_fin: '',
    dotacion_agentes:         0,
    dotacion_supervisores:    0,
    dotacion_choferes:        0,
    dotacion_motorizados:     0,
    dotacion_choferes_gruas:  0,
    dotacion_coordinadores:   0,
  })

  const INP = { background:'#f5f5f7', border:'none', borderRadius:9, padding:'8px 11px', fontSize:13, color:'#1d1d1f', fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={onCerrar}>
      <div style={{ background:'#fff', borderRadius:18, padding:24, width:380, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 8px 40px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:15, fontWeight:700, color:'#1a2744', marginBottom:18 }}>Nuevo turno</div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#aeaeb2', marginBottom:5 }}>NOMBRE (opcional)</div>
          <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Mañana, Tarde..." style={INP}/>
        </div>

        {fechasOS.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#aeaeb2', marginBottom:5 }}>FECHA</div>
            <select value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={{ ...INP, cursor:'pointer' }}>
              <option value="">Sin fecha específica</option>
              {fechasOS.map(f => { const iso = isoFecha(f); return <option key={iso} value={iso}>{fmtFecha(iso)}</option> })}
            </select>
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#aeaeb2', marginBottom:5 }}>DESDE</div>
            <input type="time" value={form.hora_inicio} onChange={e => setForm(p => ({ ...p, hora_inicio: e.target.value }))} style={INP}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#aeaeb2', marginBottom:5 }}>HASTA</div>
            <input type="time" value={form.hora_fin} onChange={e => setForm(p => ({ ...p, hora_fin: e.target.value }))} style={INP}/>
          </div>
        </div>

        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#aeaeb2', marginBottom:8 }}>DOTACIÓN NECESARIA</div>
          {DOTACION_CAMPOS.map(([k, l]) => (
            <Counter key={k} label={l} value={form[k]} onChange={v => setForm(p => ({ ...p, [k]: v }))}/>
          ))}
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onCerrar} style={{ flex:1, padding:'10px', borderRadius:11, border:'0.5px solid #e5e5ea', background:'#fff', color:'#636366', fontSize:13, cursor:'pointer' }}>Cancelar</button>
          <button
            onClick={() => onCrear(form)}
            style={{ flex:2, padding:'10px', borderRadius:11, border:'none', background:'#1a2744', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            Crear turno
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Recursos ──────────────────────────────────────────────────
function PanelRecursos({ recursos, onChange }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:600, color:'#aeaeb2', letterSpacing:'0.05em', marginBottom:10 }}>MATERIALES</div>
      {recursos.length === 0 && <div style={{ fontSize:12, color:'#c7c7cc', textAlign:'center', padding:'12px 0', fontStyle:'italic' }}>Sin materiales asignados</div>}
      {recursos.map((r, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, background:'#f9f9fb', border:'0.5px solid #efefef', borderRadius:10, padding:'7px 9px' }}>
          <select value={r.tipo} onChange={e => { const n=[...recursos]; n[i]={...r,tipo:e.target.value}; onChange(n) }}
            style={{ flex:2, background:'transparent', border:'none', fontSize:12, color:'#1d1d1f', fontFamily:'inherit', outline:'none', cursor:'pointer' }}>
            {RECURSOS_TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <button onClick={() => { const n=[...recursos]; n[i]={...r,cantidad:Math.max(0,r.cantidad-1)}; onChange(n) }}
              style={{ width:24,height:24,borderRadius:6,border:'0.5px solid #e5e5ea',background:'#fff',cursor:'pointer',fontSize:13,color:'#636366',display:'flex',alignItems:'center',justifyContent:'center' }}>-</button>
            <input
              type="number" min="0" value={r.cantidad}
              onChange={e => { const n=[...recursos]; n[i]={...r,cantidad:Math.max(0,parseInt(e.target.value)||0)}; onChange(n) }}
              style={{ width:44,textAlign:'center',border:'0.5px solid #e5e5ea',borderRadius:6,padding:'3px 0',fontSize:13,fontWeight:700,color:'#1a2744',fontFamily:'inherit',outline:'none',background:'#fff' }}/>
            <button onClick={() => { const n=[...recursos]; n[i]={...r,cantidad:r.cantidad+1}; onChange(n) }}
              style={{ width:24,height:24,borderRadius:6,border:'none',background:'#1a2744',cursor:'pointer',fontSize:13,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
          </div>
          <button onClick={() => onChange(recursos.filter((_,j) => j!==i))}
            style={{ background:'none',border:'none',color:'#d1d1d6',cursor:'pointer',fontSize:12,padding:'2px' }}
            onMouseEnter={e => e.currentTarget.style.color='#e24b4a'}
            onMouseLeave={e => e.currentTarget.style.color='#d1d1d6'}>✕</button>
        </div>
      ))}
      <button onClick={() => onChange([...recursos, { tipo:'Cono', cantidad:0 }])}
        style={{ width:'100%',padding:'8px',border:'1px dashed #d1d1d6',borderRadius:10,background:'none',color:'#8e8e93',fontSize:12,cursor:'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background='#f9f9fb'}
        onMouseLeave={e => e.currentTarget.style.background='none'}>
        + Agregar material
      </button>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function SidebarFases({
  os, turnos = [], fases = [], recursos = [], fechas = [],
  faseActiva, elementoActivo,
  onActivarFase, onElementoClick, onEliminarElemento,
  onCrearFase, onEliminarFase, onActualizarFase,
  onCrearTurno, onEditarTurno, onEliminarTurno,
  onDuplicarFase, onMoverFase,
  onRecursosChange, onActualizarDotacion,
  readOnly,
}) {
  const [tab, setTab]                     = useState('fases')
  const [fasesAbiertas, setFasesAbiertas] = useState({})
  const [modalTurno, setModalTurno]       = useState(false)

  function toggleFase(id) { setFasesAbiertas(p => ({ ...p, [id]: !p[id] })) }

  async function handleCrearFase(turnoId) {
    const num = fases.length + 1
    const fase = await onCrearFase({ nombre: 'Fase ' + num, turno_id: turnoId || null })
    if (fase) {
      setFasesAbiertas(p => ({ ...p, [fase.id]: true }))
      onActivarFase(fase.id)
    }
  }

  // Fix: crear turno y cerrar modal
  async function handleCrearTurno(form) {
    const resultado = await onCrearTurno(form)
    if (resultado) setModalTurno(false)
  }

  const fasesSinTurno  = fases.filter(f => !f.turno_id)
  const totalElementos = fases.reduce((acc, f) => acc + (f.elementos||[]).length, 0)

  return (
    <div style={{ width:272, flexShrink:0, borderRight:'0.5px solid #e5e5ea', display:'flex', flexDirection:'column', overflow:'hidden', background:'#fafafa' }}>
      {/* Tabs — sin Dotación */}
      <div style={{ display:'flex', borderBottom:'0.5px solid #ebebeb', background:'#fff', flexShrink:0 }}>
        {[['fases','Fases'],['recursos','Recursos']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex:1, padding:'10px 2px', fontSize:11, fontWeight:tab===id?700:400, color:tab===id?'#1a2744':'#8e8e93', background:'none', border:'none', borderBottom:tab===id?'2px solid #1a2744':'2px solid transparent', cursor:'pointer' }}>
            {label}
            {id==='fases' && totalElementos>0 && <span style={{ marginLeft:4, fontSize:9, fontWeight:700, background:'#f0f0f5', color:'#8e8e93', padding:'1px 5px', borderRadius:20 }}>{totalElementos}</span>}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'10px 8px' }}>
        {tab === 'fases' && (
          <>
            {turnos.map(turno => (
              <TurnoCard key={turno.id}
                turno={turno}
                fases={fases.filter(f => f.turno_id === turno.id)}
                turnos={turnos}
                faseActiva={faseActiva} elementoActivo={elementoActivo}
                fasesAbiertas={fasesAbiertas}
                onToggleFase={toggleFase}
                onActivarFase={onActivarFase}
                onElementoClick={onElementoClick}
                onEliminarElemento={onEliminarElemento}
                onEliminarFase={onEliminarFase}
                onActualizarFase={onActualizarFase}
                onDuplicarFase={onDuplicarFase}
                onMoverFase={onMoverFase}
                onCrearFase={handleCrearFase}
                onEditarTurno={onEditarTurno}
                onEliminarTurno={onEliminarTurno}
                readOnly={readOnly}/>
            ))}

            {fasesSinTurno.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, padding:'0 2px' }}>
                  <div style={{ height:'0.5px', background:'#ebebeb', flex:1 }}/>
                  <span style={{ fontSize:10, fontWeight:700, color:'#c7c7cc', whiteSpace:'nowrap', letterSpacing:'0.04em' }}>SIN TURNO</span>
                  <div style={{ height:'0.5px', background:'#ebebeb', flex:1 }}/>
                </div>
                {fasesSinTurno.map(fase => (
                  <FaseCard key={fase.id} fase={fase} turnos={turnos}
                    faseActiva={faseActiva} elementoActivo={elementoActivo}
                    isOpen={fasesAbiertas[fase.id] !== false}
                    onToggle={() => toggleFase(fase.id)}
                    onActivar={onActivarFase}
                    onElementoClick={onElementoClick}
                    onEliminarElemento={onEliminarElemento}
                    onEliminar={onEliminarFase}
                    onActualizarFase={onActualizarFase}
                    onDuplicar={onDuplicarFase}
                    onMover={onMoverFase}
                    readOnly={readOnly}/>
                ))}
              </div>
            )}

            {turnos.length === 0 && fases.length === 0 && (
              <div style={{ textAlign:'center', padding:'28px 12px' }}>
                <div style={{ fontSize:32, marginBottom:10 }}>🗂</div>
                <div style={{ fontSize:13, fontWeight:600, color:'#1a2744', marginBottom:4 }}>Sin turnos ni fases</div>
                <div style={{ fontSize:12, color:'#aeaeb2' }}>Creá un turno para organizar el operativo</div>
              </div>
            )}

            {!readOnly && (
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                <button onClick={() => setModalTurno(true)}
                  style={{ width:'100%', padding:'10px', borderRadius:11, border:'none', background:'#1a2744', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Nuevo turno
                </button>
                {turnos.length === 0 && (
                  <button onClick={() => handleCrearFase(null)}
                    style={{ width:'100%', padding:'9px', borderRadius:11, border:'1px dashed #d1d1d6', background:'#fff', color:'#8e8e93', fontSize:12, cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f5f5f7'}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                    + Fase sin turno
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'recursos' && <PanelRecursos recursos={recursos} onChange={onRecursosChange}/>}
      </div>

      {modalTurno && (
        <ModalNuevoTurno
          fechasOS={fechas}
          onCrear={handleCrearTurno}
          onCerrar={() => setModalTurno(false)}
        />
      )}
    </div>
  )
}
