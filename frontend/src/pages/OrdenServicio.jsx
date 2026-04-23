/**
 * OrdenServicio.jsx
 * Lista de OS + modal de creacion.
 * Incluye OS ordinarias + adicionales (UNION en el backend).
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import AppShell from '../components/AppShell'
import DetalleOS from '../components/DetalleOS'

const TIPOS_OS = [
  { id: 'ordinaria',   label: 'Ordinaria',   desc: 'Planificacion semanal de servicios y misiones', icon: '📋', color: '#1a2744', bg: '#e4eaf5' },
  { id: 'adicional',   label: 'Adicional',   desc: 'Servicios especificos de caracter adicional',   icon: '⭐', color: '#0f6e56', bg: '#e8faf2' },
  { id: 'alcoholemia', label: 'Alcoholemia', desc: 'Operativos de alcoholemia — acceso restringido', icon: '🔒', color: '#6b21a8', bg: '#f3e8ff' },
]

const ESTADO_OS = {
  borrador:   { label: 'Borrador',      bg: '#f5f5f7', color: '#8e8e93' },
  validacion: { label: 'En validacion', bg: '#faeeda', color: '#854f0b' },
  validada:   { label: 'Validada',      bg: '#e8faf2', color: '#0f6e56' },
  vigente:    { label: 'Vigente',       bg: '#e8faf2', color: '#0f6e56' },
  cumplida:   { label: 'Cumplida',      bg: '#f5f5f7', color: '#aeaeb2' },
}

const DIAS_LABEL = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

function getLunesViernes(offset = 0) {
  const hoy = new Date()
  const dow  = hoy.getDay()
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7)
  const fin = new Date(lunes)
  fin.setDate(lunes.getDate() + 6)
  return { inicio: lunes.toISOString().slice(0, 10), fin: fin.toISOString().slice(0, 10) }
}

function fmtPeriodoOS(os) {
  const fmtDia = d => new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  if (os.fechas?.length > 0) {
    if (os.fechas.length === 1) return fmtDia(os.fechas[0])
    if (os.fechas.length <= 4) return os.fechas.map(fmtDia).join(', ')
    return `${fmtDia(os.fechas[0])} ... ${fmtDia(os.fechas[os.fechas.length - 1])} (${os.fechas.length} dias)`
  }
  if (os.semana_inicio && os.semana_fin) {
    const fmt = d => new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
    return `${fmt(os.semana_inicio)} - ${fmt(os.semana_fin)}`
  }
  return 'Sin fechas'
}

// ── Modal nueva OS ────────────────────────────────────────────
function ModalNuevaOS({ onConfirm, onClose }) {
  const [tipo, setTipo]           = useState('ordinaria')
  const [fechaInicio, setFechaInicio] = useState(getLunesViernes(1).inicio)
  const [fechaFin, setFechaFin]   = useState(getLunesViernes(1).fin)
  const [fechasSel, setFechasSel] = useState([])
  const [mesVista, setMesVista]   = useState(() => { const d = new Date(); d.setDate(1); return d })

  function diasDelMes() {
    const dias = []
    const d = new Date(mesVista.getFullYear(), mesVista.getMonth(), 1)
    while (d.getMonth() === mesVista.getMonth()) { dias.push(new Date(d)); d.setDate(d.getDate() + 1) }
    return dias
  }
  function toggleFecha(iso) {
    setFechasSel(prev => prev.includes(iso) ? prev.filter(f => f !== iso) : [...prev, iso].sort())
  }
  function canConfirm() {
    if (tipo !== 'ordinaria') return fechasSel.length > 0
    return fechaInicio && fechaFin && fechaFin >= fechaInicio
  }
  function confirmar() {
    if (!canConfirm()) return
    if (tipo !== 'ordinaria') { onConfirm({ tipo, fechas: fechasSel }) }
    else { onConfirm({ tipo, semana_inicio: fechaInicio, semana_fin: fechaFin }) }
  }

  const INP = { padding: '9px 12px', borderRadius: 10, border: '1px solid #e5e5ea', fontSize: 14, fontFamily: 'inherit', color: '#1d1d1f', background: '#f9f9fb', outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.28)', zIndex: 1000, backdropFilter: 'blur(2px)' }}/>
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001, background: '#fff', borderRadius: 20, padding: 28, width: 460, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2744', marginBottom: 20 }}>Nueva Orden de Servicio</div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', marginBottom: 10 }}>TIPO DE ORDEN</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TIPOS_OS.map(t => (
              <div key={t.id} onClick={() => setTipo(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${tipo === t.id ? t.color : '#e5e5ea'}`, background: tipo === t.id ? t.bg : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                <span style={{ fontSize: 20 }}>{t.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tipo === t.id ? t.color : '#1a2744' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 1 }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {tipo === 'ordinaria' ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', marginBottom: 10 }}>SEMANA DE VIGENCIA</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span style={{ fontSize: 11, color: '#8e8e93' }}>Desde</span>
                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={INP}/>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span style={{ fontSize: 11, color: '#8e8e93' }}>Hasta</span>
                <input type="date" value={fechaFin} min={fechaInicio} onChange={e => setFechaFin(e.target.value)} style={INP}/>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em' }}>FECHAS DEL OPERATIVO</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setMesVista(m => { const n = new Date(m); n.setMonth(n.getMonth() - 1); return n })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', fontSize: 16, padding: '0 4px' }}>‹</button>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1a2744', minWidth: 90, textAlign: 'center' }}>{mesVista.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => setMesVista(m => { const n = new Date(m); n.setMonth(n.getMonth() + 1); return n })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', fontSize: 16, padding: '0 4px' }}>›</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
              {DIAS_LABEL.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#aeaeb2', padding: '3px 0' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {Array((new Date(mesVista.getFullYear(), mesVista.getMonth(), 1).getDay() + 6) % 7).fill(null).map((_, i) => <div key={'e'+i}/>)}
              {diasDelMes().map(d => {
                const iso = d.toISOString().slice(0, 10)
                const sel = fechasSel.includes(iso)
                return (
                  <button key={iso} onClick={() => toggleFecha(iso)}
                    style={{ padding: '6px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: sel ? 700 : 400, background: sel ? '#1a2744' : '#f5f5f7', color: sel ? '#fff' : '#1d1d1f' }}>
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
            {fechasSel.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#0f6e56', fontWeight: 600 }}>
                {fechasSel.length} dia{fechasSel.length !== 1 ? 's' : ''} seleccionado{fechasSel.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={confirmar} disabled={!canConfirm()}
            style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: canConfirm() ? '#1a2744' : '#e5e5ea', color: canConfirm() ? '#fff' : '#c7c7cc', fontSize: 13, fontWeight: 700, cursor: canConfirm() ? 'pointer' : 'not-allowed' }}>
            {tipo === 'adicional' ? 'Continuar' : 'Crear OS'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Card OS ───────────────────────────────────────────────────
function CardOS({ os, onClick, onEliminar }) {
  const est      = ESTADO_OS[os.estado] ?? ESTADO_OS.borrador
  const tipoInfo = TIPOS_OS.find(t => t.id === os.tipo) ?? TIPOS_OS[0]

  const tituloHeader = os.tipo === 'adicional'
    ? os.titulo
    : `OS-${String(os.numero || 0).padStart(3, '0')}`

  const subtitulo = os.tipo === 'adicional'
    ? fmtPeriodoOS(os)
    : os.titulo || fmtPeriodoOS(os)

  return (
    <div onClick={onClick}
      style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e5ea', borderLeft: `4px solid ${tipoInfo.color}`, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>

      <div style={{ width: 40, height: 40, borderRadius: 10, background: tipoInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
        {tipoInfo.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2744', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{tituloHeader}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: tipoInfo.bg, color: tipoInfo.color, flexShrink: 0 }}>{tipoInfo.label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: est.bg, color: est.color, flexShrink: 0 }}>{est.label}</span>
        </div>
        <div style={{ fontSize: 12, color: '#8e8e93' }}>{subtitulo}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>

      {os.estado === 'borrador' && (
        <button onClick={e => { e.stopPropagation(); onEliminar(os) }}
          title="Eliminar"
          style={{ padding: '5px 8px', borderRadius: 8, border: 'none', background: 'transparent', color: '#c7c7cc', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fce8e8'; e.currentTarget.style.color = '#e24b4a' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#c7c7cc' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      )}
    </div>
  )
}

// ── Principal ─────────────────────────────────────────────────
export default function OrdenServicio() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [ordenes, setOrdenes]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [creando, setCreando]     = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [tab, setTab]             = useState('activas')

  useEffect(() => { fetchOrdenes() }, [])

  async function fetchOrdenes() {
    setLoading(true)
    try {
      const data = await api.get('/api/os')
      setOrdenes(data ?? [])
    } catch (e) { console.warn('Error cargando OS:', e) }
    setLoading(false)
  }

  async function handleEliminar(os) {
    const label = os.tipo === 'adicional' ? os.titulo : `OS-${String(os.numero || 0).padStart(3, '0')}`
    if (!window.confirm(`Eliminar "${label}"? Esta accion no se puede deshacer.`)) return
    try {
      if (os.tipo === 'adicional') await api.delete(`/api/os-adicional/${os.id}`)
      else await api.delete(`/api/os/${os.id}`)
      fetchOrdenes()
    } catch (err) { alert(err.message || 'Error al eliminar') }
  }

  async function crearOS({ tipo, semana_inicio, semana_fin, fechas }) {
    if (tipo === 'adicional') {
      setShowModal(false)
      const params = new URLSearchParams()
      if (fechas?.length) params.set('fechas', fechas.join(','))
      navigate(`/os-adicional?${params.toString()}`)
      return
    }
    setCreando(true)
    setShowModal(false)
    try {
      const tituloMap = { ordinaria: `Semana ${semana_inicio}`, alcoholemia: 'OS Alcoholemia' }
      const payload = { tipo, titulo: tituloMap[tipo] || `OS ${tipo}`, semana_inicio: semana_inicio || null, semana_fin: semana_fin || null, base_id: profile?.base_id }
      const data = await api.post('/api/os', payload)
      if (tipo !== 'ordinaria' && fechas?.length > 0) await api.post(`/api/os/${data.id}/fechas`, { fechas })
      await fetchOrdenes()
      setSelected(data)
    } catch (e) { console.warn('Error creando OS:', e); alert('No se pudo crear la OS') }
    setCreando(false)
  }

  const activas   = ordenes.filter(o => o.estado !== 'cumplida')
  const cumplidas = ordenes.filter(o => o.estado === 'cumplida')
  const lista     = tab === 'activas' ? activas : cumplidas

  const accionHeader = { label: creando ? 'Creando...' : '+ Nueva OS', onClick: () => !creando && setShowModal(true) }

  // Vista detalle (OS ordinaria seleccionada)
  if (selected) {
    return (
      <AppShell titulo="Ordenes de servicio">
        <DetalleOS os={selected} onBack={() => setSelected(null)} onRefresh={fetchOrdenes}/>
      </AppShell>
    )
  }

  return (
    <AppShell titulo="Ordenes de servicio" accionHeader={accionHeader}>
      {showModal && <ModalNuevaOS onConfirm={crearOS} onClose={() => setShowModal(false)}/>}

      {/* Tabs activas / cumplidas */}
      <div style={{ background: '#fff', padding: '0 40px', borderBottom: '0.5px solid #e5e5ea', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { id: 'activas',   label: 'Activas',   count: activas.length },
            { id: 'cumplidas', label: 'Cumplidas', count: cumplidas.length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '12px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? '#1a2744' : '#8e8e93', borderBottom: tab === t.id ? '2px solid #1a2744' : '2px solid transparent', marginBottom: -1 }}>
              {t.label}
              {t.count > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, background: tab === t.id ? '#1a2744' : '#e5e5ea', color: tab === t.id ? '#fff' : '#8e8e93', padding: '1px 7px', borderRadius: 10 }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#aeaeb2' }}>Cargando...</div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744', marginBottom: 8 }}>
              {tab === 'activas' ? 'Sin ordenes activas' : 'Sin ordenes cumplidas'}
            </div>
            <div style={{ fontSize: 13, color: '#aeaeb2', marginBottom: 24 }}>
              {tab === 'activas' ? 'Crea la primera OS para empezar' : 'Las OS cumplidas van a aparecer aca'}
            </div>
            {tab === 'activas' && (
              <button onClick={() => setShowModal(true)} style={{ padding: '11px 24px', borderRadius: 11, border: 'none', background: '#1a2744', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ Crear primera OS</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 12 }}>
            {lista.map(os => (
              <CardOS key={os.id} os={os} onClick={() => {
                if (os.tipo === 'adicional') { navigate(`/os-adicional/${os.id}`); return }
                setSelected(os)
              }} onEliminar={handleEliminar}/>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
