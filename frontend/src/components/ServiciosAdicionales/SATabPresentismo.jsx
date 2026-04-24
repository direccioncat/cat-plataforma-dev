import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../lib/api'
import { ROLES_OPERATIVOS } from '../../lib/rolesOperativos'

const ROL_LABELS = Object.fromEntries(Object.entries(ROLES_OPERATIVOS).map(([k, v]) => [k, v.label]))

function fmtHora(h) { return h ? String(h).slice(0, 5) : '' }
function fmtFecha(f) {
  if (!f) return ''
  const d = new Date(String(f).slice(0, 10) + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function ModalCerrarServicio({ onConfirmar, onCancelar, cerrando }) {
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onCancelar}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 32, width: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1a2744', textAlign: 'center', marginBottom: 8 }}>
          Presentismo completo
        </div>
        <div style={{ fontSize: 14, color: '#636366', textAlign: 'center', lineHeight: 1.6, marginBottom: 28 }}>
          Todos los turnos tienen el presentismo cargado.<br/>
          ¿Querés dar por finalizado el servicio?
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancelar}
            style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: '#f5f5f7', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Ahora no
          </button>
          <button onClick={onConfirmar} disabled={cerrando}
            style={{ flex: 2, padding: '11px', borderRadius: 12, border: 'none', background: '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: cerrando ? 'not-allowed' : 'pointer', opacity: cerrando ? 0.6 : 1 }}>
            {cerrando ? 'Cerrando...' : 'Sí, cerrar servicio'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function SelectorTurno({ turnos, turnoActivo, onCambiar }) {
  if (!turnos.length) return (
    <div style={{ padding: '20px 44px', color: '#aeaeb2', fontSize: 14 }}>
      No hay turnos definidos.
    </div>
  )
  return (
    <div style={{ padding: '16px 44px 0', borderBottom: '0.5px solid #e5e5ea', background: '#fff', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#aeaeb2', marginRight: 4 }}>Turno:</span>
      {turnos.map(t => (
        <button key={t.id} onClick={() => onCambiar(t)}
          style={{
            padding: '6px 14px', borderRadius: 8,
            border: '1.5px solid ' + (turnoActivo?.id === t.id ? '#1a2744' : '#e5e5ea'),
            background: turnoActivo?.id === t.id ? '#1a2744' : '#fff',
            color: turnoActivo?.id === t.id ? '#fff' : '#636366',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 8,
          }}>
          {fmtFecha(t.fecha)} · {fmtHora(t.hora_inicio)}-{fmtHora(t.hora_fin)}
        </button>
      ))}
    </div>
  )
}

export default function SATabPresentismo({ servicioId, turnoActivo, onCambiarTurno, onServicioCerrado }) {
  const [turnos,    setTurnos]    = useState([])
  const [registros, setRegistros] = useState([])
  const [cargando,  setCargando]  = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado,  setGuardado]  = useState(false)
  const [modalCerrar, setModalCerrar] = useState(false)
  const [cerrando,    setCerrando]    = useState(false)

  useEffect(() => {
    api.get('/api/servicios-adicionales/' + servicioId + '/turnos')
      .then(data => {
        setTurnos(data)
        if (!turnoActivo && data.length > 0) onCambiarTurno(data[0])
      })
      .catch(console.error)
  }, [servicioId])

  useEffect(() => {
    if (!turnoActivo) return
    cargar()
  }, [turnoActivo?.id])

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
        presente:            r.presente ?? null,
        modulos_acreditados: r.modulos_default ?? turnoActivo.modulos ?? 0,
      })))
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  function togglePresente(agenteId, valor) {
    setRegistros(prev => prev.map(r => r.agente_id === agenteId ? { ...r, presente: valor } : r))
    setGuardado(false)
  }

  async function verificarTodosCompletos() {
    // Verificar todos los turnos del servicio
    try {
      const checks = await Promise.all(
        turnos.map(t =>
          api.get('/api/servicios-adicionales/' + servicioId + '/turnos/' + t.id + '/presentismo')
        )
      )
      // Todos completos = ningún agente sin marcar en ningún turno
      return checks.every(lista =>
        lista.filter(r => r.tipo_convocatoria !== 'ordinario').every(r => r.presente !== null)
      )
    } catch { return false }
  }

  async function guardar() {
    const sinReg = registros.filter(r => r.presente === null && r.tipo_convocatoria !== 'ordinario')
    if (sinReg.length > 0) {
      if (!confirm(sinReg.length + ' agentes sin marcar. ¿Guardar igual?')) return
    }
    setGuardando(true)
    try {
      const payload = registros
        .filter(r => r.presente !== null)
        .map(r => ({
          agente_id:           r.agente_id,
          presente:            r.presente,
          modulos_acreditados: r.tipo_convocatoria === 'ordinario' ? 0 : (r.presente ? r.modulos_acreditados : 0),
        }))
      const res = await api.post('/api/servicios-adicionales/' + servicioId + '/turnos/' + turnoActivo.id + '/presentismo', { registros: payload })
      setGuardado(true)
      if (res.alertas?.length > 0) {
        alert('Atencion: ' + res.alertas.map(a => a.mensaje).join('\n'))
      }
      // Verificar si todos los turnos están completos
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

  const adicionales = registros.filter(r => r.tipo_convocatoria !== 'ordinario')
  const ordinarios  = registros.filter(r => r.tipo_convocatoria === 'ordinario')
  const presentes   = adicionales.filter(r => r.presente === true).length
  const ausentes    = adicionales.filter(r => r.presente === false).length
  const sinMarcar   = adicionales.filter(r => r.presente === null).length
  const totalMods   = adicionales.filter(r => r.presente).reduce((acc, r) => acc + (r.modulos_acreditados || 0), 0)

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

          {/* Resumen */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'Presentes',  valor: presentes,  color: '#0f6e56', bg: '#e8faf2' },
              { label: 'Ausentes',   valor: ausentes,   color: '#c0392b', bg: '#fff0f0' },
              { label: 'Sin marcar', valor: sinMarcar,  color: '#854f0b', bg: '#fef9e7' },
              { label: 'Total mod.', valor: totalMods,  color: '#185fa5', bg: '#e8f0fe' },
            ].map(r => (
              <div key={r.label} style={{ background: r.bg, borderRadius: 12, padding: '10px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: r.color }}>{r.valor}</div>
                <div style={{ fontSize: 11, color: r.color, marginTop: 2, opacity: 0.8 }}>{r.label}</div>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            {guardado && <span style={{ fontSize: 13, color: '#0f6e56', fontWeight: 600 }}>✓ Guardado</span>}
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: guardando ? '#aeaeb2' : '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer' }}>
              {guardando ? 'Guardando...' : 'Guardar presentismo'}
            </button>
          </div>

          {cargando ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#aeaeb2' }}>Cargando...</div>
          ) : registros.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#aeaeb2' }}>
              Sin agentes confirmados en este turno.
            </div>
          ) : (
            <>
              {adicionales.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '12px 18px', background: '#f5f5f7', fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Convocados adicional ({adicionales.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 180px 100px', padding: '10px 18px', background: '#fafafa', fontSize: 11, fontWeight: 700, color: '#aeaeb2', borderBottom: '0.5px solid #f5f5f7' }}>
                    <span>Agente</span><span>Rol</span><span>Presente</span><span>Modulos</span>
                  </div>
                  {adicionales.map((r, i) => (
                    <div key={r.agente_id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 90px 180px 100px',
                      padding: '12px 18px', alignItems: 'center',
                      borderTop: i === 0 ? 'none' : '0.5px solid #f5f5f7',
                      background: r.presente === false ? '#fff8f8' : r.presente === true ? '#f8fffc' : '#fff',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{r.nombre_completo}</div>
                        <div style={{ fontSize: 11, color: '#aeaeb2' }}>{r.legajo}</div>
                      </div>
                      <span style={{ fontSize: 11, color: '#636366' }}>{ROL_LABELS[r.rol] || r.rol}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => togglePresente(r.agente_id, true)}
                          style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: r.presente === true ? '#0f6e56' : '#f5f5f7', color: r.presente === true ? '#fff' : '#636366', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          Presente
                        </button>
                        <button onClick={() => togglePresente(r.agente_id, false)}
                          style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: r.presente === false ? '#c0392b' : '#f5f5f7', color: r.presente === false ? '#fff' : '#636366', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          Ausente
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: r.presente === false || r.presente === null ? '#c7c7cc' : '#1a2744' }}>
                          {r.presente === false || r.presente === null ? '-' : r.modulos_acreditados}
                        </span>
                        {r.presente === true && <span style={{ fontSize: 11, color: '#aeaeb2' }}>mod.</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {ordinarios.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 18px', background: '#f5f5f7', fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Conduccion ordinaria ({ordinarios.length}) — no cobra modulos
                  </div>
                  {ordinarios.map((r, i) => (
                    <div key={r.agente_id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderTop: i === 0 ? 'none' : '0.5px solid #f5f5f7', background: r.presente === false ? '#fff8f8' : r.presente === true ? '#f8fffc' : '#fff' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{r.nombre_completo}</div>
                        <div style={{ fontSize: 11, color: '#aeaeb2' }}>{r.legajo} · {ROL_LABELS[r.rol] || r.rol}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => togglePresente(r.agente_id, true)}
                          style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: r.presente === true ? '#0f6e56' : '#f5f5f7', color: r.presente === true ? '#fff' : '#636366', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          Presente
                        </button>
                        <button onClick={() => togglePresente(r.agente_id, false)}
                          style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: r.presente === false ? '#c0392b' : '#f5f5f7', color: r.presente === false ? '#fff' : '#636366', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          Ausente
                        </button>
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
        <ModalCerrarServicio
          onConfirmar={cerrarServicio}
          onCancelar={() => setModalCerrar(false)}
          cerrando={cerrando}
        />
      )}
    </div>
  )
}
