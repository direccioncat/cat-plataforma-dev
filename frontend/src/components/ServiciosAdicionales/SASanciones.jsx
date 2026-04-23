import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import api from '../../lib/api'

function fmtFecha(f) {
  if (!f) return '-'
  return new Date(String(f).slice(0, 10) + 'T12:00:00')
    .toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function diasRestantes(fechaFin) {
  const hoy  = new Date(); hoy.setHours(0,0,0,0)
  const fin  = new Date(String(fechaFin).slice(0,10) + 'T12:00:00')
  const diff = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24))
  return diff
}

// ── Modal nueva/editar sanción ────────────────────────────────
function ModalSancion({ initial, onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    agente_id:     initial?.agente_id     || '',
    agente_nombre: initial?.agente_nombre || '',
    motivo:        initial?.motivo        || '',
    propuesto_por: initial?.propuesto_por || '',
    prop_nombre:   initial?.propuesto_por_nombre || '',
    fecha_inicio:  initial?.fecha_inicio ? new Date(initial.fecha_inicio).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
    fecha_fin:     initial?.fecha_fin    ? new Date(initial.fecha_fin).toISOString().slice(0,10) : '',
  })
  const [busqAgente, setBusqAgente]   = useState(initial?.agente_nombre || '')
  const [resAgente,  setResAgente]    = useState([])
  const [busqProp,   setBusqProp]     = useState(initial?.propuesto_por_nombre || '')
  const [resProp,    setResProp]      = useState([])
  const [guardando,  setGuardando]    = useState(false)

  async function buscar(q, setter) {
    if (q.length < 2) { setter([]); return }
    try {
      const data = await api.get(`/api/profiles?busq=${encodeURIComponent(q)}&limit=6`)
      setter(Array.isArray(data) ? data : (data.profiles || []))
    } catch { setter([]) }
  }

  async function guardar() {
    if (!initial && !form.agente_id) { alert('Seleccioná un agente'); return }
    if (!form.motivo || !form.fecha_inicio || !form.fecha_fin) {
      alert('Completá todos los campos obligatorios')
      return
    }
    setGuardando(true)
    try {
      await onGuardar({
        agente_id:    form.agente_id,
        motivo:       form.motivo,
        propuesto_por: form.propuesto_por || null,
        fecha_inicio: form.fecha_inicio,
        fecha_fin:    form.fecha_fin,
      })
    } finally { setGuardando(false) }
  }

  const INP = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '0.5px solid #e5e5ea', background: '#f5f5f7', fontSize: 13, color: '#1d1d1f', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
  const LBL = { fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onCancelar}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744', marginBottom: 22 }}>
          {initial ? 'Editar sanción' : 'Nueva sanción disciplinaria'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Agente */}
          <div>
            <label style={LBL}>Agente *</label>
            {initial ? (
              <div style={{ ...INP, background: '#f0f0f5', color: '#636366', cursor: 'default' }}>
                {form.agente_nombre || 'Agente'}
              </div>
            ) : (
            <div style={{ position: 'relative' }}>
              <input value={busqAgente}
                onChange={e => { setBusqAgente(e.target.value); buscar(e.target.value, setResAgente) }}
                placeholder="Buscar por nombre o legajo..."
                style={INP} />
              {resAgente.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '0.5px solid #e5e5ea', borderRadius: 10, zIndex: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', marginTop: 4, overflow: 'hidden' }}>
                  {resAgente.map(a => (
                    <div key={a.id} onClick={() => { setForm(p => ({ ...p, agente_id: a.id, agente_nombre: a.nombre_completo })); setBusqAgente(a.nombre_completo); setResAgente([]) }}
                      style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', borderBottom: '0.5px solid #f5f5f7' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f5f7'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <span style={{ fontWeight: 600 }}>{a.nombre_completo}</span>
                      <span style={{ color: '#aeaeb2' }}>{a.legajo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
            {!initial && form.agente_id && <div style={{ fontSize: 11, color: '#0f6e56', marginTop: 4 }}>Seleccionado: {form.agente_nombre}</div>}
          </div>

          {/* Motivo */}
          <div>
            <label style={LBL}>Motivo *</label>
            <textarea value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))}
              placeholder="Describí el motivo de la sanción..."
              rows={3} style={{ ...INP, resize: 'vertical' }} />
          </div>

          {/* Propuesto por */}
          <div>
            <label style={LBL}>Propuesto por</label>
            <div style={{ position: 'relative' }}>
              <input value={busqProp}
                onChange={e => { setBusqProp(e.target.value); buscar(e.target.value, setResProp) }}
                placeholder="Buscar jefe operativo..."
                style={INP} />
              {resProp.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '0.5px solid #e5e5ea', borderRadius: 10, zIndex: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', marginTop: 4, overflow: 'hidden' }}>
                  {resProp.map(a => (
                    <div key={a.id} onClick={() => { setForm(p => ({ ...p, propuesto_por: a.id, prop_nombre: a.nombre_completo })); setBusqProp(a.nombre_completo); setResProp([]) }}
                      style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', borderBottom: '0.5px solid #f5f5f7' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f5f7'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <span style={{ fontWeight: 600 }}>{a.nombre_completo}</span>
                      <span style={{ color: '#aeaeb2' }}>{a.legajo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LBL}>Fecha inicio *</label>
              <input type="date" value={form.fecha_inicio}
                onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))}
                style={INP} />
            </div>
            <div>
              <label style={LBL}>Fecha fin *</label>
              <input type="date" value={form.fecha_fin}
                onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))}
                style={INP} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onCancelar}
            style={{ flex: 1, padding: 11, borderRadius: 12, border: 'none', background: '#f5f5f7', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando}
            style={{ flex: 2, padding: 11, borderRadius: 12, border: 'none', background: guardando ? '#aeaeb2' : '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer' }}>
            {guardando ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear sanción'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Componente principal ──────────────────────────────────────
export default function SASanciones() {
  const [sanciones, setSanciones] = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [filtro,    setFiltro]    = useState('activas') // 'activas' | 'vencidas' | 'todas'
  const [busq,      setBusq]      = useState('')
  const [modal,     setModal]     = useState(null) // null | 'nueva' | sancion
  const [eliminando, setEliminando] = useState(null)

  useEffect(() => { cargar() }, [filtro, busq])

  async function cargar() {
    setCargando(true)
    try {
      const params = new URLSearchParams()
      if (filtro === 'activas')  params.set('activas', 'true')
      if (filtro === 'vencidas') params.set('activas', 'false')
      if (busq) params.set('busq', busq)
      const data = await api.get(`/api/sanciones?${params}`)
      setSanciones(data)
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  async function guardar(form) {
    try {
      if (modal?.id) {
        await api.put(`/api/sanciones/${modal.id}`, form)
      } else {
        await api.post('/api/sanciones', form)
      }
      setModal(null)
      await cargar()
    } catch (e) { alert(e.message) }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta sanción?')) return
    setEliminando(id)
    try {
      await api.delete(`/api/sanciones/${id}`)
      setSanciones(prev => prev.filter(s => s.id !== id))
    } catch (e) { alert(e.message) }
    finally { setEliminando(null) }
  }

  return (
    <div style={{ padding: '24px 44px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744' }}>Sanciones disciplinarias</div>
          <div style={{ fontSize: 13, color: '#8e8e93', marginTop: 2 }}>
            Los agentes sancionados no pueden participar en servicios adicionales durante el período vigente.
          </div>
        </div>
        <button onClick={() => setModal('nueva')}
          style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Nueva sanción
        </button>
      </div>

      {/* Filtros + búsqueda */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { key: 'activas',  label: 'Activas' },
          { key: 'vencidas', label: 'Vencidas' },
          { key: 'todas',    label: 'Todas' },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: filtro === f.key ? '#1a2744' : '#f0f0f5',
              color:      filtro === f.key ? '#fff'    : '#636366',
            }}>
            {f.label}
          </button>
        ))}
        <input value={busq} onChange={e => setBusq(e.target.value)}
          placeholder="Buscar agente..."
          style={{ padding: '7px 12px', borderRadius: 10, border: '0.5px solid #e5e5ea', fontSize: 13, outline: 'none', background: '#fff', marginLeft: 8, width: 200 }} />
      </div>

      {/* Tabla */}
      {cargando ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#aeaeb2' }}>Cargando...</div>
      ) : sanciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>
            {filtro === 'activas' ? 'Sin sanciones activas' : 'Sin sanciones'}
          </div>
          <div style={{ fontSize: 13, color: '#aeaeb2' }}>
            {filtro === 'activas' ? 'No hay agentes sancionados en este momento.' : ''}
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 140px 80px',
            padding: '10px 18px', background: '#f5f5f7',
            fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <span>Agente</span>
            <span>Motivo</span>
            <span>Inicio</span>
            <span>Vencimiento</span>
            <span>Estado</span>
            <span></span>
          </div>

          {sanciones.map((s, i) => {
            const activa = s.activa === true || s.activa === 't' || s.activa === 'true'
            const dias   = diasRestantes(s.fecha_fin)

            return (
              <div key={s.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 140px 80px',
                padding: '13px 18px', alignItems: 'center',
                borderTop: i === 0 ? 'none' : '0.5px solid #f5f5f7',
                background: activa ? '#fff' : '#fafafa',
                opacity: activa ? 1 : 0.65,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{s.agente_nombre}</div>
                  <div style={{ fontSize: 11, color: '#aeaeb2' }}>
                    {s.agente_legajo}{s.agente_base ? ` · ${s.agente_base}` : ''}
                  </div>
                  {s.propuesto_por_nombre && (
                    <div style={{ fontSize: 10, color: '#aeaeb2', marginTop: 2 }}>
                      Propuesto por: {s.propuesto_por_nombre}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 12, color: '#3a3a3c', lineHeight: 1.4, paddingRight: 12 }}>
                  {s.motivo}
                </div>

                <span style={{ fontSize: 12, color: '#636366' }}>{fmtFecha(s.fecha_inicio)}</span>

                <span style={{ fontSize: 12, color: activa ? '#c0392b' : '#aeaeb2', fontWeight: activa ? 600 : 400 }}>
                  {fmtFecha(s.fecha_fin)}
                </span>

                <div>
                  {activa ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: '#fff0f0' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c0392b' }}/>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#c0392b' }}>
                        {dias === 0 ? 'Vence hoy' : dias === 1 ? '1 día restante' : `${dias} días`}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: '#f5f5f7' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#aeaeb2' }}/>
                      <span style={{ fontSize: 11, color: '#aeaeb2' }}>Vencida</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button onClick={() => setModal(s)}
                    style={{ padding: '5px 10px', borderRadius: 7, border: '0.5px solid #e5e5ea', background: '#fff', fontSize: 11, color: '#636366', cursor: 'pointer' }}>
                    Editar
                  </button>
                  <button onClick={() => eliminar(s.id)} disabled={eliminando === s.id}
                    style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#fff0f0', fontSize: 11, color: '#c0392b', cursor: 'pointer', opacity: eliminando === s.id ? 0.5 : 1 }}>
                    Quitar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <ModalSancion
          initial={modal === 'nueva' ? null : modal}
          onGuardar={guardar}
          onCancelar={() => setModal(null)}
        />
      )}
    </div>
  )
}
