import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function fmtHora(h) { return h ? String(h).slice(0, 5) : '' }
function fmtFecha(f) {
  if (!f) return null
  return new Date(String(f).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function PostularPage() {
  const { token } = useParams()
  const [info, setInfo] = useState(null)
  const [estado, setEstado] = useState('cargando') // cargando | formulario | enviando | exito | error | inactiva
  const [errorMsg, setErrorMsg] = useState('')
  const [exitoNombre, setExitoNombre] = useState('')

  const [legajo, setLegajo] = useState('')
  const [rol, setRol] = useState('')
  const [turnosSeleccionados, setTurnosSeleccionados] = useState([])
  const [todosLosTurnos, setTodosLosTurnos] = useState(false)

  useEffect(() => {
    fetch(API + '/api/postular/' + token)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setEstado('inactiva'); setErrorMsg(d.error); return }
        setInfo(d)
        setEstado('formulario')
      })
      .catch(() => { setEstado('error'); setErrorMsg('No se pudo cargar la convocatoria') })
  }, [token])

  function toggleTurno(id) {
    setTurnosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  async function enviar(e) {
    e.preventDefault()
    if (!legajo.trim()) return setErrorMsg('Ingresá tu legajo')
    if (!rol) return setErrorMsg('Seleccioná un rol')
    if (!todosLosTurnos && turnosSeleccionados.length === 0) return setErrorMsg('Seleccioná al menos un turno')
    setErrorMsg('')
    setEstado('enviando')
    try {
      const r = await fetch(API + '/api/postular/' + token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legajo: legajo.trim(), rol_solicitado: rol, turno_ids: turnosSeleccionados, todos_los_turnos: todosLosTurnos }),
      })
      const d = await r.json()
      if (!r.ok) { setEstado('formulario'); setErrorMsg(d.error || 'Error al enviar'); return }
      setExitoNombre(d.nombre_completo)
      setEstado('exito')
    } catch { setEstado('formulario'); setErrorMsg('Error de conexión') }
  }

  const INP = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e5e5ea', background: '#f9f9fb', fontSize: 15, color: '#1d1d1f', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }
  const LBL = { fontSize: 12, fontWeight: 700, color: '#636366', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #1a2744 0%, #243561 40%, #f5f5f7 40%)', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '40px 16px 60px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, paddingLeft: 4 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Dirección General · CAT · GCBA</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            {estado === 'cargando' ? 'Cargando...' : (info?.servicio_nombre || 'Convocatoria')}
          </div>
          {info?.base_nombre && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>{info.base_nombre}</div>}
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 8px 40px rgba(26,39,68,0.18)', overflow: 'hidden' }}>

          {estado === 'cargando' && (
            <div style={{ padding: 48, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Cargando convocatoria...</div>
          )}

          {(estado === 'inactiva' || estado === 'error') && (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>Convocatoria no disponible</div>
              <div style={{ fontSize: 13, color: '#8e8e93' }}>{errorMsg}</div>
            </div>
          )}

          {estado === 'exito' && (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1a2744', marginBottom: 8 }}>¡Postulación enviada!</div>
              <div style={{ fontSize: 14, color: '#636366', marginBottom: 4 }}>Hola, <strong>{exitoNombre}</strong></div>
              <div style={{ fontSize: 13, color: '#8e8e93', lineHeight: 1.6 }}>Tu postulación fue registrada correctamente. El operador la revisará próximamente.</div>
            </div>
          )}

          {(estado === 'formulario' || estado === 'enviando') && info && (
            <form onSubmit={enviar}>
              {/* Banner del servicio */}
              <div style={{ background: 'linear-gradient(135deg, #1a2744, #243561)', padding: '20px 24px' }}>
                <div style={{ display: 'inline-block', background: 'rgba(245,200,0,0.15)', border: '1px solid rgba(245,200,0,0.3)', borderRadius: 6, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#f5c800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Formulario de postulación</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{info.servicio_nombre}</div>
                {info.vence_en && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                    Cierra el {new Date(info.vence_en).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              <div style={{ padding: '24px 24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Legajo */}
                <div>
                  <label style={LBL}>Tu legajo</label>
                  <input
                    value={legajo}
                    onChange={e => setLegajo(e.target.value)}
                    placeholder="Ej: 04001"
                    style={INP}
                    onFocus={e => e.target.style.borderColor = '#1a2744'}
                    onBlur={e => e.target.style.borderColor = '#e5e5ea'}
                  />
                </div>

                {/* Rol */}
                <div>
                  <label style={LBL}>Rol con el que te postulás</label>
                  <select value={rol} onChange={e => setRol(e.target.value)}
                    style={{ ...INP, color: rol ? '#1d1d1f' : '#aeaeb2' }}>
                    <option value="">Seleccioná un rol...</option>
                    {info.roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                {/* Turnos */}
                {info.turnos.length > 0 && (
                  <div>
                    <label style={LBL}>Turnos disponibles</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                      {/* Todos los turnos */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${todosLosTurnos ? '#1a2744' : '#e5e5ea'}`, background: todosLosTurnos ? '#f0f4ff' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${todosLosTurnos ? '#1a2744' : '#c7c7cc'}`, background: todosLosTurnos ? '#1a2744' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                          {todosLosTurnos && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>Disponible para todos los turnos</div>
                          <div style={{ fontSize: 11, color: '#8e8e93' }}>Me postulo sin preferencia de horario</div>
                        </div>
                        <input type="checkbox" checked={todosLosTurnos} onChange={e => { setTodosLosTurnos(e.target.checked); setTurnosSeleccionados([]) }} style={{ display: 'none' }} />
                      </label>

                      {!todosLosTurnos && info.turnos.map(t => {
                        const sel = turnosSeleccionados.includes(t.id)
                        const horaStr = t.hora_inicio ? fmtHora(t.hora_inicio) + ' – ' + fmtHora(t.hora_fin) + ' hs' : null
                        const fechaStr = fmtFecha(t.fecha)
                        return (
                          <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${sel ? '#1a2744' : '#e5e5ea'}`, background: sel ? '#f0f4ff' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${sel ? '#1a2744' : '#c7c7cc'}`, background: sel ? '#1a2744' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                              {sel && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{t.nombre || ('Turno ' + (info.turnos.indexOf(t) + 1))}</div>
                              {(fechaStr || horaStr) && <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 1 }}>{[fechaStr, horaStr].filter(Boolean).join(' · ')}</div>}
                            </div>
                            <input type="checkbox" checked={sel} onChange={() => toggleTurno(t.id)} style={{ display: 'none' }} />
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div style={{ background: '#FCEBEB', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#A32D2D', fontWeight: 500 }}>
                    {errorMsg}
                  </div>
                )}

                <button type="submit" disabled={estado === 'enviando'}
                  style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: estado === 'enviando' ? '#aeaeb2' : '#1a2744', color: '#fff', fontSize: 15, fontWeight: 700, cursor: estado === 'enviando' ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
                  {estado === 'enviando' ? 'Enviando...' : 'Confirmar postulación'}
                </button>

                <div style={{ fontSize: 11, color: '#c7c7cc', textAlign: 'center', lineHeight: 1.5 }}>
                  Usá tu legajo institucional. Solo podés postularte una vez por servicio.
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
