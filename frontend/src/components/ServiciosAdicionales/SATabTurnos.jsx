import { useState, useEffect } from 'react'
import api from '../../lib/api'

const ROL_LABELS = {
  jefe_operativo: 'Jefe Operativo',
  coordinador:    'Coordinador',
  supervisor:     'Supervisor',
  infante:        'Infante',
  motorizado:     'Motorizado',
  chofer:         'Chofer',
}

function fmtFecha(f) {
  if (!f) return '—'
  const d = new Date(String(f).slice(0, 10) + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function fmtHora(h) {
  if (!h) return '—'
  return String(h).slice(0, 5)
}

function calcModulos(hI, hF, durHs = 4) {
  if (!hI || !hF) return 0
  const [hi, mi] = hI.split(':').map(Number)
  const [hf, mf] = hF.split(':').map(Number)
  const hs = ((hf * 60 + mf) - (hi * 60 + mi)) / 60
  if (hs <= 0) return 0
  return Math.round(hs / durHs)
}

// ── Modal nuevo turno ─────────────────────────────────────────
function ModalTurno({ onGuardar, onCancelar, initial }) {
  const [form, setForm] = useState({
    nombre:           initial?.nombre           || '',
    fecha:            initial?.fecha            || '',
    hora_inicio:      initial?.hora_inicio      ? String(initial.hora_inicio).slice(0, 5) : '',
    hora_fin:         initial?.hora_fin         ? String(initial.hora_fin).slice(0, 5)    : '',
    dotacion_agentes:      initial?.dotacion_agentes      ?? 0,
    dotacion_supervisores: initial?.dotacion_supervisores ?? 0,
    dotacion_choferes:     initial?.dotacion_choferes     ?? 0,
  })

  const mods = calcModulos(form.hora_inicio, form.hora_fin)

  const INP = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '0.5px solid #e5e5ea', background: '#f5f5f7', fontSize: 13, color: '#1d1d1f', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
  const LBL = { fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onCancelar}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744', marginBottom: 20 }}>
          {initial ? 'Editar turno' : 'Nuevo turno'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
          <div>
            <div style={LBL}>Nombre del turno</div>
            <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Turno Mañana" style={INP} />
          </div>
          <div>
            <div style={LBL}>Fecha</div>
            <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={INP} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={LBL}>Hora inicio</div>
              <input type="time" value={form.hora_inicio} onChange={e => setForm(p => ({ ...p, hora_inicio: e.target.value }))} style={INP} />
            </div>
            <div>
              <div style={LBL}>Hora fin</div>
              <input type="time" value={form.hora_fin} onChange={e => setForm(p => ({ ...p, hora_fin: e.target.value }))} style={INP} />
            </div>
          </div>

          {mods > 0 && (
            <div style={{ background: '#e8f0fe', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#185fa5', fontWeight: 600 }}>
              ⏱ {mods} módulo{mods !== 1 ? 's' : ''} ({mods * 4} hs)
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { key: 'dotacion_agentes',      label: 'Agentes' },
              { key: 'dotacion_supervisores', label: 'Supervisores' },
              { key: 'dotacion_choferes',     label: 'Choferes' },
            ].map(f => (
              <div key={f.key}>
                <div style={LBL}>{f.label}</div>
                <input type="number" min="0" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: parseInt(e.target.value) || 0 }))} style={{ ...INP, textAlign: 'center' }} />
              </div>
            ))}
          </div>

        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onCancelar} style={{ flex: 1, padding: 11, borderRadius: 12, border: 'none', background: '#f5f5f7', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button
            disabled={!form.fecha || !form.hora_inicio || !form.hora_fin}
            onClick={() => onGuardar(form)}
            style={{ flex: 2, padding: 11, borderRadius: 12, border: 'none', background: (!form.fecha || !form.hora_inicio || !form.hora_fin) ? '#e5e5ea' : '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de turno ──────────────────────────────────────────
function TurnoCard({ turno, onEditar, onEliminar }) {
  const totalDot = (turno.dotacion_agentes || 0) + (turno.dotacion_supervisores || 0) + (turno.dotacion_choferes || 0)
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '0.5px solid #e5e5ea',
      padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16,
    }}>
      {/* Fecha */}
      <div style={{ width: 60, flexShrink: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1a2744', lineHeight: 1 }}>
          {String(turno.fecha).slice(8, 10)}
        </div>
        <div style={{ fontSize: 11, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {new Date(String(turno.fecha).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR', { month: 'short' })}
        </div>
        <div style={{ fontSize: 10, color: '#aeaeb2' }}>
          {new Date(String(turno.fecha).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short' })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 50, background: '#e5e5ea', flexShrink: 0 }} />

      {/* Nombre + horario + módulos */}
      <div style={{ flex: 1 }}>
        {turno.nombre && (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', marginBottom: 2 }}>{turno.nombre}</div>
        )}
        <div style={{ fontSize: turno.nombre ? 13 : 16, fontWeight: turno.nombre ? 400 : 700, color: turno.nombre ? '#636366' : '#1a2744' }}>
          {fmtHora(turno.hora_inicio)} – {fmtHora(turno.hora_fin)}
        </div>
        {turno.modulos > 0 && (
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#e8f0fe', color: '#185fa5' }}>
              {turno.modulos} mód.
            </span>
          </div>
        )}
      </div>

      {/* Dotación */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>{totalDot} personas</div>
        <div style={{ fontSize: 11, color: '#aeaeb2' }}>
          {[
            turno.dotacion_agentes      > 0 ? turno.dotacion_agentes      + ' ag.'  : null,
            turno.dotacion_supervisores  > 0 ? turno.dotacion_supervisores + ' sup.' : null,
            turno.dotacion_choferes      > 0 ? turno.dotacion_choferes     + ' ch.'  : null,
          ].filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 6, justifyContent: 'flex-end' }}>
          {turno.total_confirmados > 0 && (
            <span style={{ fontSize: 10, color: '#0f6e56', fontWeight: 700 }}>✓ {turno.total_confirmados}</span>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <button onClick={() => onEditar(turno)}
          style={{ padding: '5px 10px', borderRadius: 7, border: '0.5px solid #e5e5ea', background: '#fff', fontSize: 11, color: '#636366', cursor: 'pointer' }}>
          Editar
        </button>
        <button onClick={() => onEliminar(turno.id)}
          style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#fff0f0', fontSize: 11, color: '#c0392b', cursor: 'pointer' }}>
          Quitar
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function SATabTurnos({ servicioId, onTurnoSelect }) {
  const [turnos,   setTurnos]   = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal,    setModal]    = useState(null) // null | 'nuevo' | turno (para editar)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      const data = await api.get('/api/servicios-adicionales/' + servicioId + '/turnos')
      setTurnos(data)
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  async function guardarTurno(form) {
    try {
      if (modal?.id) {
        await api.put('/api/servicios-adicionales/' + servicioId + '/turnos/' + modal.id, form)
      } else {
        await api.post('/api/servicios-adicionales/' + servicioId + '/turnos', form)
      }
      setModal(null)
      await cargar()
    } catch (e) { alert(e.message) }
  }

  async function eliminarTurno(id) {
    if (!confirm('¿Eliminar este turno? Se eliminará también su organigrama y presentismo.')) return
    try {
      await api.delete('/api/servicios-adicionales/' + servicioId + '/turnos/' + id)
      setTurnos(prev => prev.filter(t => t.id !== id))
    } catch (e) { alert(e.message) }
  }

  // Agrupar por fecha
  const porFecha = turnos.reduce((acc, t) => {
    const f = String(t.fecha).slice(0, 10)
    if (!acc[f]) acc[f] = []
    acc[f].push(t)
    return acc
  }, {})

  const totalModulos = turnos.reduce((acc, t) => acc + (t.modulos || 0), 0)
  const totalPersonas = turnos.reduce((acc, t) => acc + (t.dotacion_agentes || 0) + (t.dotacion_supervisores || 0) + (t.dotacion_choferes || 0), 0)

  return (
    <div style={{ padding: '24px 44px' }}>

      {/* Header + botón */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2744' }}>Turnos de convocatoria</div>
          {turnos.length > 0 && (
            <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>
              {turnos.length} turno{turnos.length !== 1 ? 's' : ''} · {totalPersonas} personas · {totalModulos} módulos totales
            </div>
          )}
        </div>
        <button onClick={() => setModal('nuevo')}
          style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Agregar turno
        </button>
      </div>

      {cargando ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#aeaeb2', fontSize: 14 }}>Cargando...</div>
      ) : turnos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🕐</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: 6 }}>Sin turnos definidos</div>
          <div style={{ fontSize: 13, color: '#aeaeb2', marginBottom: 20 }}>
            Definí los turnos del servicio. Cada turno tiene su propia dotación y organigrama.
          </div>
          <button onClick={() => setModal('nuevo')}
            style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Agregar primer turno
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(porFecha).map(([fecha, turnosDia]) => (
            <div key={fecha}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                {fmtFecha(fecha)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {turnosDia.map(t => (
                  <div key={t.id}>
                    <TurnoCard
                      turno={t}
                      onEditar={(turno) => setModal(turno)}
                      onEliminar={eliminarTurno}
                    />
                    {onTurnoSelect && (
                      <button
                        onClick={() => onTurnoSelect(t)}
                        style={{ width: '100%', marginTop: 4, padding: '6px', borderRadius: '0 0 10px 10px', border: '0.5px solid #e5e5ea', borderTop: 'none', background: '#f5f5f7', color: '#185fa5', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Ver organigrama y presentismo →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ModalTurno
          initial={modal === 'nuevo' ? null : modal}
          onGuardar={guardarTurno}
          onCancelar={() => setModal(null)}
        />
      )}
    </div>
  )
}
