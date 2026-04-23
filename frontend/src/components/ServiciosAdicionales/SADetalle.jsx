import { useState, useEffect } from 'react'
import api from '../../lib/api'
import AppShell from '../AppShell'
import { ESTADO_LABELS } from './ServiciosAdicionales'
import SATabPostulantes from './SATabPostulantes'
import SATabArmado from './SATabArmado'
import SATabConvocatoria from './SATabConvocatoria'
import SATabPresentismo from './SATabPresentismo'
import SATabFlyer from './SATabFlyer'
import SATabTurnos from './SATabTurnos'

const TABS = [
  { key: 'detalle',      label: 'Detalle' },
  { key: 'turnos',       label: 'Turnos' },
  { key: 'flyer',        label: 'Publicación' },
  { key: 'postulantes',  label: 'Postulantes' },
  { key: 'armado',       label: 'Armado' },
  { key: 'convocatoria', label: 'Convocatoria' },
  { key: 'presentismo',  label: 'Presentismo' },
]

const ESTADO_SIGUIENTE = {}

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
    <div style={{ padding: '9px 0', borderBottom: '0.5px solid #e8ecf4' }}>
      <span style={{ fontSize: 13, color: '#8e8e93' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: '#1d1d1f' }}>{valor}</span>
    </div>
  )
}

function SATabDetalle({ servicio: s }) {
  const [turnos, setTurnos] = useState([])

  useEffect(() => {
    api.get('/api/servicios-adicionales/' + s.id + '/turnos')
      .then(data => setTurnos(data))
      .catch(() => {})
  }, [s.id])

  const dotacionTotal = turnos.reduce((acc, t) => ({
    agentes:      acc.agentes      + (t.dotacion_agentes      || 0),
    supervisores: acc.supervisores + (t.dotacion_supervisores || 0),
    choferes:     acc.choferes     + (t.dotacion_choferes     || 0),
    motorizados:  acc.motorizados  + (t.dotacion_motorizados  || 0),
  }), { agentes: 0, supervisores: 0, choferes: 0, motorizados: 0 })

  return (
    <div style={{ padding: '28px 44px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 1100 }}>

      {/* Datos del servicio */}
      <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #dde2ec', padding: '20px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Datos del servicio</div>
        <FilaDetalle label="OS Adicional"    valor={s.os_nombre || '—'} />
        <FilaDetalle label="Motivo / Evento" valor={s.os_evento_motivo || '—'} />
        <FilaDetalle label="Base"            valor={s.base_nombre || '—'} />
        {(s.horario_desde) && (
          <FilaDetalle label="Horario OS"
            valor={String(s.horario_desde).slice(0,5) + ' – ' + String(s.horario_hasta).slice(0,5)} />
        )}
        <FilaDetalle label="Módulos"         valor={s.modulos_calculados ? s.modulos_calculados + ' módulos' : '—'} />
      </div>

      {/* Turnos del servicio */}
      <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #dde2ec', padding: '20px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Turnos y dotación</div>
        {turnos.length === 0 ? (
          <div style={{ fontSize: 13, color: '#aeaeb2' }}>Sin turnos cargados</div>
        ) : turnos.map((t, i) => {
          const dotT = (t.dotacion_agentes||0) + (t.dotacion_supervisores||0) + (t.dotacion_choferes||0) + (t.dotacion_motorizados||0)
          const horaStr = [String(t.hora_inicio||'').slice(0,5), String(t.hora_fin||'').slice(0,5)].filter(Boolean).join(' – ')
          return (
            <div key={t.id} style={{ marginBottom: i < turnos.length - 1 ? 12 : 0, paddingBottom: i < turnos.length - 1 ? 12 : 0, borderBottom: i < turnos.length - 1 ? '0.5px solid #f5f5f7' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>
                  {t.nombre || formatFecha(t.fecha)}
                </span>
                {horaStr && <span style={{ fontSize: 12, color: '#0f6e56', fontWeight: 600 }}>{horaStr}hs</span>}
              </div>
              {t.nombre && t.fecha && <div style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 4 }}>{formatFecha(t.fecha)}</div>}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {t.dotacion_agentes      > 0 && <span style={{ fontSize: 11, color: '#636366' }}>{t.dotacion_agentes} infantes</span>}
                {t.dotacion_supervisores > 0 && <span style={{ fontSize: 11, color: '#636366' }}>{t.dotacion_supervisores} supervisores</span>}
                {t.dotacion_choferes     > 0 && <span style={{ fontSize: 11, color: '#636366' }}>{t.dotacion_choferes} choferes</span>}
                {t.dotacion_motorizados  > 0 && <span style={{ fontSize: 11, color: '#636366' }}>{t.dotacion_motorizados} motorizados</span>}
                {dotT === 0 && <span style={{ fontSize: 11, color: '#aeaeb2' }}>Sin dotación definida</span>}
              </div>
            </div>
          )
        })}
        {turnos.length > 1 && (
          <div style={{ borderTop: '0.5px solid #e8ecf4', marginTop: 12, paddingTop: 12, display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2744' }}>Total:</span>
            {dotacionTotal.agentes      > 0 && <span style={{ fontSize: 12, color: '#636366' }}>{dotacionTotal.agentes} infantes</span>}
            {dotacionTotal.supervisores > 0 && <span style={{ fontSize: 12, color: '#636366' }}>{dotacionTotal.supervisores} supervisores</span>}
            {dotacionTotal.choferes     > 0 && <span style={{ fontSize: 12, color: '#636366' }}>{dotacionTotal.choferes} choferes</span>}
            {dotacionTotal.motorizados  > 0 && <span style={{ fontSize: 12, color: '#636366' }}>{dotacionTotal.motorizados} motorizados</span>}
          </div>
        )}
      </div>

      {/* Recursos de la OS */}
      {(s.dotacion_agentes > 0 || s.dotacion_supervisores > 0 || s.dotacion_motorizados > 0) && (
        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #dde2ec', padding: '20px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Dotación total OS</div>
          {s.dotacion_agentes > 0 && <FilaDetalle label="Infantes" valor={String(s.dotacion_agentes)} />}
          {s.dotacion_supervisores > 0 && <FilaDetalle label="Supervisores" valor={String(s.dotacion_supervisores)} />}
          {s.dotacion_motorizados > 0 && <FilaDetalle label="Motorizados" valor={String(s.dotacion_motorizados)} />}
        </div>
      )}

      {s.observaciones && (
        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #dde2ec', padding: '20px 24px', gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Observaciones</div>
          <p style={{ fontSize: 14, color: '#1d1d1f', margin: 0, lineHeight: 1.6 }}>{s.observaciones}</p>
        </div>
      )}
    </div>
  )
}

export default function SADetalle({ servicioId, onVolver }) {
  const [servicio,  setServicio]  = useState(null)
  const [cargando,  setCargando]  = useState(true)
  const [tabActiva, setTabActiva] = useState('detalle')
  const [avanzando, setAvanzando] = useState(false)
  const [error,     setError]     = useState(null)
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
    try {
      const data = await api.post('/api/servicios-adicionales/' + servicioId + '/avanzar-estado', {})
      setServicio(prev => ({ ...prev, estado: data.estado }))
    } catch (e) { alert(e.message) }
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

  const estadoInfo = ESTADO_LABELS[servicio.estado] || ESTADO_LABELS.en_gestion
  const accionSig  = ESTADO_SIGUIENTE[servicio.estado]

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
              {servicio.base_nombre && <span style={{ fontSize: 12, color: '#aeaeb2' }}>{servicio.base_nombre}</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTabActiva(t.key); if (t.key !== 'armado' && t.key !== 'presentismo') setTurnoActivo(null) }}
              style={{
                padding: '10px 16px', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: tabActiva === t.key ? 700 : 400,
                background: 'transparent',
                color: tabActiva === t.key ? '#1a2744' : '#8e8e93',
                borderBottom: tabActiva === t.key ? '2px solid #1a2744' : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflow: 'auto', background: '#eef1f6' }}>
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
        {tabActiva === 'presentismo' && (
          <SATabPresentismo servicioId={servicioId} modulosDefault={servicio.modulos_calculados} turnoActivo={turnoActivo} onCambiarTurno={(turno) => setTurnoActivo(turno)} onServicioCerrado={cargar} />
        )}
      </div>
    </AppShell>
  )
}
