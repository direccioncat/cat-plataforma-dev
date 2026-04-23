/**
 * OSItemPanel.jsx — v5
 * FIX v5:
 * - MiniMapaPoligono y MiniMapaVista migrados a Leaflet (sin Google Maps)
 * - Pin simple tambien migrado a Leaflet (reemplaza Static Maps API)
 */
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../lib/api'
import UbicacionInput from './UbicacionInput'

const TURNOS = [
  { id: 'manana',     label: 'Turno Manana',            short: 'TM',  color: '#854f0b', bg: '#faeeda' },
  { id: 'intermedio', label: 'Turno Intermedio',         short: 'TI',  color: '#534ab7', bg: '#eeedf8' },
  { id: 'tarde',      label: 'Turno Tarde',              short: 'TT',  color: '#185fa5', bg: '#e8f0fe' },
  { id: 'noche',      label: 'Turno Noche',              short: 'TN',  color: '#1a2744', bg: '#e4eaf5' },
  { id: 'fsd',        label: 'Fin de Semana Diurno',     short: 'FSD', color: '#0f6e56', bg: '#e8faf2' },
  { id: 'fsi',        label: 'Fin de Semana Intermedio', short: 'FSI', color: '#6b21a8', bg: '#f3e8ff' },
  { id: 'fsn',        label: 'Fin de Semana Noche',      short: 'FSN', color: '#8e8e93', bg: '#f5f5f7' },
]
const TURNO_MAP = Object.fromEntries(TURNOS.map(t => [t.id, t]))
const EJES_PSV = [
  'Seguridad vial',
  'Ordenamiento del transito',
  'Estacionamiento y uso del espacio publico',
  'Fiscalizacion y cumplimiento normativo',
  'Atencion y demandas ciudadanas',
  'Apoyo interinstitucional',
]

function resolverOsFechas(os) {
  if (!os) return []
  // Si la OS tiene fechas explícitas en os_fechas, usarlas
  const explicitas = (os.fechas || []).map(f => typeof f === 'string' ? f : f.fecha).filter(Boolean)
  if (explicitas.length > 0) return explicitas
  // Si no, generar el rango entre semana_inicio y semana_fin
  if (os.semana_inicio && os.semana_fin) {
    const fechas = []
    const inicio = new Date(os.semana_inicio.slice(0, 10) + 'T00:00:00')
    const fin    = new Date(os.semana_fin.slice(0, 10)    + 'T00:00:00')
    const cur = new Date(inicio)
    while (cur <= fin) {
      fechas.push(cur.toISOString().slice(0, 10))
      cur.setDate(cur.getDate() + 1)
    }
    return fechas
  }
  return []
}

function formatFecha(f) {
  const [y, m, d] = f.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dias  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${dias[date.getDay()]} ${d} ${meses[m - 1]}`
}

const FL  = { fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }
const INP = { width: '100%', background: '#f9f9fb', border: '0.5px solid #e5e5ea', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#1d1d1f', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
const SEL = { ...INP, cursor: 'pointer', appearance: 'none' }
const TA  = { ...INP, resize: 'none', minHeight: 80, lineHeight: 1.6 }

function TurnoPill({ turnoId }) {
  const t = TURNO_MAP[turnoId]
  if (!t) return null
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: t.bg, color: t.color, flexShrink: 0 }}>
      {t.short}
    </span>
  )
}

function ubicResumen(item) {
  if (item.modo_ubicacion === 'interseccion') return [item.calle, item.calle2].filter(Boolean).join(' esq. ')
  if (item.modo_ubicacion === 'entre_calles') return [item.calle, 'entre', item.desde, 'y', item.hasta].filter(Boolean).join(' ')
  if (item.modo_ubicacion === 'poligono')     return item.poligono_desc || 'Zona trazada'
  return [item.calle, item.altura].filter(Boolean).join(' ')
}
function modoIcon(item) {
  if (item.modo_ubicacion === 'interseccion') return '✕'
  if (item.modo_ubicacion === 'entre_calles') return '↔'
  if (item.modo_ubicacion === 'poligono')     return '⬡'
  return '📍'
}

// ── MINI MAPA LEAFLET — poligono o pin, sin Google Maps ───────
function MiniMapaVista({ item, height = 180 }) {
  const mapDivRef = useRef(null)
  const mapRef    = useRef(null)

  const esPoligono = item.modo_ubicacion === 'poligono' &&
    Array.isArray(item.poligono_coords) && item.poligono_coords.length >= 3
  const tienePin   = !!(item.lat && item.lng)

  useEffect(() => {
    if (!mapDivRef.current) return
    if (!esPoligono && !tienePin) return

    // Crear mapa solo una vez
    if (!mapRef.current) {
      mapRef.current = L.map(mapDivRef.current, {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
        doubleClickZoom: false,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapRef.current)
    }

    const map = mapRef.current

    if (esPoligono) {
      const latlngs = item.poligono_coords.map(p => [p.lat, p.lng])
      const poly = L.polygon(latlngs, {
        color: '#185fa5', fillColor: '#185fa5', fillOpacity: 0.18, weight: 2,
      }).addTo(map)
      map.fitBounds(poly.getBounds(), { padding: [16, 16] })
    } else {
      const icon = L.divIcon({
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#185fa5;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        className: '', iconSize: [20, 20], iconAnchor: [10, 10],
      })
      L.marker([item.lat, item.lng], { icon }).addTo(map)
      map.setView([item.lat, item.lng], 16)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [item.id])

  if (!esPoligono && !tienePin) return null

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '0.5px solid #e5e5ea', marginBottom: 10, height }}>
      <div ref={mapDivRef} style={{ height: '100%', width: '100%' }}/>
    </div>
  )
}

function Campo({ label, value, children }) {
  if (!value && !children) return null
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={FL}>{label}</div>
      {children || <div style={{ fontSize: 14, color: '#1d1d1f', lineHeight: 1.5, padding: '2px 0' }}>{value}</div>}
    </div>
  )
}

// ── PANEL VISTA ────────────────────────────────────────────────
function ViewPanel({ item, bases, onEdit, onCancel }) {
  const esMision    = item.tipo === 'mision'
  const accentBg    = esMision ? '#fce8e8' : '#e8f0fe'
  const accentText  = esMision ? '#a32d2d' : '#0c447c'
  const ubic = ubicResumen(item)
  const mapsUrl = item.lat && item.lng ? `https://www.google.com/maps?q=${item.lat},${item.lng}` : null

  return (
    <div style={{ background: '#fff', borderRadius: 18, border: '0.5px solid #e0e0e8', boxShadow: '0 4px 24px rgba(26,39,68,0.08)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '0.5px solid #f2f2f7', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 6, background: accentBg, color: accentText, display: 'inline-block', marginBottom: 8 }}>
              {esMision ? 'MISION' : 'SERVICIO'}
            </span>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#1a2744', letterSpacing: '-0.4px', lineHeight: 1.3 }}>{item.descripcion}</div>
          </div>
          <button onClick={onCancel} style={{ background: '#f5f5f7', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#8e8e93', padding: 8, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <MiniMapaVista item={item} height={170}/>
        <Campo label="Ubicacion">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 16, marginTop: 1 }}>{modoIcon(item)}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 2 }}>{ubic || '—'}</div>
              {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#185fa5', fontWeight: 600, textDecoration: 'none' }}>Ver en Google Maps ↗</a>}
            </div>
          </div>
        </Campo>
        {item.eje_psv && (
          <Campo label="Eje PSV">
            <span style={{ fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 7, background: '#f0f4ff', color: '#3451b2', display: 'inline-block' }}>{item.eje_psv}</span>
          </Campo>
        )}
        <div style={{ height: '0.5px', background: '#f2f2f7', margin: '4px 0 18px' }}/>

        <div style={{ marginBottom: 18 }}>
          <div style={FL}>Cadena de turnos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(item.turnos || []).length === 0 ? (
              <div style={{ fontSize: 13, color: '#aeaeb2', fontStyle: 'italic' }}>Sin turnos configurados</div>
            ) : (item.turnos || []).map((t, i) => {
              const base  = bases?.find(b => b.id === t.base_id)
              const turno = TURNO_MAP[t.turno]
              const ag    = t.cantidad_agentes ?? 1
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f9f9fb', borderRadius: 10, border: '0.5px solid #e5e5ea' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#aeaeb2', minWidth: 16 }}>{i + 1}</span>
                  {turno && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: turno.bg, color: turno.color }}>
                      {turno.short}
                    </span>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', flex: 1 }}>
                    {base?.nombre || <span style={{ color: '#aeaeb2', fontStyle: 'italic' }}>Sin base</span>}
                  </span>
                  <span style={{ fontSize: 12, color: '#8e8e93' }}>
                    {ag} agente{ag !== 1 ? 's' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {item.instrucciones && (
          <Campo label="Instrucciones">
            <div style={{ fontSize: 13, color: '#3c3c43', lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: '10px 14px', background: '#f9f9fb', borderRadius: 10, border: '0.5px solid #e5e5ea' }}>
              {item.instrucciones}
            </div>
          </Campo>
        )}

        {item.fechas && item.fechas.length > 0 && (
          <Campo label="Días de aplicación">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 7px' }}>
              {item.fechas.map((f, i) => {
                const fecha = typeof f === 'string' ? f : f.fecha
                return (
                  <span key={i} style={{ fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: '#e8f0fe', color: '#0c447c', border: '1px solid #185fa533' }}>
                    {formatFecha(fecha)}
                  </span>
                )
              })}
            </div>
          </Campo>
        )}
        {(!item.fechas || item.fechas.length === 0) && (
          <Campo label="Días de aplicación">
            <span style={{ fontSize: 13, color: '#aeaeb2', fontStyle: 'italic' }}>Todos los días de la OS</span>
          </Campo>
        )}
      </div>

      <div style={{ padding: '14px 24px 18px', borderTop: '0.5px solid #f2f2f7', flexShrink: 0 }}>
        <button onClick={onEdit}
          style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: '#1a2744', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Editar
        </button>
      </div>
    </div>
  )
}

// ── CONTADOR DE AGENTES ───────────────────────────────────────
function ContadorAgentes({ items }) {
  const porTurno = {}
  items.forEach(item => {
    if (item.tipo !== 'servicio') return
    ;(item.turnos || []).forEach(eslabon => {
      const t  = eslabon.turno
      const ag = eslabon.cantidad_agentes || 0
      if (!t || ag === 0) return
      porTurno[t] = (porTurno[t] || 0) + ag
    })
  })
  const entradas = Object.entries(porTurno)
  if (entradas.length === 0) return null
  const orden = ['manana','intermedio','tarde','noche','fsd','fsi','fsn']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color: '#c7c7cc', margin: '0 2px' }}>|</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.05em', marginRight: 1 }}>AGENTES</span>
      {entradas
        .sort(([a],[b]) => orden.indexOf(a) - orden.indexOf(b))
        .map(([turnoId, total]) => {
          const t = TURNO_MAP[turnoId]
          if (!t) return null
          return (
            <span key={turnoId} title={`${t.label}: ${total} agente${total !== 1 ? 's' : ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 9px', borderRadius: 20, background: t.bg, color: t.color, fontSize: 12, fontWeight: 800, border: `1px solid ${t.color}33`, cursor: 'default' }}>
              {t.short} <span style={{ fontSize: 13, fontWeight: 900 }}>{total}</span>
            </span>
          )
        })
      }
    </div>
  )
}

// ── ESLABON ────────────────────────────────────────────────────
function Eslabon({ eslabon, orden, total, bases, onChange, onDelete, relevoPrevio, onChangeRelevo }) {
  return (
    <div>
      {orden > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
          <div style={{ flex: 1, height: '0.5px', background: '#e5e5ea' }}/>
          <button onClick={() => onChangeRelevo(relevoPrevio === 'Normal' ? 'En zona' : 'Normal')}
            style={{ fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20, cursor: 'pointer', border: 'none', background: relevoPrevio === 'Normal' ? '#e8f0fe' : '#faeeda', color: relevoPrevio === 'Normal' ? '#0c447c' : '#633806' }}>
            {relevoPrevio === 'Normal' ? 'Relevo normal' : 'Relevo en zona'}
          </button>
          <div style={{ flex: 1, height: '0.5px', background: '#e5e5ea' }}/>
        </div>
      )}
      <div style={{ background: '#f9f9fb', border: '0.5px solid #e5e5ea', borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', minWidth: 18 }}>{orden + 1}</span>
          <select value={eslabon.turno} onChange={e => onChange({ ...eslabon, turno: e.target.value })}
            style={{ ...SEL, flex: 1, fontSize: 13, padding: '8px 11px' }}>
            {TURNOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          {total > 1 && (
            <button onClick={onDelete}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c7c7cc', fontSize: 15, padding: '2px 6px', borderRadius: 6 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fce8e8'; e.currentTarget.style.color = '#e24b4a' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#c7c7cc' }}>✕</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={eslabon.base_id || ''} onChange={e => onChange({ ...eslabon, base_id: e.target.value })}
            style={{ ...SEL, flex: 1, fontSize: 13, padding: '8px 11px' }}>
            <option value="">— Base —</option>
            {bases.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button onClick={() => onChange({ ...eslabon, cantidad_agentes: Math.max(1, (eslabon.cantidad_agentes || 1) - 1) })}
              style={{ width: 30, height: 30, borderRadius: 8, border: '0.5px solid #e5e5ea', background: '#fff', cursor: 'pointer', fontSize: 17, color: '#8e8e93', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <span style={{ fontSize: 15, fontWeight: 800, minWidth: 24, textAlign: 'center', color: '#1a2744' }}>{eslabon.cantidad_agentes || 1}</span>
            <button onClick={() => onChange({ ...eslabon, cantidad_agentes: (eslabon.cantidad_agentes || 1) + 1 })}
              style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#1a2744', cursor: 'pointer', fontSize: 17, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>
        </div>
        {orden === 0 && <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 7, fontStyle: 'italic' }}>Base principal del servicio</div>}
      </div>
    </div>
  )
}

// ── SELECTOR DE FECHAS ────────────────────────────────────────
function SelectorFechas({ osFechas, fechasItem, setFechasItem }) {
  const todosSeleccionados = fechasItem.length === 0

  if (!osFechas || osFechas.length === 0) return (
    <div style={{ marginBottom: 18 }}>
      <div style={FL}>Días de aplicación</div>
      <div style={{ fontSize: 12, color: '#854f0b', padding: '10px 14px', background: '#fdf3e3', borderRadius: 10, border: '1px solid #f5c84244', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
        <span>La OS no tiene fechas cargadas. Sin fechas, este item aplica todos los días. Podés agregar fechas desde la pantalla principal de la OS.</span>
      </div>
    </div>
  )

  function toggle(f) {
    setFechasItem(prev => {
      if (prev.includes(f)) {
        const next = prev.filter(x => x !== f)
        return next
      }
      return [...prev, f].sort()
    })
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={FL}>Días de aplicación</div>
      <div style={{ fontSize: 12, color: '#8e8e93', marginBottom: 10, lineHeight: 1.5 }}>
        Seleccioná los días en que se cumple este item. Sin selección = todos los días de la OS.
      </div>

      <button
        onClick={() => setFechasItem([])}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', marginBottom: 10,
          fontSize: 12, fontWeight: 700,
          background: todosSeleccionados ? '#1a2744' : '#f2f2f7',
          color:      todosSeleccionados ? '#fff'     : '#8e8e93',
        }}>
        {todosSeleccionados && <span>✓ </span>}Todos los días
      </button>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px' }}>
        {osFechas.map(f => {
          const sel = fechasItem.includes(f)
          return (
            <button key={f} onClick={() => toggle(f)}
              style={{
                padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                background: sel ? '#e8f0fe' : '#f2f2f7',
                color:      sel ? '#0c447c' : '#8e8e93',
                outline:    sel ? '1.5px solid #185fa5' : 'none',
              }}>
              {formatFecha(f)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── PANEL EDICION ─────────────────────────────────────────────
function EditPanel({ item, osId, bases, osFechas = [], onSaved, onCancel }) {
  const esNuevo  = !item || item._local
  const tipoInit = item?.tipo || 'servicio'

  const [tab,    setTab]   = useState(tipoInit)
  const [form,   setForm]  = useState({
    descripcion: '', modo_ubicacion: 'altura',
    calle: '', altura: '', calle2: '', desde: '', hasta: '',
    poligono_desc: '', poligono_nombre: '', eje_psv: '', instrucciones: '',
    lat: null, lng: null, place_id: null, poligono_coords: [],
    ...item,
  })
  const [turnos,  setTurnos]  = useState(
    item?.turnos?.length > 0
      ? item.turnos.map(t => ({ turno: t.turno, base_id: t.base_id || '', cantidad_agentes: t.cantidad_agentes || 1 }))
      : [{ turno: 'manana', base_id: '', cantidad_agentes: 1 }]
  )
  const [relevos, setRelevos] = useState(
    item?.relevos?.length > 0 ? item.relevos.map(r => r.tipo) : []
  )
  const [saving,     setSaving]     = useState(false)
  const [fechasItem, setFechasItem] = useState(item?.fechas?.map(f => typeof f === 'string' ? f : f.fecha) || [])

  function upd(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function addTurno() { setTurnos(t => [...t, { turno: 'manana', base_id: '', cantidad_agentes: 1 }]); setRelevos(r => [...r, 'Normal']) }
  function updTurno(i, val) { setTurnos(t => t.map((x, j) => j === i ? val : x)) }
  function delTurno(i) { setTurnos(t => t.filter((_, j) => j !== i)); setRelevos(r => r.filter((_, j) => j !== Math.max(0, i - 1))) }
  function updRelevo(i, val) { setRelevos(r => r.map((x, j) => j === i ? val : x)) }

  async function guardar() {
    if (!form.descripcion.trim()) { alert('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      const payload = {
        tipo: tab,
        descripcion: form.descripcion,
        turno: turnos[0]?.turno || 'manana',
        modo_ubicacion: form.modo_ubicacion || 'altura',
        calle: form.calle || null, altura: form.altura || null,
        calle2: form.calle2 || null, desde: form.desde || null, hasta: form.hasta || null,
        poligono_desc: form.poligono_nombre || form.poligono_desc || null,
        poligono_coords: form.poligono_coords || null,
        eje_psv: form.eje_psv || null,
        instrucciones: form.instrucciones || null,
        lat: form.lat || null, lng: form.lng || null, place_id: form.place_id || null,
        cantidad_agentes: {},
      }

      let saved = esNuevo
        ? await api.post(`/api/os/${osId}/items`, payload)
        : await api.put(`/api/os/items/${item.id}`, payload)

      await api.post(`/api/os/items/${saved.id}/turnos`, {
        turnos: turnos.map((t, i) => ({ ...t, orden: i })),
        relevos: relevos.map((tipo, i) => ({ orden: i, tipo })),
      })

      try {
        await api.put(`/api/os/items/${saved.id}/fechas`, { fechas: fechasItem })
      } catch (eFechas) {
        console.warn('No se pudieron guardar las fechas del item:', eFechas)
      }

      onSaved(saved)
    } catch (e) {
      console.warn('Error guardando:', e)
      alert(e.message || 'Error al guardar')
    }
    setSaving(false)
  }

  const accentColor = tab === 'servicio' ? '#185fa5' : '#e24b4a'

  return (
    <div style={{ background: '#fff', borderRadius: 18, border: '0.5px solid #e0e0e8', boxShadow: '0 4px 24px rgba(26,39,68,0.08)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '0.5px solid #f2f2f7', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {['servicio', 'mision'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding: '4px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: tab === t ? (t === 'servicio' ? '#e8f0fe' : '#fce8e8') : '#f5f5f7', color: tab === t ? (t === 'servicio' ? '#0c447c' : '#a32d2d') : '#8e8e93' }}>
                  {t === 'servicio' ? 'Servicio' : 'Mision'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744', letterSpacing: '-0.3px' }}>
              {esNuevo ? `Nuevo ${tab}` : (form.descripcion || 'Sin nombre')}
            </div>
            <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 3 }}>
              {esNuevo ? 'Completa los datos y guarda' : 'Editando item'}
            </div>
          </div>
          <button onClick={onCancel} style={{ background: '#f5f5f7', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#8e8e93', padding: 8, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={FL}>Nombre</div>
          <input value={form.descripcion} onChange={e => upd('descripcion', e.target.value)}
            placeholder={tab === 'servicio' ? 'Ej: Control de velocidad radar' : 'Ej: Reclamo vecinal zona sur'}
            style={INP} autoFocus/>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={FL}>Ubicacion</div>
          <UbicacionInput form={form} setForm={setForm}/>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={FL}>Eje PSV</div>
          <select value={form.eje_psv || ''} onChange={e => upd('eje_psv', e.target.value)} style={SEL}>
            <option value="">— Sin asignar —</option>
            {EJES_PSV.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>

        <SelectorFechas osFechas={osFechas} fechasItem={fechasItem} setFechasItem={setFechasItem}/>

        <div style={{ height: '0.5px', background: '#f2f2f7', margin: '4px 0 18px' }}/>

        {tab === 'servicio' && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ ...FL, marginBottom: 5 }}>Cadena de turnos</div>
            <div style={{ fontSize: 12, color: '#8e8e93', marginBottom: 12, lineHeight: 1.5 }}>
              El primer turno define la base principal. Cada eslabon tiene su propia cantidad de agentes.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {turnos.map((eslabon, i) => (
                <Eslabon key={i} eslabon={eslabon} orden={i} total={turnos.length} bases={bases}
                  onChange={val => updTurno(i, val)} onDelete={() => delTurno(i)}
                  relevoPrevio={i > 0 ? relevos[i - 1] : undefined}
                  onChangeRelevo={val => updRelevo(i - 1, val)}/>
              ))}
            </div>
            <button onClick={addTurno}
              style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: 10, border: '1px dashed #d1d1d6', background: 'transparent', fontSize: 13, color: '#8e8e93', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              + agregar turno
            </button>
          </div>
        )}

        {tab === 'mision' && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={FL}>Turno</div>
              <select value={turnos[0]?.turno || 'manana'}
                onChange={e => setTurnos([{ turno: e.target.value, base_id: turnos[0]?.base_id || '', cantidad_agentes: 1 }])}
                style={SEL}>
                {TURNOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <div style={FL}>Base</div>
              <select value={turnos[0]?.base_id || ''} onChange={e => setTurnos([{ ...turnos[0], base_id: e.target.value }])} style={SEL}>
                <option value="">— Seleccionar base —</option>
                {bases.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>
            <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 8, fontStyle: 'italic' }}>
              Los agentes se asignan al momento de crear la mision del dia.
            </div>
          </div>
        )}

        <div style={{ height: '0.5px', background: '#f2f2f7', margin: '4px 0 18px' }}/>

        <div style={{ marginBottom: 18 }}>
          <div style={FL}>Instrucciones</div>
          <textarea value={form.instrucciones || ''} onChange={e => upd('instrucciones', e.target.value)}
            placeholder="Indicaciones para coordinadores y agentes..." style={TA}/>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={FL}>Adjuntos</div>
          <div style={{ border: '1px dashed #d1d1d6', borderRadius: 10, padding: '16px', textAlign: 'center', cursor: 'pointer', color: '#aeaeb2', fontSize: 13 }}
            onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            + Fotos, planos o documentos
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 24px 18px', borderTop: '0.5px solid #f2f2f7', flexShrink: 0, display: 'flex', gap: 10 }}>
        <button onClick={onCancel}
          style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={guardar} disabled={saving || !form.descripcion.trim()}
          style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: form.descripcion.trim() ? 'pointer' : 'not-allowed', background: form.descripcion.trim() ? accentColor : '#e5e5ea', color: form.descripcion.trim() ? '#fff' : '#c7c7cc' }}>
          {saving ? 'Guardando...' : `Guardar ${tab}`}
        </button>
      </div>
    </div>
  )
}

// ── CARD DE ITEM ──────────────────────────────────────────────
function ItemCard({ item, selected, bases, onClick }) {
  const esMision    = item.tipo === 'mision'
  const accentColor = esMision ? '#e24b4a' : '#185fa5'
  const accentBg    = esMision ? '#fce8e8' : '#e8f0fe'
  const accentText  = esMision ? '#a32d2d' : '#0c447c'
  const basePrincipal = bases?.find(b => b.id === item.turnos?.[0]?.base_id)
  const ubic = ubicResumen(item)

  return (
    <div onClick={onClick}
      style={{ background: selected ? '#f4f6ff' : '#fff', border: selected ? '1.5px solid #1a2744' : '0.5px solid #e5e5ea', borderLeft: `4px solid ${accentColor}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.boxShadow = '0 2px 14px rgba(0,0,0,0.07)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 5, background: accentBg, color: accentText, letterSpacing: '0.04em', flexShrink: 0 }}>
          {esMision ? 'MISION' : 'SERVICIO'}
        </span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(item.turnos || []).map((t, i) => <TurnoPill key={i} turnoId={t.turno}/>)}
        </div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2744', marginBottom: 8, lineHeight: 1.3 }}>
        {item.descripcion || <span style={{ color: '#c7c7cc', fontStyle: 'italic' }}>Sin nombre</span>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 12px' }}>
        {ubic && (
          <span style={{ fontSize: 12, color: '#636366', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11 }}>{modoIcon(item)}</span>
            <span style={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ubic}</span>
          </span>
        )}
        {basePrincipal && (
          <span style={{ fontSize: 12, color: '#636366', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11 }}>🏢</span> {basePrincipal.nombre}
          </span>
        )}
        {item.tipo === 'servicio' && (item.turnos || []).length > 0 && (
          <span style={{ fontSize: 12, color: '#636366', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11 }}>👥</span>
            {(item.turnos || []).reduce((acc, e) => acc + (e.cantidad_agentes || 0), 0)} agentes
          </span>
        )}
        {item.eje_psv && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: '#f0f4ff', color: '#3451b2' }}>
            {item.eje_psv}
          </span>
        )}
        {item.lat && item.lng && (
          <a href={`https://www.google.com/maps?q=${item.lat},${item.lng}`} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 11, color: '#185fa5', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
            Maps ↗
          </a>
        )}
        {item.fechas && item.fechas.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: '#e8f0fe', color: '#0c447c', display: 'flex', alignItems: 'center', gap: 3 }}>
            📅 {item.fechas.length} día{item.fechas.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function OSItemPanel({ os, items: itemsInit, onItemsChange, readOnly }) {
  const [items,    setItems]    = useState(itemsInit || [])
  const [selected, setSelected] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [newTab,   setNewTab]   = useState(null)
  const [bases,    setBases]    = useState([])

  useEffect(() => { setItems(itemsInit || []) }, [itemsInit])
  useEffect(() => { api.get('/api/bases').then(d => setBases(d || [])).catch(() => {}) }, [])

  const itemSeleccionado = selected ? items.find(i => i.id === selected) : null
  const panelAbierto = selected !== null || newTab !== null

  async function handleSaved(savedItem) {
    try {
      const full = await api.get(`/api/os/items/${savedItem.id}`)
      setItems(prev => {
        const existe = prev.find(i => i.id === full.id)
        return existe ? prev.map(i => i.id === full.id ? full : i) : [...prev, full]
      })
      setSelected(full.id)
    } catch {
      setItems(prev => {
        const existe = prev.find(i => i.id === savedItem.id)
        return existe
          ? prev.map(i => i.id === savedItem.id ? { ...savedItem, turnos: [] } : i)
          : [...prev, { ...savedItem, turnos: [] }]
      })
      setSelected(savedItem.id)
    }
    onItemsChange?.()
    setEditMode(false)
    setNewTab(null)
  }

  function handleSelectItem(item) { setSelected(item.id); setEditMode(false); setNewTab(null) }
  function handleClose() { setSelected(null); setEditMode(false); setNewTab(null) }

  async function handleDelete(e, item) {
    e.stopPropagation()
    if (!window.confirm(`Eliminar "${item.descripcion || 'este item'}"?`)) return
    try {
      await api.delete(`/api/os/items/${item.id}`)
      setItems(prev => prev.filter(i => i.id !== item.id))
      if (selected === item.id) handleClose()
      onItemsChange?.()
    } catch (err) { alert(err.message || 'Error al eliminar') }
  }

  const servicios = items.filter(i => i.tipo === 'servicio')
  const misiones  = items.filter(i => i.tipo === 'mision')

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0, overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingRight: panelAbierto && !readOnly ? 20 : 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 14, borderBottom: '0.5px solid #e5e5ea', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#8e8e93', flexShrink: 0 }}>
              <span style={{ fontWeight: 700, color: '#185fa5' }}>{servicios.length}</span> servicios
              {' · '}
              <span style={{ fontWeight: 700, color: '#e24b4a' }}>{misiones.length}</span> misiones
            </span>
            <ContadorAgentes items={items}/>
          </div>
          {!readOnly && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setSelected(null); setEditMode(true); setNewTab('servicio') }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 20, border: 'none', background: '#1a2744', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(26,39,68,0.18)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#243560'}
                onMouseLeave={e => e.currentTarget.style.background = '#1a2744'}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Servicio
              </button>
              <button onClick={() => { setSelected(null); setEditMode(true); setNewTab('mision') }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 20, border: 'none', background: '#e24b4a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(226,75,74,0.25)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#c73a39'}
                onMouseLeave={e => e.currentTarget.style.background = '#e24b4a'}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Mision
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#aeaeb2' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2744', marginBottom: 5 }}>Sin items cargados</div>
              <div style={{ fontSize: 13 }}>Agrega un servicio o mision para empezar</div>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} style={{ position: 'relative' }}>
                <ItemCard item={item} selected={selected === item.id} bases={bases} onClick={() => handleSelectItem(item)}/>
                {!readOnly && (
                  <button onClick={e => handleDelete(e, item)}
                    style={{ position: 'absolute', top: 12, right: 40, background: 'transparent', border: 'none', cursor: 'pointer', color: '#d1d1d6', fontSize: 13, padding: '3px 6px', borderRadius: 5 }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fce8e8'; e.currentTarget.style.color = '#e24b4a' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d1d1d6' }}>✕</button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {panelAbierto && !readOnly && (
        <div style={{ width: 440, flexShrink: 0, paddingBottom: 20 }}>
          {newTab && (
            <EditPanel key={'new-' + newTab} item={{ tipo: newTab, _local: true }} osId={os.id} bases={bases} osFechas={resolverOsFechas(os)} onSaved={handleSaved} onCancel={handleClose}/>
          )}
          {!newTab && itemSeleccionado && (
            editMode ? (
              <EditPanel key={itemSeleccionado.id + '-edit'} item={itemSeleccionado} osId={os.id} bases={bases} osFechas={resolverOsFechas(os)} onSaved={handleSaved} onCancel={() => setEditMode(false)}/>
            ) : (
              <ViewPanel key={itemSeleccionado.id + '-view'} item={itemSeleccionado} bases={bases} onEdit={() => setEditMode(true)} onCancel={handleClose}/>
            )
          )}
        </div>
      )}
    </div>
  )
}
