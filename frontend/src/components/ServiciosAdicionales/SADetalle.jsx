import { useState, useEffect } from 'react'
import api from '../../lib/api'
import AppShell from '../AppShell'
import { useAuth } from '../../context/AuthContext'
import { ESTADO_LABELS } from './ServiciosAdicionales'
import SATabPostulantes from './SATabPostulantes'
import SATabArmado from './SATabArmado'
import SATabConvocatoria from './SATabConvocatoria'
import SATabPresentismo from './SATabPresentismo'
import SATabFlyer from './SATabFlyer'
import SATabTurnos from './SATabTurnos'
import SATabRecursos from './SATabRecursos'

const TABS = [
  { key: 'detalle',      label: 'Detalle' },
  { key: 'turnos',       label: 'Turnos' },
  { key: 'flyer',        label: 'Publicación' },
  { key: 'postulantes',  label: 'Postulantes' },
  { key: 'armado',       label: 'Armado' },
  { key: 'convocatoria', label: 'Convocatoria' },
  { key: 'recursos',     label: 'Recursos' },
  { key: 'presentismo',  label: 'Presentismo' },
]

const ROLES_ADMIN = ['admin', 'gerencia', 'director']

const ESTADO_SIGUIENTE = {
  pendiente:  { label: 'Iniciar gestión',  color: '#185fa5' },
  en_gestion: { label: 'Iniciar gestión',  color: '#185fa5' },
  convocado:  { label: 'Cerrar servicio',  color: '#636366' },
  en_curso:   { label: 'Cerrar servicio',  color: '#636366' },
}

const ROL_LABELS = {
  jefe_general: 'Jefe General',
  jefe:         'Jefe',
  supervisor:   'Supervisor',
  agente:       'Agente',
  chofer:       'Chofer',
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  const d = new Date(String(fecha).slice(0, 10) + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function FilaDetalle({ label, valor, bold }) {
  return (
    <div style={{ padding: '9px 0', borderBottom: '0.5px solid #e8ecf4', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#8e8e93', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: '#1d1d1f', textAlign: 'right' }}>{valor}</span>
    </div>
  )
}

const RECURSO_ESTADOS = {
  pendiente:     { label: 'Pendiente',     dot: '#c7c7cc', bg: '#f5f5f7',  color: '#8e8e93'  },
  solicitado:    { label: 'Solicitado',    dot: '#f5c800', bg: '#fff8e1',  color: '#b45309'  },
  confirmado:    { label: 'Confirmado',    dot: '#22c55e', bg: '#e8f5e9',  color: '#1a7c4a'  },
  no_disponible: { label: 'No disponible', dot: '#e24b4a', bg: '#feecec',  color: '#c0392b'  },
}

function SATabDetalle({ servicio: s }) {
  const [turnos,   setTurnos]   = useState([])
  const [recursos, setRecursos] = useState([])

  useEffect(() => {
    api.get('/api/servicios-adicionales/' + s.id + '/turnos').then(setTurnos).catch(() => {})
    api.get('/api/servicios-adicionales/' + s.id + '/recursos').then(data => setRecursos(data || [])).catch(() => {})
  }, [s.id])

  const dotTotal = turnos.reduce((acc, t) => ({
    agentes:      acc.agentes      + (t.dotacion_agentes      || 0),
    supervisores: acc.supervisores + (t.dotacion_supervisores || 0),
    choferes:     acc.choferes     + (t.dotacion_choferes     || 0),
  }), { agentes: 0, supervisores: 0, choferes: 0 })

  const CARD = { background: '#fff', borderRadius: 16, border: '0.5px solid #dde2ec', padding: '20px 24px' }
  const TITULO = { fontSize: 12, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }

  return (
    <div style={{ padding: '28px 44px', display: 'grid', gridTemplateColumns: recursos.length > 0 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 20, maxWidth: 1300, alignItems: 'start' }}>

      {/* ── Datos del servicio ── */}
      <div style={CARD}>
        <div style={TITULO}>Datos del servicio</div>

        <FilaDetalle label="OS Adicional" valor={s.os_nombre || '—'} bold />
        {s.os_evento_motivo   && <FilaDetalle label="Motivo / Evento" valor={s.os_evento_motivo} />}
        {s.ubicacion          && <FilaDetalle label="Ubicación"       valor={s.ubicacion} />}
        {s.horario_desde      && <FilaDetalle label="Horario" valor={String(s.horario_desde).slice(0,5) + ' – ' + String(s.horario_hasta || '').slice(0,5) + ' hs'} />}
        {s.modalidad_contrato && <FilaDetalle label="Modalidad"       valor={s.modalidad_contrato} />}
        {s.modulos_calculados > 0 && <FilaDetalle label="Módulos"     valor={s.modulos_calculados + ' módulos'} />}

        {/* Fechas */}
        {Array.isArray(s.fechas_os) && s.fechas_os.length > 0 && (
          <div style={{ padding: '10px 0', borderBottom: '0.5px solid #e8ecf4' }}>
            <span style={{ fontSize: 13, color: '#8e8e93', display: 'block', marginBottom: 8 }}>
              {s.fechas_os.length === 1 ? 'Fecha' : 'Fechas'}
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {s.fechas_os.map((f, i) => {
                const d = new Date(String(f).slice(0,10) + 'T12:00:00')
                return (
                  <span key={i} style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#eef1f8', color: '#1a2744' }}>
                    {d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Dotación OS */}
        {(s.dotacion_agentes > 0 || s.dotacion_supervisores > 0 || s.dotacion_motorizados > 0) && (
          <div style={{ padding: '10px 0', borderBottom: '0.5px solid #e8ecf4' }}>
            <span style={{ fontSize: 13, color: '#8e8e93', display: 'block', marginBottom: 8 }}>Dotación OS</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {s.dotacion_agentes      > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#eef1f8', color: '#1a2744' }}>{s.dotacion_agentes} Inf</span>}
              {s.dotacion_supervisores > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#e8f5ee', color: '#0a5c3a' }}>{s.dotacion_supervisores} Sup</span>}
              {s.dotacion_motorizados  > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#f0ebff', color: '#5b21b6' }}>{s.dotacion_motorizados} Mot</span>}
            </div>
          </div>
        )}

        <FilaDetalle label="Creado por" valor={s.creado_por_nombre || '—'} />
        <FilaDetalle label="Ingresado"  valor={s.created_at ? new Date(s.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} />
      </div>

      {/* ── Turnos y dotación ── */}
      <div style={CARD}>
        <div style={TITULO}>Turnos y dotación</div>
        {turnos.length === 0 ? (
          <div style={{ fontSize: 13, color: '#aeaeb2' }}>Sin turnos cargados</div>
        ) : (
          <>
            {turnos.map((t, i) => {
              const dotT    = (t.dotacion_agentes||0) + (t.dotacion_supervisores||0) + (t.dotacion_choferes||0)
              const horaStr = [String(t.hora_inicio||'').slice(0,5), String(t.hora_fin||'').slice(0,5)].filter(Boolean).join(' – ')
              return (
                <div key={t.id} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: i < turnos.length - 1 ? '0.5px solid #f0f0f5' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>{t.nombre || formatFecha(t.fecha)}</span>
                    {horaStr && <span style={{ fontSize: 12, color: '#0f6e56', fontWeight: 600 }}>{horaStr}hs</span>}
                  </div>
                  {t.nombre && t.fecha && (
                    <div style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 6 }}>{formatFecha(t.fecha)}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {t.dotacion_agentes      > 0 && <span style={{ fontSize: 11, color: '#636366' }}>{t.dotacion_agentes} infantes</span>}
                    {t.dotacion_supervisores > 0 && <span style={{ fontSize: 11, color: '#636366' }}>{t.dotacion_supervisores} supervisores</span>}
                    {t.dotacion_choferes     > 0 && <span style={{ fontSize: 11, color: '#636366' }}>{t.dotacion_choferes} choferes</span>}
                    {dotT === 0 && <span style={{ fontSize: 11, color: '#aeaeb2' }}>Sin dotación definida</span>}
                  </div>
                </div>
              )
            })}
            {turnos.length > 1 && (
              <div style={{ paddingTop: 4, display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2744' }}>Total:</span>
                {dotTotal.agentes      > 0 && <span style={{ fontSize: 12, color: '#636366' }}>{dotTotal.agentes} infantes</span>}
                {dotTotal.supervisores > 0 && <span style={{ fontSize: 12, color: '#636366' }}>{dotTotal.supervisores} supervisores</span>}
                {dotTotal.choferes     > 0 && <span style={{ fontSize: 12, color: '#636366' }}>{dotTotal.choferes} choferes</span>}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Recursos ── */}
      {recursos.length > 0 && (() => {
        const vehiculos = recursos.filter(r => r.categoria === 'vehiculo')
        const elementos = recursos.filter(r => r.categoria === 'elemento')
        const conf      = recursos.filter(r => r.estado === 'confirmado').length

        const FilaRecurso = ({ r }) => {
          const ei = RECURSO_ESTADOS[r.estado] || RECURSO_ESTADOS.pendiente
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#f8f9fc', borderRadius: 10, border: '0.5px solid #e8ecf4' }}>
              <div style={{ minWidth: 30, height: 30, borderRadius: 8, background: '#eef1f8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#1a2744' }}>{r.cantidad}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.tipo}</div>
                {r.observacion && <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.observacion}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: ei.bg, flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: ei.dot }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: ei.color }}>{ei.label}</span>
              </div>
            </div>
          )
        }

        return (
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={TITULO}>Recursos</div>
              {conf > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#e8f5e9', color: '#1a7c4a' }}>
                  {conf}/{recursos.length} confirmados
                </span>
              )}
            </div>

            {vehiculos.length > 0 && (
              <div style={{ marginBottom: elementos.length > 0 ? 16 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>🚗</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vehículos</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {vehiculos.map(r => <FilaRecurso key={r.id} r={r} />)}
                </div>
              </div>
            )}

            {elementos.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>📦</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Elementos</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {elementos.map(r => <FilaRecurso key={r.id} r={r} />)}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Observaciones ── */}
      {s.observaciones && (
        <div style={{ ...CARD, gridColumn: '1 / -1' }}>
          <div style={TITULO}>Observaciones</div>
          <p style={{ fontSize: 14, color: '#1d1d1f', margin: 0, lineHeight: 1.6 }}>{s.observaciones}</p>
        </div>
      )}
    </div>
  )
}

export default function SADetalle({ servicioId, onVolver }) {
  const { profile } = useAuth()
  const userRole    = profile?.role ?? ''
  const [servicio,  setServicio]  = useState(null)
  const [cargando,  setCargando]  = useState(true)
  const [tabActiva, setTabActiva] = useState('detalle')
  const [avanzando,     setAvanzando]     = useState(false)
  const [errorAvance,   setErrorAvance]   = useState(null)
  const [error,         setError]         = useState(null)
  // Turno seleccionado para armado/presentismo
  const [turnoActivo, setTurnoActivo] = useState(null)

  useEffect(() => { cargar() }, [servicioId])

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const data = await api.get('/api/servicios-adicionales/' + servicioId)
      setServicio(data)
    } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }

  async function avanzarEstado() {
    setAvanzando(true)
    setErrorAvance(null)
    try {
      const data = await api.post('/api/servicios-adicionales/' + servicioId + '/avanzar-estado', {})
      setServicio(prev => ({ ...prev, estado: data.estado }))
    } catch (e) { setErrorAvance(e.message) }
    finally { setAvanzando(false) }
  }

  if (cargando) return (
    <AppShell titulo="Servicios adicionales">
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aeaeb2', fontSize: 14 }}>Cargando...</div>
    </AppShell>
  )

  if (error || !servicio) return (
    <AppShell titulo="Servicios adicionales">
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#c0392b', marginBottom: 12 }}>{error || 'No encontrado'}</div>
          <button onClick={onVolver} style={{ padding: '9px 20px', borderRadius: 10, border: '0.5px solid #dde2ec', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Volver</button>
        </div>
      </div>
    </AppShell>
  )

  const estadoInfo  = ESTADO_LABELS[servicio.estado] || { label: servicio.estado, bg: '#f5f5f7', text: '#636366', color: '#636366' }
  const accionSig   = ESTADO_SIGUIENTE[servicio.estado]
  const esCerrado   = servicio.estado === 'cerrado'
  const puedeEditar = !esCerrado || ROLES_ADMIN.includes(userRole)
  const bloqueado   = esCerrado && !puedeEditar

  return (
    <AppShell titulo="Servicios adicionales">
      {/* Subheader */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e0e4ed', padding: '12px 40px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onVolver}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', padding: '4px 2px', display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#1a2744'}
              onMouseLeave={e => e.currentTarget.style.color = '#aeaeb2'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Servicios</span>
            </button>
            <div style={{ width: 1, height: 20, background: '#e0e4ed' }}/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2744' }}>{servicio.os_nombre || 'Sin nombre'}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: estadoInfo.bg, color: estadoInfo.text }}>
                {estadoInfo.label}
              </span>
            </div>
          </div>

          {/* Botón avanzar estado */}
          {accionSig && (
            <button onClick={avanzarEstado} disabled={avanzando}
              style={{
                padding: '7px 16px', borderRadius: 10, border: 'none', cursor: avanzando ? 'not-allowed' : 'pointer',
                background: accionSig.color, color: '#fff', fontSize: 13, fontWeight: 600,
                opacity: avanzando ? 0.6 : 1, transition: 'opacity 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
              {avanzando ? 'Procesando…' : accionSig.label}
            </button>
          )}
        </div>

        {/* Banner servicio cerrado — admin */}
        {esCerrado && puedeEditar && (
          <div style={{ margin: '0 0 10px', padding: '8px 14px', background: '#fff8e6', border: '0.5px solid #f0c040', borderRadius: 10, fontSize: 12, color: '#854f0b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔓</span>
            <span><strong>Modo administrador</strong> — Este servicio está cerrado. Estás viendo y operando como administrador.</span>
          </div>
        )}

        {/* Banner error avance */}
        {errorAvance && (
          <div style={{ margin: '0 0 10px', padding: '10px 14px', background: '#fff5f5', border: '0.5px solid #ffc0c0', borderRadius: 10, fontSize: 13, color: '#c0392b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{errorAvance}</span>
            <button onClick={() => setErrorAvance(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => {
            const bloqueada = servicio.estado === 'pendiente' && t.key !== 'detalle'
            const activa    = tabActiva === t.key
            return (
              <button key={t.key}
                onClick={() => {
                  if (bloqueada) return
                  setTabActiva(t.key)
                  if (t.key !== 'armado' && t.key !== 'presentismo') setTurnoActivo(null)
                }}
                title={bloqueada ? 'Iniciá la gestión para acceder a esta sección' : ''}
                style={{
                  padding: '10px 16px', border: 'none',
                  cursor: bloqueada ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: activa ? 700 : 400,
                  background: 'transparent',
                  color: bloqueada ? '#d1d1d6' : activa ? '#1a2744' : '#8e8e93',
                  borderBottom: activa ? '2px solid #1a2744' : '2px solid transparent',
                  marginBottom: -1, transition: 'color 0.15s',
                }}>
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflow: 'auto', background: '#eef1f6', position: 'relative' }}>

        {/* Overlay de bloqueo para no-admins cuando el servicio está cerrado */}
        {bloqueado && tabActiva !== 'detalle' && tabActiva !== 'presentismo' && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(238,241,246,0.88)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}>
            <div style={{ background: '#fff', borderRadius: 18, padding: '28px 36px', border: '0.5px solid #e0e4ed', boxShadow: '0 8px 32px rgba(0,0,0,0.10)', textAlign: 'center', maxWidth: 380 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>Servicio cerrado</div>
              <div style={{ fontSize: 13, color: '#8e8e93', lineHeight: 1.6 }}>
                Este servicio fue finalizado y no permite modificaciones.<br/>
                Contactá a un administrador si necesitás hacer cambios.
              </div>
            </div>
          </div>
        )}

        {tabActiva === 'detalle' && <SATabDetalle servicio={servicio} />}
        {tabActiva === 'turnos' && (
          <SATabTurnos servicioId={servicioId} onTurnoSelect={(turno) => { setTurnoActivo(turno); setTabActiva('armado') }} />
        )}
        {tabActiva === 'flyer' && <SATabFlyer servicioId={servicioId} />}
        {tabActiva === 'postulantes' && <SATabPostulantes servicioId={servicioId} />}
        {tabActiva === 'armado' && (
          <SATabArmado servicioId={servicioId} requerimientos={servicio.requerimientos || []} turnoActivo={turnoActivo} onCambiarTurno={(turno) => setTurnoActivo(turno)} />
        )}
        {tabActiva === 'convocatoria' && <SATabConvocatoria servicioId={servicioId} servicioNombre={servicio.os_nombre} />}
        {tabActiva === 'recursos' && <SATabRecursos servicioId={servicioId} />}
        {tabActiva === 'presentismo' && (
          <SATabPresentismo servicioId={servicioId} estadoServicio={servicio.estado} modulosDefault={servicio.modulos_calculados} turnoActivo={turnoActivo} onCambiarTurno={(turno) => setTurnoActivo(turno)} onServicioCerrado={cargar} />
        )}
      </div>
    </AppShell>
  )
}
