/**
 * SidebarFases.jsx — v6
 * + Nueva fase sin modal: se crea con nombre default y queda editable inline
 * + FaseCard con campos de horario/fecha editables inline
 * + Dotacion declarada como tercera pestaña
 */
import { useState, useRef, useEffect } from 'react'

const TIPO_LABEL = {
  punto_control: 'Punto',
  tramo:         'Tramo',
  zona_area:     'Area',
  desvio:        'Desvio',
}

function TipoIcon({ tipo, color, size = 13 }) {
  switch (tipo) {
    case 'punto_control':
      return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill={color}/></svg>
    case 'desvio':
      return <svg width={size} height={size} viewBox="0 0 24 24"><polygon points="12,4 21,20 3,20" fill={color}/></svg>
    case 'tramo':
      return <svg width={size} height={size} viewBox="0 0 24 24"><path d="M4 16 Q8 6 12 12 Q16 18 20 8" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"/></svg>
    case 'zona_area':
      return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="2.5"/></svg>
    default:
      return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill={color}/></svg>
  }
}

function fmtFecha(f) {
  if (!f) return ''
  const iso = String(f).slice(0, 10)
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })
}
function isoFecha(f) {
  if (!f) return ''
  return String(typeof f === 'object' && f.fecha ? f.fecha : f).slice(0, 10)
}

// ── Row de elemento ───────────────────────────────────────────
function ElementoRow({ elemento, faseColor, isActive, onClick, onEliminar }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={() => onClick(elemento)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display:'flex', alignItems:'center', gap:8, padding:'6px 8px',
        borderRadius:8, cursor:'pointer', marginBottom:1,
        background: isActive ? `${faseColor}18` : hover ? '#f5f5f7' : 'transparent',
        border: isActive ? `1px solid ${faseColor}44` : '1px solid transparent',
        transition:'all 0.1s',
      }}>
      <div style={{ flexShrink:0, display:'flex', alignItems:'center' }}>
        <TipoIcon tipo={elemento.tipo} color={faseColor}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:500, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {elemento.nombre || TIPO_LABEL[elemento.tipo] || 'Sin nombre'}
        </div>
        {elemento.instruccion && (
          <div style={{ fontSize:10, color:'#aeaeb2', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:1 }}>
            {elemento.instruccion}
          </div>
        )}
      </div>
      {hover && (
        <button
          onClick={e => { e.stopPropagation(); onEliminar(elemento.id) }}
          style={{ background:'none', border:'none', padding:'2px 4px', borderRadius:5, cursor:'pointer', color:'#d1d1d6', fontSize:12, lineHeight:1, flexShrink:0 }}
          onMouseEnter={e => { e.currentTarget.style.color='#e24b4a'; e.currentTarget.style.background='#fce8e8' }}
          onMouseLeave={e => { e.currentTarget.style.color='#d1d1d6'; e.currentTarget.style.background='none' }}>
          ✕
        </button>
      )}
    </div>
  )
}

// ── FaseCard con edicion inline ───────────────────────────────
function FaseCard({ fase, fechasOS, faseActiva, elementoActivo, isOpen, onToggle, onActivar, onElementoClick, onEliminarElemento, onEliminar, onActualizarFase, readOnly }) {
  const isActive  = faseActiva === fase.id
  const elementos = fase.elementos || []

  // Estado local de edicion inline
  const [editNombre, setEditNombre] = useState(false)
  const [nombre,     setNombre]     = useState(fase.nombre)
  const [desde,      setDesde]      = useState(fase.horario_desde?.slice(0,5) || '')
  const [hasta,      setHasta]      = useState(fase.horario_hasta?.slice(0,5) || '')
  const [fecha,      setFecha]      = useState(isoFecha(fase.fecha) || '')
  const nombreRef = useRef(null)

  useEffect(() => {
    setNombre(fase.nombre)
    setDesde(fase.horario_desde?.slice(0,5) || '')
    setHasta(fase.horario_hasta?.slice(0,5) || '')
    setFecha(isoFecha(fase.fecha) || '')
  }, [fase.id, fase.nombre, fase.horario_desde, fase.horario_hasta, fase.fecha])

  useEffect(() => {
    if (editNombre) nombreRef.current?.focus()
  }, [editNombre])

  function guardarNombre() {
    setEditNombre(false)
    if (nombre.trim() && nombre.trim() !== fase.nombre) {
      onActualizarFase(fase.id, { nombre: nombre.trim() })
    } else {
      setNombre(fase.nombre)
    }
  }

  function guardarHorario(campo, valor) {
    if (campo === 'desde') {
      setDesde(valor)
      onActualizarFase(fase.id, { horario_desde: valor || null })
    } else {
      setHasta(valor)
      onActualizarFase(fase.id, { horario_hasta: valor || null })
    }
  }

  function guardarFecha(valor) {
    setFecha(valor)
    onActualizarFase(fase.id, { fecha: valor || null })
  }

  const INP_SM = {
    background:'#f5f5f7', border:'none', borderRadius:7,
    padding:'4px 7px', fontSize:11, color:'#1d1d1f',
    fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box',
  }

  return (
    <div style={{
      borderRadius:12, marginBottom:5, overflow:'hidden',
      border: isActive ? `1.5px solid ${fase.color}` : '1px solid #ebebeb',
      background: '#fff',
      boxShadow: isActive ? `0 2px 16px ${fase.color}20` : '0 1px 3px rgba(0,0,0,0.04)',
      transition:'all 0.15s',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 10px', background: isActive ? `${fase.color}0e` : 'transparent' }}>
        <div
          onClick={onToggle}
          style={{ display:'flex', alignItems:'center', gap:7, flex:1, minWidth:0, cursor:'pointer' }}>
          <div style={{ width:9, height:9, borderRadius:'50%', background:fase.color, flexShrink:0, boxShadow:`0 0 0 2px ${fase.color}30` }}/>

          {/* Nombre editable */}
          {editNombre ? (
            <input
              ref={nombreRef}
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onBlur={guardarNombre}
              onKeyDown={e => { if (e.key === 'Enter') guardarNombre(); if (e.key === 'Escape') { setNombre(fase.nombre); setEditNombre(false) } }}
              onClick={e => e.stopPropagation()}
              style={{ ...INP_SM, fontSize:12, fontWeight:700, flex:1 }}
            />
          ) : (
            <div style={{ flex:1, minWidth:0 }}>
              <div
                onDoubleClick={e => { e.stopPropagation(); if (!readOnly) setEditNombre(true) }}
                style={{ fontSize:12, fontWeight:700, color:'#1a2744', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', cursor: readOnly ? 'default' : 'text' }}
                title={readOnly ? undefined : 'Doble click para editar'}>
                {fase.nombre}
              </div>
              {(fase.horario_desde || fase.horario_hasta) && (
                <div style={{ fontSize:10, color:'#8e8e93', marginTop:1 }}>
                  {[fase.horario_desde?.slice(0,5), fase.horario_hasta?.slice(0,5)].filter(Boolean).join(' – ')}hs
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
          {elementos.length > 0 && (
            <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20, background:`${fase.color}20`, color:fase.color }}>
              {elementos.length}
            </span>
          )}
          <svg
            onClick={onToggle}
            width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5"
            style={{ transform:isOpen?'rotate(180deg)':'none', transition:'transform 0.18s', cursor:'pointer' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          {!readOnly && (
            <button
              onClick={e => { e.stopPropagation(); if (window.confirm(`Eliminar fase "${fase.nombre}"?`)) onEliminar(fase.id) }}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#d1d1d6', padding:'2px 3px', fontSize:12, lineHeight:1, borderRadius:5 }}
              onMouseEnter={e => { e.currentTarget.style.color='#e24b4a'; e.currentTarget.style.background='#fce8e8' }}
              onMouseLeave={e => { e.currentTarget.style.color='#d1d1d6'; e.currentTarget.style.background='none' }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div style={{ padding:'4px 9px 10px' }}>

          {/* Campos inline: dia + horario */}
          {!readOnly && (
            <div style={{ display:'flex', gap:5, marginBottom:7 }}>
              {/* Dia */}
              {fechasOS.length > 1 && (
                <div style={{ flex:1.2 }}>
                  <div style={{ fontSize:9, fontWeight:600, color:'#aeaeb2', letterSpacing:'0.04em', marginBottom:3 }}>DIA</div>
                  <select value={fecha} onChange={e => guardarFecha(e.target.value)}
                    style={{ ...INP_SM, cursor:'pointer', appearance:'none' }}>
                    <option value="">— Sin dia —</option>
                    {fechasOS.map(f => { const iso = isoFecha(f); return <option key={iso} value={iso}>{fmtFecha(iso)}</option> })}
                  </select>
                </div>
              )}
              {fechasOS.length === 1 && (
                <div style={{ flex:1.2 }}>
                  <div style={{ fontSize:9, fontWeight:600, color:'#aeaeb2', letterSpacing:'0.04em', marginBottom:3 }}>DIA</div>
                  <div style={{ ...INP_SM, color:'#636366', cursor:'default' }}>{fmtFecha(isoFecha(fechasOS[0]))}</div>
                </div>
              )}
              {/* Desde */}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9, fontWeight:600, color:'#aeaeb2', letterSpacing:'0.04em', marginBottom:3 }}>DESDE</div>
                <input type="time" value={desde} onChange={e => guardarHorario('desde', e.target.value)} style={INP_SM}/>
              </div>
              {/* Hasta */}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9, fontWeight:600, color:'#aeaeb2', letterSpacing:'0.04em', marginBottom:3 }}>HASTA</div>
                <input type="time" value={hasta} onChange={e => guardarHorario('hasta', e.target.value)} style={INP_SM}/>
              </div>
            </div>
          )}

          {/* Boton activar */}
          {!readOnly && (
            <button
              onClick={() => onActivar(fase.id)}
              style={{
                width:'100%', padding:'6px 8px', borderRadius:8, border:'none', marginBottom:6,
                background: isActive ? fase.color : '#f5f5f7',
                color: isActive ? '#fff' : '#636366',
                fontSize:11, fontWeight:700, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                transition:'all 0.15s',
              }}>
              {isActive ? <>✏ Dibujando en esta fase</> : <><span style={{ opacity:0.5 }}>✏</span> Activar para dibujar</>}
            </button>
          )}

          {/* Lista de elementos */}
          {elementos.length === 0 ? (
            <div style={{ fontSize:11, color:'#c7c7cc', textAlign:'center', padding:'6px 0', fontStyle:'italic' }}>
              Sin elementos
            </div>
          ) : (
            elementos.map(el => (
              <ElementoRow
                key={el.id}
                elemento={el}
                faseColor={fase.color}
                isActive={elementoActivo?.id === el.id}
                onClick={onElementoClick}
                onEliminar={(elId) => onEliminarElemento(elId, fase.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Panel Dotacion ────────────────────────────────────────────
function PanelDotacion({ os, onActualizar }) {
  const [form, setForm] = useState({
    dotacion_agentes:      os?.dotacion_agentes || 0,
    dotacion_supervisores: os?.dotacion_supervisores || 0,
    dotacion_motorizados:  os?.dotacion_motorizados || 0,
  })
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setForm({
      dotacion_agentes:      os?.dotacion_agentes || 0,
      dotacion_supervisores: os?.dotacion_supervisores || 0,
      dotacion_motorizados:  os?.dotacion_motorizados || 0,
    })
    setDirty(false)
  }, [os?.id])

  function cambiar(k, delta) {
    setForm(prev => ({ ...prev, [k]: Math.max(0, prev[k] + delta) }))
    setDirty(true)
  }

  return (
    <div>
      <div style={{ fontSize:11, fontWeight:600, color:'#aeaeb2', letterSpacing:'0.05em', marginBottom:12 }}>DOTACION DECLARADA</div>
      {[
        ['dotacion_agentes',      'Agentes'],
        ['dotacion_supervisores', 'Supervisores'],
        ['dotacion_motorizados',  'Motorizados'],
      ].map(([k, label]) => (
        <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, background:'#f9f9fb', borderRadius:10, padding:'9px 12px', border:'0.5px solid #efefef' }}>
          <span style={{ fontSize:13, color:'#1d1d1f', fontWeight:500 }}>{label}</span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={() => cambiar(k, -1)}
              style={{ width:26,height:26,borderRadius:7,border:'0.5px solid #e5e5ea',background:'#fff',cursor:'pointer',fontSize:14,color:'#636366',display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
            <span style={{ minWidth:24,textAlign:'center',fontSize:15,fontWeight:700,color:'#1a2744' }}>{form[k]}</span>
            <button onClick={() => cambiar(k, 1)}
              style={{ width:26,height:26,borderRadius:7,border:'none',background:'#1a2744',cursor:'pointer',fontSize:14,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
          </div>
        </div>
      ))}
      {dirty && (
        <button
          onClick={() => { onActualizar(form); setDirty(false) }}
          style={{ width:'100%', padding:'9px', borderRadius:10, border:'none', background:'#1a2744', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', marginTop:4 }}>
          Guardar dotacion
        </button>
      )}
    </div>
  )
}

// ── Panel Recursos ────────────────────────────────────────────
const RECURSOS_TIPOS = ['Cono', 'Cartel luminoso', 'Baston luminoso', 'Moto', 'Movil', 'Valla', 'Otro']

function PanelRecursos({ recursos, onChange }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:600, color:'#aeaeb2', letterSpacing:'0.05em', marginBottom:10 }}>MATERIALES</div>
      {recursos.length === 0 && (
        <div style={{ fontSize:12, color:'#c7c7cc', textAlign:'center', padding:'12px 0', fontStyle:'italic' }}>Sin materiales asignados</div>
      )}
      {recursos.map((r, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, background:'#f9f9fb', border:'0.5px solid #efefef', borderRadius:10, padding:'7px 9px' }}>
          <select value={r.tipo} onChange={e => { const n=[...recursos]; n[i]={...r,tipo:e.target.value}; onChange(n) }}
            style={{ flex:2, background:'transparent', border:'none', fontSize:12, color:'#1d1d1f', fontFamily:'inherit', outline:'none', cursor:'pointer' }}>
            {RECURSOS_TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
            <button onClick={() => { const n=[...recursos]; n[i]={...r,cantidad:Math.max(0,r.cantidad-1)}; onChange(n) }}
              style={{ width:24,height:24,borderRadius:6,border:'0.5px solid #e5e5ea',background:'#fff',cursor:'pointer',fontSize:13,color:'#636366' }}>-</button>
            <span style={{ minWidth:22,textAlign:'center',fontSize:13,fontWeight:700,color:'#1a2744' }}>{r.cantidad}</span>
            <button onClick={() => { const n=[...recursos]; n[i]={...r,cantidad:r.cantidad+1}; onChange(n) }}
              style={{ width:24,height:24,borderRadius:6,border:'none',background:'#1a2744',cursor:'pointer',fontSize:13,color:'#fff' }}>+</button>
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
  os,
  fases, recursos, fechas = [],
  faseActiva, elementoActivo,
  onActivarFase, onElementoClick, onEliminarElemento,
  onCrearFase, onEliminarFase, onActualizarFase,
  onRecursosChange, onActualizarDotacion,
  readOnly,
}) {
  const [tab,           setTab]           = useState('fases')
  const [fasesAbiertas, setFasesAbiertas] = useState({})

  function toggleFase(id) {
    setFasesAbiertas(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Crear fase con nombre default, sin modal
  async function handleNuevaFase() {
    const num    = fases.length + 1
    const nombre = `Fase ${num}`
    // Si hay un solo dia, asignarlo automaticamente
    const fecha  = fechas.length === 1 ? isoFecha(fechas[0]) : null
    const fase   = await onCrearFase({ nombre, horario_desde: null, horario_hasta: null, fecha })
    if (fase) {
      setFasesAbiertas(prev => ({ ...prev, [fase.id]: true }))
      onActivarFase(fase.id)
    }
  }

  // Agrupar por dia
  const todosLosDias = [...new Set([
    ...fechas.map(f => isoFecha(f)),
    ...fases.filter(f => f.fecha).map(f => isoFecha(f.fecha)),
  ])].filter(Boolean).sort()

  const diasConFases = todosLosDias.map(dia => ({
    fecha: dia,
    fases: fases.filter(f => isoFecha(f.fecha) === dia),
  }))
  const fasesSinDia = fases.filter(f => !f.fecha)

  const totalElementos = fases.reduce((acc, f) => acc + (f.elementos||[]).length, 0)

  const TABS = [
    ['fases', 'Fases'],
    ['dotacion', 'Dotacion'],
    ['recursos', 'Recursos'],
  ]

  return (
    <div style={{ width:264, flexShrink:0, borderRight:'0.5px solid #e5e5ea', display:'flex', flexDirection:'column', overflow:'hidden', background:'#fafafa' }}>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'0.5px solid #ebebeb', background:'#fff', flexShrink:0 }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex:1, padding:'10px 2px', fontSize:11, fontWeight:tab===id?700:400, color:tab===id?'#1a2744':'#8e8e93', background:'none', border:'none', borderBottom:tab===id?'2px solid #1a2744':'2px solid transparent', cursor:'pointer', transition:'color 0.15s' }}>
            {label}
            {id==='fases' && totalElementos > 0 && (
              <span style={{ marginLeft:4, fontSize:9, fontWeight:700, background:'#f0f0f5', color:'#8e8e93', padding:'1px 5px', borderRadius:20 }}>
                {totalElementos}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'10px 8px' }}>

        {tab === 'fases' && (
          <>
            {diasConFases.length === 0 && fasesSinDia.length === 0 ? (
              <div style={{ textAlign:'center', padding:'28px 12px' }}>
                <div style={{ fontSize:32, marginBottom:10 }}>🗂</div>
                <div style={{ fontSize:13, fontWeight:600, color:'#1a2744', marginBottom:4 }}>Sin fases</div>
                <div style={{ fontSize:12, color:'#aeaeb2' }}>Tocá "Nueva fase" para empezar a planificar</div>
              </div>
            ) : (
              <>
                {diasConFases.map(({ fecha, fases: fasesDelDia }) => (
                  <div key={fecha} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, padding:'0 2px' }}>
                      <div style={{ height:'0.5px', background:'#ebebeb', flex:1 }}/>
                      <span style={{ fontSize:10, fontWeight:700, color:'#aeaeb2', whiteSpace:'nowrap', letterSpacing:'0.04em' }}>
                        {fmtFecha(fecha).toUpperCase()}
                      </span>
                      <div style={{ height:'0.5px', background:'#ebebeb', flex:1 }}/>
                    </div>
                    {fasesDelDia.length === 0 ? (
                      <div style={{ fontSize:11, color:'#c7c7cc', textAlign:'center', padding:'4px 0', fontStyle:'italic' }}>Sin fases</div>
                    ) : fasesDelDia.map(fase => (
                      <FaseCard key={fase.id} fase={fase} fechasOS={fechas}
                        faseActiva={faseActiva} elementoActivo={elementoActivo}
                        isOpen={fasesAbiertas[fase.id] !== false}
                        onToggle={() => toggleFase(fase.id)}
                        onActivar={onActivarFase}
                        onElementoClick={onElementoClick}
                        onEliminarElemento={onEliminarElemento}
                        onEliminar={onEliminarFase}
                        onActualizarFase={onActualizarFase}
                        readOnly={readOnly}/>
                    ))}
                  </div>
                ))}

                {fasesSinDia.length > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, padding:'0 2px' }}>
                      <div style={{ height:'0.5px', background:'#ebebeb', flex:1 }}/>
                      <span style={{ fontSize:10, fontWeight:700, color:'#c7c7cc', whiteSpace:'nowrap', letterSpacing:'0.04em' }}>SIN DIA</span>
                      <div style={{ height:'0.5px', background:'#ebebeb', flex:1 }}/>
                    </div>
                    {fasesSinDia.map(fase => (
                      <FaseCard key={fase.id} fase={fase} fechasOS={fechas}
                        faseActiva={faseActiva} elementoActivo={elementoActivo}
                        isOpen={fasesAbiertas[fase.id] !== false}
                        onToggle={() => toggleFase(fase.id)}
                        onActivar={onActivarFase}
                        onElementoClick={onElementoClick}
                        onEliminarElemento={onEliminarElemento}
                        onEliminar={onEliminarFase}
                        onActualizarFase={onActualizarFase}
                        readOnly={readOnly}/>
                    ))}
                  </div>
                )}
              </>
            )}

            {!readOnly && (
              <button onClick={handleNuevaFase}
                style={{ width:'100%', padding:'10px', borderRadius:11, border:'1px dashed #d1d1d6', background:'#fff', color:'#1a2744', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, marginTop:4 }}
                onMouseEnter={e => e.currentTarget.style.background='#f5f5f7'}
                onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nueva fase
              </button>
            )}
          </>
        )}

        {tab === 'dotacion' && (
          <PanelDotacion os={os} onActualizar={onActualizarDotacion}/>
        )}

        {tab === 'recursos' && (
          <PanelRecursos recursos={recursos} onChange={onRecursosChange}/>
        )}
      </div>
    </div>
  )
}
