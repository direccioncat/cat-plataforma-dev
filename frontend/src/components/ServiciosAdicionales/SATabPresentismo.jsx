import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../lib/api'
import { ROLES_OPERATIVOS } from '../../lib/rolesOperativos'
import { useAuth } from '../../context/AuthContext'

const ROL_LABELS = Object.fromEntries(Object.entries(ROLES_OPERATIVOS).map(([k, v]) => [k, v.label]))

// Roles que pueden modificar presentismo cuando el servicio está cerrado
const ROLES_ADMIN = ['admin', 'gerencia', 'director']

// Tri-estado de asistencia
// 'presente' | 'ausente' | 'justificado' | null
function asistenciaDeRegistro(r) {
  if (r.presente === null || r.presente === undefined) return null
  if (r.presente === true) return 'presente'
  if (r.ausencia_justificada) return 'justificado'
  return 'ausente'
}

function fmtHora(h) { return h ? String(h).slice(0, 5) : '' }
function fmtFecha(f) {
  if (!f) return ''
  const d = new Date(String(f).slice(0, 10) + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function BotonAsistencia({ estado, valor, onClick, bloqueado }) {
  const esActivo = estado === valor
  const cfg = {
    presente:    { label: 'Presente',    bg: '#0f6e56', bgInact: '#f5f5f7', color: '#fff', colorInact: '#636366' },
    ausente:     { label: 'Ausente',     bg: '#c0392b', bgInact: '#f5f5f7', color: '#fff', colorInact: '#636366' },
    justificado: { label: 'Justificado', bg: '#854f0b', bgInact: '#fef9e7', color: '#fff', colorInact: '#854f0b' },
  }[valor]

  return (
    <button
      onClick={bloqueado ? undefined : onClick}
      style={{
        padding: '5px 10px', borderRadius: 7, border: esActivo && valor === 'justificado' ? '1.5px solid #b86a0f' : 'none',
        background: esActivo ? cfg.bg : cfg.bgInact,
        color: esActivo ? cfg.color : cfg.colorInact,
        fontSize: 11, fontWeight: 700,
        cursor: bloqueado ? 'not-allowed' : 'pointer',
        opacity: bloqueado ? 0.5 : 1,
        transition: 'all 0.1s',
      }}
    >
      {cfg.label}
    </button>
  )
}

function ModalCerrarServicio({ onConfirmar, onCancelar, cerrando }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onCancelar}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1a2744', textAlign: 'center', marginBottom: 8 }}>Presentismo completo</div>
        <div style={{ fontSize: 14, color: '#636366', textAlign: 'center', lineHeight: 1.6, marginBottom: 28 }}>
          Todos los turnos tienen el presentismo cargado.<br/>¿Querés dar por finalizado el servicio?
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancelar} style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: '#f5f5f7', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ahora no</button>
          <button onClick={onConfirmar} disabled={cerrando} style={{ flex: 2, padding: '11px', borderRadius: 12, border: 'none', background: '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: cerrando ? 'not-allowed' : 'pointer', opacity: cerrando ? 0.6 : 1 }}>
            {cerrando ? 'Cerrando...' : 'Sí, cerrar servicio'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function SelectorTurno({ turnos, turnoActivo, onCambiar }) {
  if (!turnos.length) return <div style={{ padding: '20px 44px', color: '#aeaeb2', fontSize: 14 }}>No hay turnos definidos.</div>
  return (
    <div style={{ padding: '16px 44px 0', borderBottom: '0.5px solid #e5e5ea', background: '#fff', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#aeaeb2', marginRight: 4 }}>Turno:</span>
      {turnos.map(t => (
        <button key={t.id} onClick={() => onCambiar(t)} style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid ' + (turnoActivo?.id === t.id ? '#1a2744' : '#e5e5ea'), background: turnoActivo?.id === t.id ? '#1a2744' : '#fff', color: turnoActivo?.id === t.id ? '#fff' : '#636366', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
          {fmtFecha(t.fecha)} · {fmtHora(t.hora_inicio)}-{fmtHora(t.hora_fin)}
        </button>
      ))}
    </div>
  )
}

export default function SATabPresentismo({ servicioId, estadoServicio, turnoActivo, onCambiarTurno, onServicioCerrado }) {
  const { profile } = useAuth()
  const userRole    = profile?.role ?? ''
  const esCerrado   = estadoServicio === 'cerrado'
  const puedeEditar = !esCerrado || ROLES_ADMIN.includes(userRole)

  const [turnos,      setTurnos]      = useState([])
  const [registros,   setRegistros]   = useState([])
  const [cargando,    setCargando]    = useState(false)
  const [guardando,   setGuardando]   = useState(false)
  const [guardado,    setGuardado]    = useState(false)
  const [modalCerrar, setModalCerrar] = useState(false)
  const [cerrando,    setCerrando]    = useState(false)

  useEffect(() => {
    api.get('/api/servicios-adicionales/' + servicioId + '/turnos')
      .then(data => { setTurnos(data); if (!turnoActivo && data.length > 0) onCambiarTurno(data[0]) })
      .catch(console.error)
  }, [servicioId])

  useEffect(() => { if (!turnoActivo) return; cargar() }, [turnoActivo?.id])

  async function cargar() {
    setCargando(true)
    try {
      const data = await api.get('/api/servicios-adicionales/' + servicioId + '/turnos/' + turnoActivo.id + '/presentismo')
      setRegistros(data.map(r => ({
        agente_id:           r.agente_id,
        nombre_completo:     r.nombre_completo,
        legajo:              r.legajo,
        rol:                 r.rol,
        tipo_convocatoria:   r.tipo_convocatoria,
        asistencia:          asistenciaDeRegistro(r),
        modulos_acreditados: r.modulos_default ?? turnoActivo.modulos ?? 0,
      })))
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  function setAsistencia(agenteId, valor) {
    setRegistros(prev => prev.map(r => r.agente_id === agenteId ? { ...r, asistencia: valor } : r))
    setGuardado(false)
  }

  async function verificarTodosCompletos() {
    try {
      const checks = await Promise.all(turnos.map(t => api.get('/api/servicios-adicionales/' + servicioId + '/turnos/' + t.id + '/presentismo')))
      return checks.every(lista => lista.filter(r => r.tipo_convocatoria !== 'ordinario').every(r => r.presente !== null))
    } catch { return false }
  }

  async function guardar() {
    const sinReg = registros.filter(r => r.asistencia === null && r.tipo_convocatoria !== 'ordinario')
    if (sinReg.length > 0 && !confirm(sinReg.length + ' agentes sin marcar. ¿Guardar igual?')) return
    setGuardando(true)
    try {
      const payload = registros
        .filter(r => r.asistencia !== null)
        .map(r => ({
          agente_id:            r.agente_id,
          presente:             r.asistencia === 'presente',
          ausencia_justificada: r.asistencia === 'justificado',
          modulos_acreditados:  r.tipo_convocatoria === 'ordinario' ? 0 : (r.asistencia === 'presente' ? r.modulos_acreditados : 0),
        }))
      const res = await api.post('/api/servicios-adicionales/' + servicioId + '/turnos/' + turnoActivo.id + '/presentismo', { registros: payload })
      setGuardado(true)
      if (res.alertas?.length > 0) alert('Atencion: ' + res.alertas.map(a => a.mensaje).join('\n'))
      const todosCompletos = await verificarTodosCompletos()
      if (todosCompletos) setModalCerrar(true)
    } catch (e) { alert(e.message) }
    finally { setGuardando(false) }
  }

  async function cerrarServicio() {
    setCerrando(true)
    try {
      await api.post('/api/servicios-adicionales/' + servicioId + '/avanzar-estado', {})
      setModalCerrar(false)
      onServicioCerrado?.()
    } catch (e) { alert(e.message) }
    finally { setCerrando(false) }
  }

  const adicionales  = registros.filter(r => r.tipo_convocatoria !== 'ordinario')
  const ordinarios   = registros.filter(r => r.tipo_convocatoria === 'ordinario')
  const presentes    = adicionales.filter(r => r.asistencia === 'presente').length
  const ausentes     = adicionales.filter(r => r.asistencia === 'ausente').length
  const justificados = adicionales.filter(r => r.asistencia === 'justificado').length
  const sinMarcar    = adicionales.filter(r => r.asistencia === null).length
  const totalMods    = adicionales.filter(r => r.asistencia === 'presente').reduce((acc, r) => acc + (r.modulos_acreditados || 0), 0)

  if (!turnos.length) return (
    <div style={{ padding: 44, textAlign: 'center', color: '#aeaeb2' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: 6 }}>Sin turnos definidos</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SelectorTurno turnos={turnos} turnoActivo={turnoActivo} onCambiar={onCambiarTurno} />

      {!turnoActivo ? (
        <div style={{ padding: 44, textAlign: 'center', color: '#aeaeb2' }}>Selecciona un turno</div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 44px' }}>

          {/* Banner de servicio cerrado */}
          {esCerrado && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, background: puedeEditar ? '#fff8e6' : '#f5f5f7', border: '1px solid ' + (puedeEditar ? '#f0c040' : '#e5e5ea'), marginBottom: 20 }}>
              <span style={{ fontSize: 16 }}>{puedeEditar ? '🔓' : '🔒'}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: puedeEditar ? '#854f0b' : '#636366' }}>
                  {puedeEditar ? 'Servicio cerrado — modo administrador' : 'Servicio cerrado'}
                </div>
                <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 1 }}>
                  {puedeEditar
                    ? 'Estás editando el presentismo de un servicio ya cerrado. Los cambios quedarán registrados.'
                    : 'El presentismo fue cerrado definitivamente. Contactá a un administrador para hacer modificaciones.'}
                </div>
              </div>
            </div>
          )}

          {/* Resumen */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'Presentes',    valor: presentes,    color: '#0f6e56', bg: '#e8faf2' },
              { label: 'Ausentes',     valor: ausentes,     color: '#c0392b', bg: '#fff0f0' },
              { label: 'Justificados', valor: justificados, color: '#854f0b', bg: '#fef9e7' },
              { label: 'Sin marcar',   valor: sinMarcar,    color: '#636366', bg: '#f5f5f7' },
              { label: 'Total mod.',   valor: totalMods,    color: '#185fa5', bg: '#e8f0fe' },
            ].map(r => (
              <div key={r.label} style={{ background: r.bg, borderRadius: 12, padding: '10px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: r.color }}>{r.valor}</div>
                <div style={{ fontSize: 11, color: r.color, marginTop: 2, opacity: 0.8 }}>{r.label}</div>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            {guardado && <span style={{ fontSize: 13, color: '#0f6e56', fontWeight: 600 }}>✓ Guardado</span>}
            {puedeEditar && (
              <button onClick={guardar} disabled={guardando} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: guardando ? '#aeaeb2' : '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer' }}>
                {guardando ? 'Guardando...' : 'Guardar presentismo'}
              </button>
            )}
          </div>

          {cargando ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#aeaeb2' }}>Cargando...</div>
          ) : registros.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#aeaeb2' }}>Sin agentes confirmados en este turno.</div>
          ) : (
            <>
              {adicionales.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '12px 18px', background: '#f5f5f7', fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Convocados adicional ({adicionales.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 260px 100px', padding: '10px 18px', background: '#fafafa', fontSize: 11, fontWeight: 700, color: '#aeaeb2', borderBottom: '0.5px solid #f5f5f7' }}>
                    <span>Agente</span><span>Rol</span><span>Asistencia</span><span>Módulos</span>
                  </div>
                  {adicionales.map((r, i) => {
                    const rowBg = r.asistencia === 'ausente' ? '#fff8f8' : r.asistencia === 'justificado' ? '#fffdf0' : r.asistencia === 'presente' ? '#f8fffc' : '#fff'
                    return (
                      <div key={r.agente_id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 260px 100px', padding: '12px 18px', alignItems: 'center', borderTop: i === 0 ? 'none' : '0.5px solid #f5f5f7', background: rowBg }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{r.nombre_completo}</div>
                          <div style={{ fontSize: 11, color: '#aeaeb2' }}>{r.legajo}</div>
                        </div>
                        <span style={{ fontSize: 11, color: '#636366' }}>{ROL_LABELS[r.rol] || r.rol}</span>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <BotonAsistencia estado={r.asistencia} valor="presente"    onClick={() => setAsistencia(r.agente_id, 'presente')}    bloqueado={!puedeEditar} />
                          <BotonAsistencia estado={r.asistencia} valor="ausente"     onClick={() => setAsistencia(r.agente_id, 'ausente')}     bloqueado={!puedeEditar} />
                          <BotonAsistencia estado={r.asistencia} valor="justificado" onClick={() => setAsistencia(r.agente_id, 'justificado')} bloqueado={!puedeEditar} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: r.asistencia !== 'presente' ? '#c7c7cc' : '#1a2744' }}>
                            {r.asistencia !== 'presente' ? '-' : r.modulos_acreditados}
                          </span>
                          {r.asistencia === 'presente' && <span style={{ fontSize: 11, color: '#aeaeb2' }}>mod.</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Nota informativa sobre justificados */}
              {justificados > 0 && (
                <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#fef9e7', border: '1px solid #f0c040', marginBottom: 16 }}>
                  <span style={{ fontSize: 14 }}>📋</span>
                  <div style={{ fontSize: 12, color: '#854f0b', lineHeight: 1.5 }}>
                    <strong>{justificados} ausencia{justificados !== 1 ? 's' : ''} justificada{justificados !== 1 ? 's' : ''}</strong> — no generan penalización. Recursos Humanos deberá revisar y validar el justificativo correspondiente.
                  </div>
                </div>
              )}

              {ordinarios.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 18px', background: '#f5f5f7', fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Conduccion ordinaria ({ordinarios.length}) — no cobra módulos
                  </div>
                  {ordinarios.map((r, i) => (
                    <div key={r.agente_id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderTop: i === 0 ? 'none' : '0.5px solid #f5f5f7', background: r.asistencia === 'ausente' ? '#fff8f8' : r.asistencia === 'presente' ? '#f8fffc' : '#fff' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{r.nombre_completo}</div>
                        <div style={{ fontSize: 11, color: '#aeaeb2' }}>{r.legajo} · {ROL_LABELS[r.rol] || r.rol}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <BotonAsistencia estado={r.asistencia} valor="presente"    onClick={() => setAsistencia(r.agente_id, 'presente')}    bloqueado={!puedeEditar} />
                        <BotonAsistencia estado={r.asistencia} valor="ausente"     onClick={() => setAsistencia(r.agente_id, 'ausente')}     bloqueado={!puedeEditar} />
                        <BotonAsistencia estado={r.asistencia} valor="justificado" onClick={() => setAsistencia(r.agente_id, 'justificado')} bloqueado={!puedeEditar} />
                      </div>
                      <span style={{ fontSize: 11, color: '#aeaeb2', fontStyle: 'italic' }}>Servicio ordinario</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {modalCerrar && (
        <ModalCerrarServicio onConfirmar={cerrarServicio} onCancelar={() => setModalCerrar(false)} cerrando={cerrando} />
      )}
    </div>
  )
}
