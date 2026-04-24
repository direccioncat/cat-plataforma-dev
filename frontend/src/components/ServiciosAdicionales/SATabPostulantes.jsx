import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import api from '../../lib/api'
import { ROLES_OPERATIVOS } from '../../lib/rolesOperativos'

const ROL_CONFIG = ROLES_OPERATIVOS
const ROL_OPCIONES = Object.entries(ROL_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))

function prioInfo(p) {
  if ((p.penalizaciones_activas || 0) > 0 || (p.modulos_mes || 0) >= 2) return { color: '#c0392b', bg: '#FCEBEB', label: 'Baja',  icon: '▼' }
  if ((p.modulos_mes || 0) === 1)                                         return { color: '#BA7517', bg: '#FAEEDA', label: 'Media', icon: '●' }
  return                                                                         { color: '#0f6e56', bg: '#E1F5EE', label: 'Alta',  icon: '▲' }
}

function initials(n) {
  return (n || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

function fmtTurnoCorto(t) {
  if (t.nombre) return t.nombre
  const d = t.fecha ? new Date(String(t.fecha).slice(0,10)+'T12:00:00').toLocaleDateString('es-AR',{weekday:'short',day:'numeric'}) : ''
  const h = t.hora_inicio ? String(t.hora_inicio).slice(0,5) : ''
  return [d, h].filter(Boolean).join(' ') || 'Turno'
}

// ── Popover edición de turnos ─────────────────────────────────
function TurnosPopover({ postulante, turnos, onGuardar, onCerrar }) {
  const [todos, setTodos]       = useState(postulante.todos_los_turnos)
  const [selIds, setSelIds]     = useState(new Set(postulante.turnos_ids || []))
  const [guardando, setGuardando] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) onCerrar() }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onCerrar])

  function toggleTurno(id) {
    setSelIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function guardar() {
    setGuardando(true)
    await onGuardar(postulante.id, todos, Array.from(selIds))
    setGuardando(false)
    onCerrar()
  }

  return (
    <div ref={ref} style={{ background: '#fff', border: '0.5px solid #e5e5ea', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.12)', padding: '12px', minWidth: 220, zIndex: 9999 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', marginBottom: 8, letterSpacing: '0.06em' }}>DISPONIBILIDAD</div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', borderBottom: '0.5px solid #f5f5f7', marginBottom: 6 }}>
        <input type="checkbox" checked={todos} onChange={e => { setTodos(e.target.checked); if (e.target.checked) setSelIds(new Set()) }}
          style={{ width: 14, height: 14, accentColor: '#1a2744', cursor: 'pointer' }}/>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1a2744' }}>Todos los turnos</span>
      </label>

      {!todos && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
          {turnos.length === 0
            ? <div style={{ fontSize: 11, color: '#aeaeb2', padding: '4px 0' }}>No hay turnos cargados</div>
            : turnos.map(t => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 7, cursor: 'pointer', background: selIds.has(t.id) ? '#eef4ff' : 'transparent' }}>
                <input type="checkbox" checked={selIds.has(t.id)} onChange={() => toggleTurno(t.id)}
                  style={{ width: 13, height: 13, accentColor: '#185fa5', cursor: 'pointer' }}/>
                <span style={{ fontSize: 12, color: '#1d1d1f' }}>{fmtTurnoCorto(t)}</span>
              </label>
            ))
          }
        </div>
      )}

      <button onClick={guardar} disabled={guardando || (!todos && selIds.size === 0)}
        style={{ width: '100%', padding: '7px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          background: (!todos && selIds.size === 0) ? '#e5e5ea' : '#1a2744',
          color: (!todos && selIds.size === 0) ? '#aeaeb2' : '#fff' }}>
        {guardando ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  )
}

// ── Celda de turnos (chips + popover) ─────────────────────────
function CeldaTurnos({ postulante, turnos, onGuardar }) {
  const [abierto, setAbierto]   = useState(false)
  const [popPos, setPopPos]     = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)

  function abrir() {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPopPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 240) })
    setAbierto(true)
  }

  const turnos_ids = postulante.turnos_ids || []
  const turnosDelPost = turnos.filter(t => turnos_ids.includes(t.id))

  return (
    <>
      <div ref={btnRef} onClick={abrir} style={{ cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {postulante.todos_los_turnos ? (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#e8faf2', color: '#0f6e56', border: '1px solid #b5ead7' }}>Todos</span>
        ) : turnosDelPost.length === 0 ? (
          <span style={{ fontSize: 10, color: '#aeaeb2' }}>—</span>
        ) : (
          <>
            {turnosDelPost.slice(0, 2).map(t => (
              <span key={t.id} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: '#eef4ff', color: '#185fa5', border: '1px solid #b5d4f4', whiteSpace: 'nowrap' }}>
                {fmtTurnoCorto(t)}
              </span>
            ))}
            {turnosDelPost.length > 2 && (
              <span style={{ fontSize: 10, color: '#aeaeb2' }}>+{turnosDelPost.length - 2}</span>
            )}
          </>
        )}
      </div>
      {abierto && createPortal(
        <div style={{ position: 'fixed', top: popPos.top, left: popPos.left, zIndex: 9999 }}>
          <TurnosPopover postulante={postulante} turnos={turnos} onGuardar={onGuardar} onCerrar={() => setAbierto(false)}/>
        </div>,
        document.body
      )}
    </>
  )
}

export default function SATabPostulantes({ servicioId }) {
  const [postulantes,       setPostulantes]       = useState([])
  const [turnos,            setTurnos]            = useState([])
  const [cargando,          setCargando]          = useState(true)
  const [filtroRol,         setFiltroRol]         = useState('')
  const [importando,        setImportando]        = useState(false)
  const [resultadoImport,   setResultadoImport]   = useState(null)
  const [resultadosBusq,    setResultadosBusq]    = useState([])
  const [rolNuevo,          setRolNuevo]          = useState('infante')
  const [busqTexto,         setBusqTexto]         = useState('')
  const fileRef  = useRef(null)
  const busqRef  = useRef(null)

  useEffect(() => {
    api.get('/api/servicios-adicionales/' + servicioId + '/turnos')
      .then(data => setTurnos(data || []))
      .catch(() => {})
  }, [servicioId])

  useEffect(() => { cargar() }, [filtroRol])

  async function cargar() {
    setCargando(true)
    try {
      const path = filtroRol
        ? `/api/servicios-adicionales/${servicioId}/postulantes?rol=${filtroRol}`
        : `/api/servicios-adicionales/${servicioId}/postulantes`
      setPostulantes(await api.get(path))
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  async function importarCSV(e) {
    const file = e.target.files[0]
    if (!file) return
    setImportando(true)
    setResultadoImport(null)
    try {
      const formData = new FormData()
      formData.append('csv', file)
      const token = sessionStorage.getItem('cat_token')
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/servicios-adicionales/${servicioId}/postulantes/import-csv`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
      )
      setResultadoImport(await res.json())
      await cargar()
    } catch (e) {
      setResultadoImport({ importados: 0, errores: [{ mensaje: e.message }] })
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  async function buscarAgente(q) {
    setBusqTexto(q)
    if (q.length < 2) { setResultadosBusq([]); return }
    try {
      const data = await api.get(`/api/profiles?busq=${encodeURIComponent(q)}&limit=8`)
      setResultadosBusq(Array.isArray(data) ? data : (data.profiles || []))
    } catch { setResultadosBusq([]) }
  }

  async function agregarManual(agente) {
    try {
      await api.post(`/api/servicios-adicionales/${servicioId}/postulantes`, {
        agente_id: agente.id,
        rol_solicitado: rolNuevo,
        todos_los_turnos: true,
      })
      setBusqTexto('')
      setResultadosBusq([])
      await cargar()
    } catch (e) { alert(e.message) }
  }

  async function cambiarRol(postulanteId, nuevoRol) {
    try {
      await api.post('/api/servicios-adicionales/' + servicioId + '/postulantes/' + postulanteId + '/rol', { rol_solicitado: nuevoRol })
      setPostulantes(prev => prev.map(p => p.id === postulanteId ? { ...p, rol_solicitado: nuevoRol } : p))
    } catch (e) { alert(e.message) }
  }

  async function actualizarTurnos(postulanteId, todosLosTurnos, turnosIds) {
    await api.put('/api/servicios-adicionales/' + servicioId + '/postulantes/' + postulanteId + '/turnos', {
      todos_los_turnos: todosLosTurnos,
      turnos_ids: turnosIds,
    })
    setPostulantes(prev => prev.map(p =>
      p.id === postulanteId ? { ...p, todos_los_turnos: todosLosTurnos, turnos_ids: todosLosTurnos ? [] : turnosIds } : p
    ))
  }

  async function eliminarPostulante(id) {
    try {
      await api.delete(`/api/servicios-adicionales/${servicioId}/postulantes/${id}`)
      setPostulantes(prev => prev.filter(p => p.id !== id))
    } catch (e) { alert(e.message) }
  }

  const totalPorRol = ROL_OPCIONES.reduce((acc, r) => {
    acc[r.value] = postulantes.filter(p => p.rol_solicitado === r.value).length
    return acc
  }, {})

  const COLS = '40px 1fr 110px 160px 80px 60px 80px 36px'

  return (
    <div style={{ padding: '24px 44px' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <button onClick={() => fileRef.current?.click()} disabled={importando}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '0.5px solid #185fa5', background: '#e8f0fe', color: '#185fa5', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          {importando ? 'Importando...' : 'Importar CSV'}
        </button>
        <input ref={fileRef} type="file" accept=".csv" onChange={importarCSV} style={{ display: 'none' }} />

        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <input ref={busqRef} value={busqTexto} onChange={e => buscarAgente(e.target.value)}
            placeholder="Agregar agente por nombre o legajo..."
            style={{ width: '100%', padding: '9px 14px', borderRadius: 10, border: '0.5px solid #e5e5ea', background: '#fff', fontSize: 13, color: '#1d1d1f', outline: 'none', boxSizing: 'border-box' }}/>
          {resultadosBusq.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 10, border: '0.5px solid #e5e5ea', zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', marginTop: 4, overflow: 'hidden' }}>
              {resultadosBusq.map(a => (
                <div key={a.id} onClick={() => !a.vetado && agregarManual(a)}
                  style={{ padding: '10px 14px', cursor: a.vetado ? 'not-allowed' : 'pointer', fontSize: 13, borderBottom: '0.5px solid #f5f5f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: a.vetado ? '#fff5f5' : '#fff', opacity: a.vetado ? 0.8 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = a.vetado ? '#feecec' : '#f5f5f7'}
                  onMouseLeave={e => e.currentTarget.style.background = a.vetado ? '#fff5f5' : '#fff'}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: a.vetado ? '#c0392b' : '#1d1d1f' }}>{a.nombre_completo}</span>
                    {a.vetado && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: '#c0392b', color: '#fff' }}>SANCIONADO</span>}
                  </span>
                  <span style={{ color: '#aeaeb2', fontSize: 12 }}>{a.legajo}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <select value={rolNuevo} onChange={e => setRolNuevo(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 10, border: '0.5px solid #e5e5ea', fontSize: 13, background: '#fff', color: '#1d1d1f', flexShrink: 0 }}>
          {ROL_OPCIONES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Resultado import */}
      {resultadoImport && (
        <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 10, background: resultadoImport.errores?.length ? '#fff8e1' : '#e8faf2', border: `0.5px solid ${resultadoImport.errores?.length ? '#f5c800' : '#4ecdc4'}`, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, color: '#0f6e56' }}>✓ {resultadoImport.importados} importados</span>
          {resultadoImport.errores?.length > 0 && (
            <span style={{ color: '#854f0b' }}>· {resultadoImport.errores.length} errores ({resultadoImport.errores.slice(0, 2).map(e => e.mensaje).join(', ')})</span>
          )}
        </div>
      )}

      {/* Filtros por rol */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setFiltroRol('')}
          style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filtroRol === '' ? '#1a2744' : '#f0f0f5', color: filtroRol === '' ? '#fff' : '#636366' }}>
          Todos <span style={{ opacity: 0.6 }}>({postulantes.length})</span>
        </button>
        {ROL_OPCIONES.filter(r => totalPorRol[r.value] > 0).map(r => {
          const cfg = ROL_CONFIG[r.value]
          const activo = filtroRol === r.value
          return (
            <button key={r.value} onClick={() => setFiltroRol(r.value)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: activo ? cfg.dot : cfg.bg, color: activo ? '#fff' : cfg.color }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: activo ? '#fff' : cfg.dot, display: 'inline-block' }}/>
              {r.label} <span style={{ opacity: 0.7 }}>({totalPorRol[r.value]})</span>
            </button>
          )
        })}
      </div>

      {/* Tabla */}
      {cargando ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#aeaeb2', fontSize: 14 }}>Cargando postulantes...</div>
      ) : postulantes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>👤</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: 6 }}>Sin postulantes</div>
          <div style={{ fontSize: 13, color: '#aeaeb2' }}>
            {filtroRol ? `No hay postulantes con rol "${ROL_CONFIG[filtroRol]?.label}".` : 'Importa un CSV o agrega agentes manualmente.'}
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '10px 16px', background: '#f5f5f7', fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>#</span><span>Agente</span><span>Rol</span><span>Turnos</span><span>Mod. mes</span><span>Penal.</span><span>Prioridad</span><span></span>
          </div>

          {postulantes.map((p, i) => {
            const prio   = prioInfo(p)
            const rolCfg = ROL_CONFIG[p.rol_solicitado] || ROL_CONFIG.infante
            const mods   = p.modulos_mes || 0
            const pens   = p.penalizaciones_activas || 0

            return (
              <div key={p.id}
                style={{ display: 'grid', gridTemplateColumns: COLS, padding: '11px 16px', alignItems: 'center', borderTop: i === 0 ? 'none' : '0.5px solid #f5f5f7', background: p.vetado ? '#fff5f5' : i % 2 === 0 ? '#fff' : '#fafafa' }}
                onMouseEnter={e => e.currentTarget.style.background = p.vetado ? '#feecec' : '#f5f9ff'}
                onMouseLeave={e => e.currentTarget.style.background = p.vetado ? '#fff5f5' : i % 2 === 0 ? '#fff' : '#fafafa'}>

                <span style={{ fontSize: 11, color: '#c7c7cc', fontWeight: 600 }}>{i + 1}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: p.vetado ? '#feecec' : prio.bg, border: `1.5px solid ${p.vetado ? '#c0392b' : prio.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: p.vetado ? '#c0392b' : prio.color }}>
                    {initials(p.nombre_completo)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: p.vetado ? '#c0392b' : '#1d1d1f' }}>{p.nombre_completo}</span>
                      {p.vetado && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: '#c0392b', color: '#fff', flexShrink: 0 }}>SANCIONADO</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#aeaeb2' }}>{p.legajo} · {p.base_nombre}</div>
                  </div>
                </div>

                <select value={p.rol_solicitado} onChange={e => cambiarRol(p.id, e.target.value)}
                  style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 7, background: rolCfg.bg, color: rolCfg.color, border: 'none', cursor: 'pointer', fontFamily: 'inherit', outline: 'none', maxWidth: 110 }}>
                  {ROL_OPCIONES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>

                <CeldaTurnos postulante={p} turnos={turnos} onGuardar={actualizarTurnos}/>

                <div>
                  {mods > 0
                    ? <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: mods >= 2 ? '#FCEBEB' : '#FAEEDA', color: mods >= 2 ? '#A32D2D' : '#BA7517' }}>{mods}</span>
                    : <span style={{ fontSize: 12, color: '#c7c7cc' }}>-</span>}
                </div>

                <div>
                  {pens > 0
                    ? <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#FCEBEB', color: '#A32D2D' }}>!{pens}</span>
                    : <span style={{ fontSize: 12, color: '#c7c7cc' }}>-</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 8, background: prio.bg, width: 'fit-content' }}>
                  <span style={{ fontSize: 10, color: prio.color }}>{prio.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: prio.color }}>{prio.label}</span>
                </div>

                <button onClick={() => eliminarPostulante(p.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d1d6', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#A32D2D'}
                  onMouseLeave={e => e.currentTarget.style.color = '#d1d1d6'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
