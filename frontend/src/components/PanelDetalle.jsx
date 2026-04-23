import { useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import SheetAsignacion from './SheetAsignacion'
import { BtnDescargarReporte } from './ReportePDF'

const ESTADOS = {
  sin_asignar:  { label: 'Sin asignar', bg: '#fce8e8', color: '#a32d2d' },
  asignada:     { label: 'Asignada',    bg: '#faeeda', color: '#854f0b' },
  en_mision:    { label: 'En curso',    bg: '#e8f0fe', color: '#185fa5' },
  interrumpida: { label: 'Interrumpida',bg: '#faeeda', color: '#854f0b' },
  cerrada:      { label: 'Cerrada',     bg: '#e8faf2', color: '#0f6e56' },
}
const ROLE_LABELS = {
  gerencia: 'Gerencia', jefe_base: 'Jefe de base',
  coordinador: 'Coordinador', supervisor: 'Supervisor',
  agente: 'Agente', admin: 'Administrador',
}
const MOTIVOS_RECHAZO = ['No puedo desplazarme a esa zona', 'Estoy finalizando otra misión', 'Problema de salud o emergencia', 'Otro motivo']
const MOTIVOS_INCUMPLIMIENTO = ['No pude acceder al lugar', 'Situación resuelta antes de llegar', 'Fuerza mayor', 'Otro motivo']
const DOT_COLORS = { mision_cerrada: '#0f6e56', mision_aceptada: '#185fa5', mision_asignada: '#854f0b', mision_interrumpida: '#854f0b', mision_creada: '#185fa5' }

function tiempoRelativo(fecha) {
  if (!fecha) return '—'
  const diff = Math.floor((Date.now() - new Date(fecha)) / 60000)
  if (diff < 1) return 'ahora'
  if (diff < 60) return `hace ${diff} min`
  if (diff < 1440) return `hace ${Math.floor(diff / 60)} h`
  return `hace ${Math.floor(diff / 1440)} d`
}

function Initials({ nombre, size = 28 }) {
  const partes = (nombre ?? '').split(' ')
  const ini = partes.length >= 2
    ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
    : (partes[0]?.[0] ?? '?').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#eeedf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, color: '#3c3489', flexShrink: 0 }}>
      {ini}
    </div>
  )
}

// ── Selector de imágenes (movido acá desde MisionesAgente) ────
export function SelectorImagenes({ imagenes, onChange }) {
  function handleFiles(files) {
    const nuevas = Array.from(files).slice(0, 4 - imagenes.length)
    const conPreview = nuevas.map(f => ({ file: f, preview: URL.createObjectURL(f) }))
    onChange([...imagenes, ...conPreview])
  }
  function eliminar(i) { onChange(imagenes.filter((_, idx) => idx !== i)) }
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
        Fotos {imagenes.length > 0 ? `(${imagenes.length}/4)` : '(opcional)'}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {imagenes.map((img, i) => (
          <div key={i} style={{ width: 68, height: 68, borderRadius: 10, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
            <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            <button onClick={() => eliminar(i)} style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
          </div>
        ))}
        {imagenes.length < 4 && (
          <label style={{ width: 68, height: 68, borderRadius: 10, border: '1.5px dashed #d1d1d6', background: '#f9f9fb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 3 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span style={{ fontSize: 10, color: '#aeaeb2', fontWeight: 600 }}>Agregar</span>
            <input type="file" accept="image/*" multiple capture="environment" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)}/>
          </label>
        )}
      </div>
    </div>
  )
}

// ── Formatear ubicación ───────────────────────────────────────
function formatUbicacion(m) {
  if (m.modo_ubicacion === 'altura')       return [m.calle, m.altura].filter(Boolean).join(' ')
  if (m.modo_ubicacion === 'interseccion') return [m.calle, m.calle2].filter(Boolean).join(' y ')
  if (m.modo_ubicacion === 'entre_calles') return `${m.calle} entre ${m.desde} y ${m.hasta}`
  if (m.modo_ubicacion === 'poligono')     return m.poligono_desc ?? ''
  return m.calle ?? '—'
}

export default function PanelDetalle({ mision, onClose, rol, onRefresh, isMobile = false }) {
  const { profile } = useAuth()
  const estado = ESTADOS[mision.estado] ?? ESTADOS.sin_asignar
  const [view, setView]                         = useState('detalle')
  const [motivoRechazo, setMotivoRechazo]       = useState(null)
  const [notaRechazo, setNotaRechazo]           = useState('')
  const [motivoIncumplimiento, setMotivoIncumplimiento] = useState(null)
  const [notaIncumplimiento, setNotaIncumplimiento]     = useState('')
  const [observaciones, setObservaciones]       = useState('')
  const [imagenes, setImagenes]                 = useState([])
  const [saving, setSaving]                     = useState(false)
  const [showAsignacion, setShowAsignacion]     = useState(false)
  const [liberando, setLiberando]               = useState(null)

  const puedeAsignar   = ['gerencia','jefe_base','coordinador','supervisor','admin'].includes(rol)
  const agentes        = Array.isArray(mision.agentes) ? mision.agentes : []
  const actorNombre    = profile?.nombre_completo ?? ''
  const ubicacion      = formatUbicacion(mision)

  // ── Acciones ──────────────────────────────────────────────────

  async function handleCerrar() {
    if (!observaciones.trim()) return
    setSaving(true)
    try {
      // Subir fotos si hay
      const fotosUrls = []
      for (const img of imagenes) {
        if (!img.file) continue
        const formData = new FormData()
        formData.append('foto', img.file)
        try {
          const res = await api.upload('/api/upload', formData)
          if (res.url) fotosUrls.push(res.url)
        } catch (e) {
          console.warn('Error subiendo foto:', e)
        }
      }
      await api.post(`/api/misiones/${mision.id}/cerrar`, { observaciones })
      onRefresh(); onClose()
    } catch (e) {
      console.warn('Error cerrando misión:', e)
    }
    setSaving(false)
  }

  async function handleInterrumpir() {
    if (!motivoIncumplimiento) return
    setSaving(true)
    try {
      await api.post(`/api/misiones/${mision.id}/interrumpir`, { motivo: motivoIncumplimiento + (notaIncumplimiento ? ` — ${notaIncumplimiento}` : '') })
      onRefresh(); onClose()
    } catch (e) {
      console.warn('Error interrumpiendo misión:', e)
    }
    setSaving(false)
  }

  async function handleDesasignar(agente) {
    setLiberando(agente.id)
    try {
      // Por ahora liberamos via cerrar el turno del agente — endpoint de desasignar pendiente
      // TODO: agregar POST /api/misiones/:id/desasignar en el backend
      console.log('Desasignar agente:', agente.id, 'de misión:', mision.id)
      onRefresh()
    } catch (e) {
      console.warn('Error desasignando:', e)
    }
    setLiberando(null)
  }

  // ── Render ────────────────────────────────────────────────────
  const contenido = (
    <>
      {view === 'detalle' && (
        <>
          {/* Info base */}
          <div style={{ background: '#f9f9fb', borderRadius: 12, padding: '2px 14px', marginBottom: 14 }}>
            {[
              {
                icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
                label: 'Ubicación', val: ubicacion || '—',
              },
              {
                icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#534ab7" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>,
                label: 'Base', val: mision.base_nombre ?? '—',
              },
              {
                icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#854f0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                label: 'Turno', val: mision.turno ?? '—',
              },
            ].map((r, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #efefef' : 'none', alignItems: 'flex-start' }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: '#fff', border: '0.5px solid #e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{r.icon}</div>
                <div><div style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 1 }}>{r.label}</div><div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{r.val}</div></div>
              </div>
            ))}
          </div>

          {/* Agentes */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Agentes {agentes.length > 0 && `(${agentes.length})`}
              </div>
              {puedeAsignar && ['sin_asignar','asignada'].includes(mision.estado) && (
                <button onClick={() => setShowAsignacion(true)} style={{ fontSize: 11, fontWeight: 700, color: '#1a2744', background: '#f0f4ff', border: 'none', borderRadius: 7, padding: '3px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Agregar
                </button>
              )}
            </div>
            {agentes.length === 0 ? (
              <div style={{ background: '#f9f9fb', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#aeaeb2', textAlign: 'center' }}>Sin agentes asignados</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {agentes.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: a.es_encargado ? '#f0f4ff' : '#f9f9fb', borderRadius: 10, padding: '9px 12px', border: a.es_encargado ? '1px solid #d0d9ff' : 'none' }}>
                    <Initials nombre={a.nombre_completo} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>
                        {a.nombre_completo}
                        {a.es_encargado && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: '#1a2744', color: '#f5c800', padding: '1px 6px', borderRadius: 5 }}>★ Encargado</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#8e8e93' }}>Legajo {a.legajo} · {a.estado === 'en_mision' ? 'En misión' : 'Asignado'}</div>
                    </div>
                    {puedeAsignar && mision.estado !== 'cerrada' && (
                      <button onClick={() => handleDesasignar(a)} disabled={liberando === a.id} style={{ fontSize: 11, fontWeight: 600, color: '#a32d2d', background: '#fce8e8', border: 'none', borderRadius: 7, padding: '3px 8px', cursor: 'pointer' }}>
                        {liberando === a.id ? '...' : 'Liberar'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Descripción */}
          {mision.descripcion && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>Descripción</div>
              <div style={{ fontSize: 13, color: '#3d3d3a', lineHeight: 1.6, background: '#f9f9fb', borderRadius: 10, padding: '10px 13px' }}>{mision.descripcion}</div>
            </div>
          )}

          {/* Observaciones de cierre */}
          {mision.observaciones && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>Reporte de cierre</div>
              <div style={{ fontSize: 13, color: '#3d3d3a', lineHeight: 1.6, background: '#e8faf2', borderRadius: 10, padding: '10px 13px' }}>{mision.observaciones}</div>
            </div>
          )}

          {/* Interrupciones */}
          {Array.isArray(mision.interrupciones) && mision.interrupciones.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>Interrupciones</div>
              <div style={{ background: '#faeeda', borderRadius: 10, padding: '6px 12px' }}>
                {mision.interrupciones.map((int, i) => (
                  <div key={i} style={{ padding: '7px 0', borderBottom: i < mision.interrupciones.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#854f0b' }}>{int.motivo}</div>
                    <div style={{ fontSize: 11, color: '#a0672a' }}>{int.nombre_completo} · {tiempoRelativo(int.inicio)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mapa placeholder */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>Ubicación</div>
            <div style={{ background: '#e4eaf5', borderRadius: 12, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              <svg viewBox="0 0 360 100" width="360" height="100" style={{ position: 'absolute', opacity: 0.12 }}><rect width="360" height="100" fill="#4a7fc1"/><line x1="0" y1="50" x2="360" y2="50" stroke="#fff" strokeWidth="1"/><line x1="180" y1="0" x2="180" y2="100" stroke="#fff" strokeWidth="1"/></svg>
              <div style={{ position: 'relative', textAlign: 'center' }}>
                <svg width="18" height="23" viewBox="0 0 22 28" style={{ display: 'block', margin: '0 auto 3px' }}><path d="M11 0C5 0 0 5 0 11c0 9 11 17 11 17s11-8 11-17C22 5 17 0 11 0z" fill="#1a2744"/><circle cx="11" cy="11" r="5" fill="#fff"/></svg>
                <span style={{ fontSize: 11, color: '#5f7fa8', fontWeight: 500 }}>{ubicacion}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'interrumpir' && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2744', marginBottom: 3 }}>Motivo de interrupción</div>
          <div style={{ fontSize: 13, color: '#8e8e93', marginBottom: 14 }}>La misión queda interrumpida con este registro.</div>
          {MOTIVOS_INCUMPLIMIENTO.map((m, i) => (
            <div key={i} onClick={() => setMotivoIncumplimiento(m)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 11, border: motivoIncumplimiento === m ? '1.5px solid #8e8e93' : '1px solid #e5e5ea', background: motivoIncumplimiento === m ? '#f5f5f7' : '#fff', marginBottom: 7, cursor: 'pointer', fontSize: 13, color: '#1d1d1f', fontWeight: 500 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: motivoIncumplimiento === m ? '5px solid #8e8e93' : '1.5px solid #c7c7cc', flexShrink: 0 }}/>{m}
            </div>
          ))}
          <textarea value={notaIncumplimiento} onChange={e => setNotaIncumplimiento(e.target.value)} placeholder="Detalle adicional (opcional)..." style={{ width: '100%', background: '#f9f9fb', border: '0.5px solid #e5e5ea', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', minHeight: 70, marginTop: 6, color: '#1d1d1f', boxSizing: 'border-box' }}/>
        </div>
      )}

      {view === 'cerrar' && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2744', marginBottom: 3 }}>Cerrar misión</div>
          <div style={{ fontSize: 13, color: '#8e8e93', marginBottom: 12 }}>Completá el reporte antes de cerrar.</div>
          <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Describí la situación y las acciones tomadas..." style={{ width: '100%', background: '#f9f9fb', border: '0.5px solid #e5e5ea', borderRadius: 10, padding: '11px 13px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', minHeight: 100, color: '#1d1d1f', boxSizing: 'border-box' }}/>
          <SelectorImagenes imagenes={imagenes} onChange={setImagenes} />
        </div>
      )}
    </>
  )

  const acciones = (
    <>
      {view === 'detalle' && (
        <>
          {['sin_asignar','asignada'].includes(mision.estado) && puedeAsignar && (
            <button onClick={() => setShowAsignacion(true)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#1a2744', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
              Asignar agentes
            </button>
          )}
          {mision.estado === 'en_mision' && puedeAsignar && (
            <>
              <button onClick={() => setView('cerrar')} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#1a2744', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
                Cerrar misión ✓
              </button>
              <button onClick={() => setView('interrumpir')} style={{ width: '100%', padding: '10px', borderRadius: 12, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Interrumpir
              </button>
            </>
          )}
          {mision.estado === 'cerrada' && (
            <div style={{ textAlign: 'center', fontSize: 13, color: '#0f6e56', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#e8faf2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✓</div>
              Misión cerrada
            </div>
          )}
          {mision.estado === 'interrumpida' && puedeAsignar && (
            <button onClick={() => setShowAsignacion(true)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#854f0b', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Reasignar agentes
            </button>
          )}
        </>
      )}
      {view === 'cerrar' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('detalle')} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleCerrar} disabled={!observaciones.trim() || saving} style={{ flex: 2, padding: '11px', borderRadius: 12, border: 'none', background: observaciones.trim() ? '#1a2744' : '#e5e5ea', color: observaciones.trim() ? '#fff' : '#c7c7cc', fontSize: 13, fontWeight: 700, cursor: observaciones.trim() ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Cerrando...' : 'Cerrar misión ✓'}
          </button>
        </div>
      )}
      {view === 'interrumpir' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('detalle')} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleInterrumpir} disabled={!motivoIncumplimiento || saving} style={{ flex: 2, padding: '11px', borderRadius: 12, border: 'none', background: motivoIncumplimiento ? '#854f0b' : '#e5e5ea', color: motivoIncumplimiento ? '#fff' : '#c7c7cc', fontSize: 13, fontWeight: 700, cursor: motivoIncumplimiento ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Guardando...' : 'Confirmar interrupción'}
          </button>
        </div>
      )}
    </>
  )

  // ── Mobile ────────────────────────────────────────────────────
  if (isMobile) return (
    <div style={{ position: 'fixed', inset: 0, background: '#f5f5f7', zIndex: 200, display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
      <div style={{ background: '#1a2744', padding: '48px 18px 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                {mision.tipo === 'mision' ? 'Misión' : 'Servicio'}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: estado.bg, color: estado.color }}>{estado.label}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1.2 }}>{mision.titulo}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#fff', padding: '7px 12px', flexShrink: 0, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Volver
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 0' }}>{contenido}</div>
      <div style={{ padding: '12px 16px 28px', background: '#fff', borderTop: '0.5px solid #e5e5ea', flexShrink: 0 }}>{acciones}</div>

      {showAsignacion && (
        <SheetAsignacion mision={mision} onClose={() => setShowAsignacion(false)} onAsignado={() => { setShowAsignacion(false); onRefresh() }} />
      )}
    </div>
  )

  // ── Desktop ───────────────────────────────────────────────────
  return (
    <>
      <div style={{ width: 400, flexShrink: 0, padding: '12px 16px 12px 8px', background: '#eef1f6', borderLeft: '0.5px solid #e0e4ed', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ background: '#fff', borderRadius: 18, border: '0.5px solid #dde2ec', boxShadow: '0 4px 24px rgba(26,39,68,0.08)', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '16px 18px 14px', borderBottom: '0.5px solid #e8ecf4', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#534ab7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {mision.tipo === 'mision' ? 'Misión' : 'Servicio'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: estado.bg, color: estado.color }}>{estado.label}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744', letterSpacing: '-0.3px', lineHeight: 1.25, marginBottom: 6 }}>{mision.titulo}</div>
                <div style={{ fontSize: 11, color: '#aeaeb2' }}>Turno {mision.turno ?? '—'} · {mision.base_nombre ?? '—'}</div>
              </div>
              <button onClick={onClose} style={{ background: '#f5f5f7', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#8e8e93', padding: 6, flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px', background: '#fff' }}>{contenido}</div>

          <div style={{ padding: '12px 18px 16px', borderTop: '0.5px solid #e8ecf4', background: '#fff', flexShrink: 0 }}>{acciones}</div>
        </div>
      </div>

      {showAsignacion && (
        <SheetAsignacion mision={mision} onClose={() => setShowAsignacion(false)} onAsignado={() => { setShowAsignacion(false); onRefresh() }} />
      )}
    </>
  )
}
