import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import api from '../../lib/api'

const ROL_LABELS = {
  agente:      { label: 'Agente',       bg: '#eef1f8', color: '#1a2744' },
  supervisor:  { label: 'Supervisor',   bg: '#e8f5ee', color: '#0a5c3a' },
  chofer:      { label: 'Chofer',       bg: '#fdf0ea', color: '#7a2e0e' },
  coordinador: { label: 'Coordinador',  bg: '#f0ebff', color: '#5b21b6' },
  jefe_base:   { label: 'Jefe de base', bg: '#fff8e6', color: '#7a4f00' },
}

const FACTOR_STYLE = {
  modulos:  { color: '#185fa5', bg: '#e8f0fe', signo: '+' },
  ausencia: { color: '#c0392b', bg: '#feecec', signo: '+' },
  // Futuros factores positivos (bajan el score = mejoran prioridad)
  felicitacion: { color: '#0f6e56', bg: '#e8faf2', signo: '−' },
  desempenio_bueno: { color: '#0f6e56', bg: '#e8faf2', signo: '−' },
  desempenio_malo:  { color: '#c0392b', bg: '#feecec', signo: '+' },
}

function periodoActual() {
  const n = new Date()
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0')
}

function fmtPeriodo(p) {
  if (!p) return ''
  const [anio, mes] = p.split('-')
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return meses[parseInt(mes) - 1] + ' ' + anio
}

const TH = { fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase',
  letterSpacing: '0.06em', padding: '10px 14px', textAlign: 'left',
  whiteSpace: 'nowrap', userSelect: 'none', cursor: 'pointer' }

// Tooltip simple para headers
function TooltipHeader({ text, children }) {
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  return (
    <span ref={ref} style={{ display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => { const r = ref.current?.getBoundingClientRect(); r && setPos({ x: r.left + r.width / 2, y: r.top }) }}
      onMouseLeave={() => setPos(null)}>
      {children}
      {pos && createPortal(
        <span style={{ position: 'fixed', left: pos.x, top: pos.y - 6, transform: 'translate(-50%,-100%)',
          background: '#1a2744', color: '#fff', fontSize: 11, fontWeight: 500,
          padding: '5px 10px', borderRadius: 7, whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.22)', zIndex: 9999, pointerEvents: 'none' }}>
          {text}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            borderWidth: 4, borderStyle: 'solid', borderColor: '#1a2744 transparent transparent transparent' }}/>
        </span>, document.body
      )}
    </span>
  )
}

// Tooltip rico para el Score — muestra el desglose de factores
function TooltipScore({ factores, score, children }) {
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  if (!factores?.length) return children
  return (
    <span ref={ref} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
      onMouseEnter={() => { const r = ref.current?.getBoundingClientRect(); r && setPos({ x: r.left + r.width / 2, y: r.top }) }}
      onMouseLeave={() => setPos(null)}>
      {children}
      {pos && createPortal(
        <div style={{ position: 'fixed', left: pos.x, top: pos.y - 10, transform: 'translate(-50%,-100%)',
          background: '#1a2744', borderRadius: 12, padding: '14px 16px', minWidth: 220,
          boxShadow: '0 4px 20px rgba(0,0,0,0.28)', zIndex: 9999, pointerEvents: 'none' }}>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#7b8db0', letterSpacing: '0.06em',
            textTransform: 'uppercase', marginBottom: 10 }}>Desglose del score</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {factores.map((f, i) => {
              const s   = FACTOR_STYLE[f.tipo] || FACTOR_STYLE.ausencia
              const neg = f.puntos < 0
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: '#7b8db0', marginTop: 1 }}>{f.detalle}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace',
                    color: neg ? '#5ebd9a' : s.color === '#185fa5' ? '#7baef5' : '#f08080',
                    flexShrink: 0 }}>
                    {neg ? '−' : '+'}{Math.abs(f.puntos)}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ borderTop: '0.5px solid #2e3d5c', marginTop: 10, paddingTop: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7b8db0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
              {score}
            </span>
          </div>

          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            borderWidth: 6, borderStyle: 'solid', borderColor: '#1a2744 transparent transparent transparent' }}/>
        </div>, document.body
      )}
    </span>
  )
}

export default function SANomina() {
  const [agentes,  setAgentes]  = useState([])
  const [cargando, setCargando] = useState(true)
  const [error,    setError]    = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [periodo,  setPeriodo]  = useState(periodoActual())
  const [orden,    setOrden]    = useState({ col: 'posicion', dir: 'asc' })

  useEffect(() => { cargar() }, [periodo])

  async function cargar() {
    setCargando(true); setError(null)
    try { setAgentes(await api.get('/api/servicios-adicionales/nomina?periodo=' + periodo)) }
    catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }

  function sortBy(col) {
    setOrden(prev => prev.col === col
      ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: 'asc' })
  }

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return agentes.filter(a =>
      !q ||
      a.nombre_completo?.toLowerCase().includes(q) ||
      a.legajo?.toLowerCase().includes(q) ||
      a.base_nombre?.toLowerCase().includes(q)
    )
  }, [agentes, busqueda])

  const ordenados = useMemo(() => {
    const { col, dir } = orden
    return [...filtrados].sort((a, b) => {
      let va = a[col] ?? '', vb = b[col] ?? ''
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return dir === 'asc' ? -1 : 1
      if (va > vb) return dir === 'asc' ?  1 : -1
      return 0
    })
  }, [filtrados, orden])

  function SortIcon({ col }) {
    if (orden.col !== col) return <span style={{ color: '#d1d1d6', marginLeft: 4 }}>↕</span>
    return <span style={{ color: '#1a2744', marginLeft: 4 }}>{orden.dir === 'asc' ? '↑' : '↓'}</span>
  }

  const periodos = useMemo(() => {
    const list = [], now = new Date()
    for (let i = 0; i <= 5; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      list.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'))
    }
    return list
  }, [])

  const totalNomina = agentes[0]?.total_nomina ?? agentes.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Toolbar */}
      <div style={{ padding: '20px 40px 16px', background: '#fff', borderBottom: '0.5px solid #e0e4ed', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, legajo o base..."
            style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 36, paddingRight: 12, height: 36, borderRadius: 10, border: '0.5px solid #e0e4ed', fontSize: 13, color: '#1d1d1f', outline: 'none', background: '#f8f9fc' }}/>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#8e8e93', fontWeight: 600 }}>Período</span>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)}
            style={{ height: 36, borderRadius: 10, border: '0.5px solid #e0e4ed', fontSize: 13, padding: '0 10px', color: '#1d1d1f', background: '#fff', cursor: 'pointer', outline: 'none' }}>
            {periodos.map(p => <option key={p} value={p}>{fmtPeriodo(p)}</option>)}
          </select>
        </div>

        <span style={{ fontSize: 12, color: '#aeaeb2', marginLeft: 'auto' }}>
          {cargando ? 'Cargando...' : `${ordenados.length} agentes`}
        </span>

        <button onClick={cargar}
          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 36, padding: '0 14px', borderRadius: 10, border: '0.5px solid #e0e4ed', background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Actualizar
        </button>
      </div>

      {/* Tabla */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 40px' }}>
        {error && <div style={{ background: '#fff0f0', border: '0.5px solid #ffc0c0', borderRadius: 12, padding: '12px 16px', color: '#c0392b', fontSize: 13 }}>{error}</div>}

        {!error && (
          <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #dde2ec', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fc' }}>
                  {/* ── Identidad ── */}
                  <th style={TH} onClick={() => sortBy('nombre_completo')}>
                    <TooltipHeader text="Nombre y apellido del agente">Nombre</TooltipHeader> <SortIcon col="nombre_completo"/>
                  </th>
                  <th style={TH} onClick={() => sortBy('legajo')}>
                    <TooltipHeader text="Número de legajo">Legajo</TooltipHeader> <SortIcon col="legajo"/>
                  </th>
                  <th style={TH} onClick={() => sortBy('base_nombre')}>
                    <TooltipHeader text="Base operativa">Base</TooltipHeader> <SortIcon col="base_nombre"/>
                  </th>
                  <th style={TH} onClick={() => sortBy('role')}>
                    <TooltipHeader text="Rol ordinario en la plataforma">Rol</TooltipHeader> <SortIcon col="role"/>
                  </th>
                  <th style={{ ...TH, textAlign: 'center' }} onClick={() => sortBy('servicios_total')}>
                    <TooltipHeader text="Total de Servicios Adicionales en los que participó históricamente">SS.AA.</TooltipHeader> <SortIcon col="servicios_total"/>
                  </th>

                  {/* ── Separador visual ── */}
                  <th style={{ ...TH, borderLeft: '1.5px solid #e8ecf4', textAlign: 'center' }} onClick={() => sortBy('modulos_periodo')}>
                    <TooltipHeader text={`Módulos trabajados en ${fmtPeriodo(periodo)}. Es el factor principal del scoring.`}>
                      Módulos
                    </TooltipHeader> <SortIcon col="modulos_periodo"/>
                  </th>
                  <th style={{ ...TH, textAlign: 'center' }} onClick={() => sortBy('score')}>
                    <TooltipHeader text="Score calculado del período. Posá el mouse sobre el valor de cada agente para ver el desglose.">
                      Score
                    </TooltipHeader> <SortIcon col="score"/>
                  </th>
                  <th style={{ ...TH, textAlign: 'center' }} onClick={() => sortBy('posicion')}>
                    <TooltipHeader text="Posición en el ranking de prioridad. 1° = mayor prioridad de convocatoria.">
                      Posición
                    </TooltipHeader> <SortIcon col="posicion"/>
                  </th>
                </tr>
                {/* Sub-headers de sección */}
                <tr style={{ background: '#f8f9fc', borderBottom: '0.5px solid #e8ecf4' }}>
                  <td colSpan={5} style={{ padding: '3px 14px 6px', fontSize: 10, fontWeight: 700, color: '#b0b8c8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Datos del agente
                  </td>
                  <td colSpan={3} style={{ padding: '3px 14px 6px', fontSize: 10, fontWeight: 700, color: '#185fa5', letterSpacing: '0.08em', textTransform: 'uppercase', borderLeft: '1.5px solid #e8ecf4' }}>
                    Scoring — {fmtPeriodo(periodo)}
                  </td>
                </tr>
              </thead>

              <tbody>
                {cargando ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#aeaeb2', fontSize: 13 }}>Cargando nómina...</td></tr>
                ) : ordenados.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#aeaeb2', fontSize: 13 }}>Sin resultados para "{busqueda}"</td></tr>
                ) : ordenados.map((a, i) => {
                  const rolInfo = ROL_LABELS[a.role] || { label: a.role, bg: '#f5f5f7', color: '#636366' }
                  const rowBg   = a.vetado ? '#fff5f5' : ''

                  // Color de posición
                  const pct = (a.posicion - 1) / Math.max(totalNomina - 1, 1)
                  const posColor = pct < 0.33 ? '#0f6e56' : pct < 0.66 ? '#b45309' : '#c0392b'

                  return (
                    <tr key={a.id}
                      style={{ borderBottom: i < ordenados.length - 1 ? '0.5px solid #f0f0f5' : 'none', transition: 'background 0.1s', background: rowBg }}
                      onMouseEnter={e => e.currentTarget.style.background = a.vetado ? '#feecec' : '#f8f9fc'}
                      onMouseLeave={e => e.currentTarget.style.background = rowBg}>

                      {/* Nombre */}
                      <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {a.nombre_completo}
                          {a.vetado && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#c0392b', color: '#fff', letterSpacing: '0.04em', flexShrink: 0 }}>
                              SANCIONADO
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Legajo */}
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#8e8e93', fontWeight: 600, fontFamily: 'monospace' }}>
                        {a.legajo || '—'}
                      </td>

                      {/* Base */}
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#636366' }}>
                        {a.base_nombre || '—'}
                      </td>

                      {/* Rol */}
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: rolInfo.bg, color: rolInfo.color }}>
                          {rolInfo.label}
                        </span>
                      </td>

                      {/* SS.AA. totales */}
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: a.servicios_total > 0 ? 600 : 400, color: a.servicios_total > 0 ? '#636366' : '#aeaeb2' }}>
                          {a.servicios_total || '—'}
                        </span>
                      </td>

                      {/* ── Scoring ── */}

                      {/* Módulos */}
                      <td style={{ padding: '11px 14px', textAlign: 'center', borderLeft: '1.5px solid #f0f2f7' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: a.modulos_periodo > 0 ? '#185fa5' : '#aeaeb2' }}>
                          {a.modulos_periodo || '—'}
                        </span>
                      </td>

                      {/* Score con tooltip de desglose */}
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <TooltipScore factores={a.factores} score={a.score}>
                          <span style={{
                            fontSize: 14, fontWeight: 700,
                            color: a.score === 0 ? '#aeaeb2' : '#1a2744',
                            borderBottom: a.factores?.length ? '1.5px dashed #b0b8c8' : 'none',
                            cursor: a.factores?.length ? 'default' : 'auto',
                          }}>
                            {a.score ?? '—'}
                          </span>
                        </TooltipScore>
                      </td>

                      {/* Posición */}
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: posColor }}>
                            {a.posicion}°
                          </span>
                          <div style={{ width: 40, height: 3, borderRadius: 2, background: '#e8ecf4', overflow: 'hidden' }}>
                            <div style={{ height: 3, borderRadius: 2, background: posColor, width: `${Math.round(pct * 100)}%`, minWidth: a.posicion === totalNomina ? '100%' : 0 }}/>
                          </div>
                          <span style={{ fontSize: 10, color: '#c7c7cc' }}>de {totalNomina}</span>
                        </div>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
