/**
 * OSAdicionalPage.jsx
 * - Sin ID ni fechas  → lista de OS adicionales
 * - Con ?fechas=...   → formulario de creación (OSAdicional sin id)
 * - Con /:id          → editor de OS adicional existente
 */
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import OSAdicional from '../components/OSAdicional/OSAdicional'
import AppShell from '../components/AppShell'
import api from '../lib/api'

// ── Estados ───────────────────────────────────────────────────
const ESTADOS = {
  borrador:   { label: 'Borrador',       bg: '#f5f5f7', color: '#8e8e93' },
  validacion: { label: 'En validación',  bg: '#faeeda', color: '#854f0b' },
  validada:   { label: 'Validada',       bg: '#e8faf2', color: '#0f6e56' },
  vigente:    { label: 'Vigente',        bg: '#e8faf2', color: '#0f6e56' },
  rechazada:  { label: 'Rechazada',      bg: '#fee8e8', color: '#c0392b' },
  cumplida:   { label: 'Cumplida',       bg: '#f5f5f7', color: '#aeaeb2' },
}

// ── Helpers ───────────────────────────────────────────────────
function fmtFecha(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

function fmtFechas(fechas) {
  if (!fechas?.length) return 'Sin fechas'
  if (fechas.length === 1) return fmtFecha(fechas[0])
  if (fechas.length <= 3) return fechas.map(f => fmtFecha(typeof f === 'string' ? f : f.fecha)).join(', ')
  const arr = fechas.map(f => typeof f === 'string' ? f : f.fecha)
  return `${fmtFecha(arr[0])} … ${fmtFecha(arr[arr.length - 1])} (${arr.length} días)`
}

// ── Modal selector de presupuesto aprobado ────────────────────
function ModalPresupuestoSelector({ onConfirm, onClose }) {
  const [lista, setLista]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [seleccionado, setSeleccionado] = useState(null)

  useEffect(() => {
    api.get('/api/presupuestos')
      .then(data => setLista((data ?? []).filter(p => p.estado === 'aprobado')))
      .catch(() => setLista([]))
      .finally(() => setLoading(false))
  }, [])

  const filtrados = lista.filter(p => {
    const q = busqueda.toLowerCase()
    return (
      !q ||
      (p.numero ?? '').toLowerCase().includes(q) ||
      (p.beneficiario ?? '').toLowerCase().includes(q) ||
      (p.evento ?? '').toLowerCase().includes(q)
    )
  })

  function handleConfirmar() {
    if (!seleccionado) return
    const items = Array.isArray(seleccionado.items) ? seleccionado.items : []
    const fechas = [...new Set(items.map(i => i.dia).filter(Boolean))].sort()
    onConfirm(fechas, seleccionado.id)
  }

  function fmtFechasItems(items) {
    if (!Array.isArray(items) || !items.length) return 'Sin fechas'
    const dias = [...new Set(items.map(i => i.dia).filter(Boolean))].sort()
    if (!dias.length) return 'Sin fechas'
    if (dias.length === 1) return fmtFecha(dias[0])
    return `${fmtFecha(dias[0])} — ${fmtFecha(dias[dias.length - 1])} · ${dias.length} día${dias.length !== 1 ? 's' : ''}`
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', zIndex: 1000, backdropFilter: 'blur(3px)' }}/>
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001, background: '#fff', borderRadius: 20, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '85vh', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1a2744', marginBottom: 3 }}>Nueva OS Adicional</div>
          <div style={{ fontSize: 13, color: '#8e8e93' }}>Seleccioná el presupuesto aprobado sobre el que vas a operar</div>
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            autoFocus
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por número, beneficiario o evento…"
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: '1.5px solid #e5e5ea', fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#1a2744', transition: 'border 0.15s' }}
            onFocus={e => e.target.style.borderColor = '#1a2744'}
            onBlur={e => e.target.style.borderColor = '#e5e5ea'}
          />
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#aeaeb2', paddingTop: 32, fontSize: 13 }}>Cargando presupuestos…</div>
          ) : filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 32 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 13, color: '#8e8e93', fontWeight: 600 }}>
                {lista.length === 0 ? 'No hay presupuestos aprobados' : 'Sin resultados para la búsqueda'}
              </div>
              {lista.length === 0 && (
                <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 4 }}>Aprobá un presupuesto antes de crear una OS Adicional</div>
              )}
            </div>
          ) : filtrados.map(p => {
            const activo = seleccionado?.id === p.id
            return (
              <div key={p.id} onClick={() => setSeleccionado(p)}
                style={{
                  border: activo ? '2px solid #1a2744' : '1.5px solid #e5e5ea',
                  borderRadius: 12, padding: '12px 16px', cursor: 'pointer',
                  background: activo ? '#f0f4ff' : '#fff',
                  transition: 'all 0.12s',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
                onMouseEnter={e => { if (!activo) e.currentTarget.style.borderColor = '#b0bce8' }}
                onMouseLeave={e => { if (!activo) e.currentTarget.style.borderColor = '#e5e5ea' }}
              >
                {/* Indicador selección */}
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: activo ? 'none' : '2px solid #d1d1d6',
                  background: activo ? '#1a2744' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {activo && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>{p.numero ?? `#${p.id}`}</span>
                    <span style={{ fontSize: 11, color: '#0f6e56', fontWeight: 700, background: '#e8faf2', padding: '1px 7px', borderRadius: 6 }}>Aprobado</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#3c3c43', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.beneficiario || '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                    {p.evento && <span style={{ fontSize: 11, color: '#8e8e93' }}>{p.evento}</span>}
                    <span style={{ fontSize: 11, color: '#aeaeb2' }}>· {fmtFechasItems(p.items)}</span>
                  </div>
                </div>

                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={activo ? '#1a2744' : '#c7c7cc'} strokeWidth="2" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            )
          })}
        </div>

        {/* Fechas que se van a usar */}
        {seleccionado && (
          <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a2744" strokeWidth="2" style={{ flexShrink: 0 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style={{ fontSize: 12, color: '#1a2744', fontWeight: 600 }}>
              Fechas del operativo: {fmtFechasItems(seleccionado.items)}
            </span>
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleConfirmar} disabled={!seleccionado}
            style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: seleccionado ? '#1a2744' : '#e5e5ea', color: seleccionado ? '#fff' : '#c7c7cc', fontSize: 13, fontWeight: 700, cursor: seleccionado ? 'pointer' : 'not-allowed', transition: 'background 0.15s' }}>
            Continuar →
          </button>
        </div>
      </div>
    </>
  )
}

// ── Card OS Adicional ─────────────────────────────────────────
function CardOSA({ osa, onClick, onEliminar }) {
  const est     = ESTADOS[osa.estado] ?? ESTADOS.borrador
  const fechas  = Array.isArray(osa.fechas) ? osa.fechas : []
  const nombre  = osa.nombre || osa.evento_motivo || 'Sin nombre'

  return (
    <div onClick={onClick}
      style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e5ea', borderLeft: '4px solid #0f6e56', padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>

      {/* Ícono */}
      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e8faf2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
        ⭐
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2744', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
            {nombre}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: est.bg, color: est.color, flexShrink: 0 }}>
            {est.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#8e8e93' }}>{fmtFechas(fechas)}</span>
          {osa.total_turnos > 0 && (
            <span style={{ fontSize: 12, color: '#aeaeb2' }}>· {osa.total_turnos} turno{osa.total_turnos !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>

      {/* Botón eliminar (solo borradores) */}
      {osa.estado === 'borrador' && (
        <button onClick={e => { e.stopPropagation(); onEliminar(osa) }} title="Eliminar"
          style={{ padding: '5px 8px', borderRadius: 8, border: 'none', background: 'transparent', color: '#c7c7cc', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fce8e8'; e.currentTarget.style.color = '#e24b4a' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#c7c7cc' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Lista de OS Adicionales ───────────────────────────────────
function OSAdicionalLista() {
  const navigate = useNavigate()
  const [lista, setLista]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [tab, setTab]           = useState('activas')

  useEffect(() => { fetchLista() }, [])

  async function fetchLista() {
    setLoading(true)
    try {
      const data = await api.get('/api/os-adicional')
      setLista(data ?? [])
    } catch (e) { console.warn('Error cargando OS adicionales:', e) }
    setLoading(false)
  }

  async function handleEliminar(osa) {
    const nombre = osa.nombre || osa.evento_motivo || `OS #${osa.id}`
    if (!window.confirm(`Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/api/os-adicional/${osa.id}`)
      fetchLista()
    } catch (err) { alert(err.message || 'Error al eliminar') }
  }

  function handleNueva(fechas, presupuestoId) {
    setShowModal(false)
    const params = new URLSearchParams({ fechas: fechas.join(',') })
    if (presupuestoId) params.set('presupuesto_id', presupuestoId)
    navigate(`/os-adicional?${params.toString()}`)
  }

  const ESTADOS_ACTIVOS = ['borrador', 'validacion', 'validada', 'vigente']
  const activas   = lista.filter(o => ESTADOS_ACTIVOS.includes(o.estado))
  const cumplidas = lista.filter(o => !ESTADOS_ACTIVOS.includes(o.estado))
  const listaTab  = tab === 'activas' ? activas : cumplidas

  const accionHeader = { label: '+ Nueva OS Adicional', onClick: () => setShowModal(true) }

  return (
    <AppShell titulo="OS Adicional" accionHeader={accionHeader}>
      {showModal && <ModalPresupuestoSelector onConfirm={handleNueva} onClose={() => setShowModal(false)}/>}

      {/* Tabs */}
      <div style={{ background: '#fff', padding: '0 40px', borderBottom: '0.5px solid #e5e5ea', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { id: 'activas',   label: 'Activas',   count: activas.length },
            { id: 'historial', label: 'Historial',  count: cumplidas.length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '12px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? '#1a2744' : '#8e8e93', borderBottom: tab === t.id ? '2px solid #1a2744' : '2px solid transparent', marginBottom: -1 }}>
              {t.label}
              {t.count > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, background: tab === t.id ? '#1a2744' : '#e5e5ea', color: tab === t.id ? '#fff' : '#8e8e93', padding: '1px 7px', borderRadius: 10 }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', paddingTop: 60, fontSize: 14 }}>Cargando…</div>
        ) : listaTab.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1a2744', marginBottom: 6 }}>
              {tab === 'activas' ? 'No hay OS adicionales activas' : 'Sin historial aún'}
            </div>
            {tab === 'activas' && (
              <div style={{ fontSize: 13, color: '#8e8e93', marginBottom: 20 }}>
                Seleccioná un presupuesto aprobado para generar la primera OS
              </div>
            )}
            {tab === 'activas' && (
              <button onClick={() => setShowModal(true)}
                style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                + Nueva OS Adicional
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 760 }}>
            {listaTab.map(osa => (
              <CardOSA
                key={osa.id}
                osa={osa}
                onClick={() => navigate(`/os-adicional/${osa.id}`)}
                onEliminar={handleEliminar}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

// ── Page principal ────────────────────────────────────────────
export default function OSAdicionalPage() {
  const { id }          = useParams()
  const navigate        = useNavigate()
  const [searchParams]  = useSearchParams()

  const fechasParam     = searchParams.get('fechas')
  const fechasIniciales = fechasParam ? fechasParam.split(',') : []

  // Con ID o con fechas preseleccionadas → editor/creación
  if (id || fechasParam) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <OSAdicional
          osId={id}
          fechasIniciales={fechasIniciales}
          onVolver={() => navigate('/os-adicional')}
        />
      </div>
    )
  }

  // Sin ID ni fechas → lista
  return <OSAdicionalLista />
}
