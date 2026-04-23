import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../lib/api'
import logoCat from '../../assets/logo-cat.png'

// Convierte el logo a base64 blanco una sola vez
async function generarLogoBlanco() {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, c.width, c.height)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3]
        // Pixel oscuro (parte del logo) o no transparente → blanco
        // Pixel claro (fondo blanco) → transparente
        const luminancia = (r * 0.299 + g * 0.587 + b * 0.114)
        if (luminancia > 200 && a > 200) {
          // Fondo blanco → transparente
          d[i+3] = 0
        } else if (a > 10) {
          // Logo oscuro → blanco
          d[i] = 255; d[i+1] = 255; d[i+2] = 255; d[i+3] = 255
        }
      }
      ctx.putImageData(imageData, 0, 0)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = logoCat
  })
}

function fmtFecha(f) {
  if (!f) return null
  const d = new Date(String(f).slice(0, 10) + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtFechasCortas(fechas) {
  if (!fechas?.length) return null
  const fmt = f => {
    const d = new Date(String(f).slice(0, 10) + 'T12:00:00')
    return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
  }
  if (fechas.length === 1) return fmt(fechas[0])
  if (fechas.length === 2) return fmt(fechas[0]) + ' y ' + fmt(fechas[1])
  return fechas.map(fmt).join(' · ')
}
function fmtHora(h) {
  if (!h) return null
  return String(h).slice(0, 5)
}

// Calcula dotación total sumando todos los turnos
function calcDotacion(turnos, campo) {
  return (turnos || []).reduce((acc, t) => acc + (t[campo] || 0), 0)
}

// Genera la franja horaria del adicional para mostrar como restricción
function generarFranjaRestriccion(turnos) {
  if (!turnos || turnos.length === 0) return null
  const franjas = turnos.map(t => {
    const dia    = t.fecha ? new Date(String(t.fecha).slice(0,10) + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long' }) : null
    const desde  = fmtHora(t.hora_inicio)
    const hasta  = fmtHora(t.hora_fin)
    const hora   = [desde, hasta].filter(Boolean).join(' – ') + (desde ? ' hs' : '')
    if (dia && hora) return dia + ' ' + hora
    if (hora) return hora
    return t.nombre || null
  }).filter(Boolean)
  if (franjas.length === 0) return null
  if (franjas.length === 1) return franjas[0]
  return franjas.join(' · ')
}

// ── InfoChip ──────────────────────────────────────────────────
function InfoChip({ icon, label, valor, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: color || '#1d1d1f', lineHeight: 1.3 }}>{valor}</div>
      </div>
    </div>
  )
}

// ── Flyer preview ─────────────────────────────────────────────
function FlyerPreview({ datos, turnos, logoBlancoB64 }) {
  const d = datos
  const fechasStr   = fmtFechasCortas(d.fechas)

  // Dotación: suma de turnos si existen, fallback a OS
  const dotAgentes  = calcDotacion(turnos, 'dotacion_agentes')
  const dotSuperv   = calcDotacion(turnos, 'dotacion_supervisores')
  const dotChoferes = calcDotacion(turnos, 'dotacion_choferes')
  const dotMotor    = calcDotacion(turnos, 'dotacion_motorizados')
  const dotTotal    = dotAgentes + dotSuperv + dotChoferes + dotMotor
    || (d.dotacion_agentes||0) + (d.dotacion_supervisores||0) + (d.dotacion_motorizados||0)

  const dotDetalle = [
    dotAgentes     > 0 ? dotAgentes     + ' infantes'     : null,
    dotSuperv      > 0 ? dotSuperv      + ' supervisores' : null,
    dotChoferes    > 0 ? dotChoferes    + ' choferes'     : null,
    dotMotor       > 0 ? dotMotor       + ' motorizados'  : null,
  ].filter(Boolean).join(' · ')

  const franjaRestriccion = generarFranjaRestriccion(turnos)

  return (
    <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#fff', borderRadius: 24, boxShadow: '0 8px 40px rgba(26,39,68,0.18)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a2744 0%, #243561 100%)', padding: '28px 24px 22px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(245,200,0,0.08)' }}/>
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(78,205,196,0.1)' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, position: 'relative' }}>
          <img src={logoBlancoB64 || logoCat} alt="CAT" style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }}/>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1 }}>Dirección General</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Cuerpo de Agentes de Tránsito</div>
          </div>
        </div>
        <div style={{ display: 'inline-block', background: 'rgba(245,200,0,0.15)', border: '1px solid rgba(245,200,0,0.3)', borderRadius: 6, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#f5c800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, position: 'relative' }}>Convocatoria</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.5px', position: 'relative' }}>Servicio Adicional</div>
        {(d.os_nombre || d.evento_motivo) && (
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 6, position: 'relative' }}>{d.evento_motivo || d.os_nombre}</div>
        )}
      </div>

      {/* Cuerpo */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {d.ubicacion    && <InfoChip icon="📍" label="Ubicación" valor={d.ubicacion} />}
          {fechasStr      && <InfoChip icon="📅" label="Fecha"     valor={fechasStr} />}
          {dotTotal > 0   && <InfoChip icon="👥" label="Dotación"  valor={dotDetalle || dotTotal + ' personas'} />}
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg, #f5f5f7, #e5e5ea, #f5f5f7)', marginBottom: 16 }}/>

        {turnos.filter(t => t.nombre).length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Turnos disponibles</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {turnos.filter(t => t.nombre).map((t, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0f4ff', border: '1px solid #c7d4f5', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#1a2744' }}>
                  {t.nombre}
                  {t.hora_inicio && <span style={{ fontSize: 10, color: '#6b7cb5', fontWeight: 400 }}>{fmtHora(t.hora_inicio)}–{fmtHora(t.hora_fin)}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {(franjaRestriccion || turnos.length > 0) && (
          <div style={{ marginBottom: 14, background: '#fffbea', borderRadius: 10, padding: '10px 14px', border: '1px solid #f5e6a3' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#92700a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Restricción de postulación</div>
            {turnos.filter(t => t.nombre).length === 0 && franjaRestriccion && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', marginBottom: 3 }}>{franjaRestriccion}</div>
            )}
            <div style={{ fontSize: 11, color: '#8e8e93', lineHeight: 1.4 }}>Los agentes con turno ordinario en las franjas indicadas quedan excluidos de la convocatoria.</div>
          </div>
        )}

        {d.modalidad_contrato && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>Modalidad de contrato</div>
            <div style={{ fontSize: 13, color: '#3a3a3c' }}>{d.modalidad_contrato}</div>
          </div>
        )}

        {d.link_postulacion ? (
          <div style={{ background: 'linear-gradient(135deg, #1a2744, #243561)', borderRadius: 14, padding: '16px 18px', textAlign: 'center', marginTop: 4 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>
              Postulate ingresando al link{d.vigencia_link_hs ? ' (habilitado por ' + d.vigencia_link_hs + ' hs)' : ''}
            </div>
            <div style={{ fontSize: 12, color: '#f5c800', fontWeight: 700, wordBreak: 'break-all' }}>{d.link_postulacion}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>Usá tu correo institucional (@buenosaires.gob.ar)</div>
          </div>
        ) : (
          <div style={{ background: '#f5f5f7', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#aeaeb2' }}>Link de postulación pendiente de carga</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: '#f5f5f7', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: '#aeaeb2' }}>{new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.08em' }}>ADICIONALES CAT</div>
      </div>
    </div>
  )
}

// ── CampoEditable ─────────────────────────────────────────────
function CampoEditable({ label, valor, onChange, multiline, placeholder, tipo }) {
  const INP = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '0.5px solid #e5e5ea', background: '#f5f5f7', fontSize: 13, color: '#1d1d1f', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: multiline ? 'vertical' : 'none' }
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      {multiline
        ? <textarea value={valor || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={INP}/>
        : <input type={tipo || 'text'} value={valor || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={INP}/>
      }
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function SATabFlyer({ servicioId }) {
  const [datos,     setDatos]     = useState(null)
  const [turnos,    setTurnos]    = useState([])
  const [form,      setForm]      = useState({})
  const [cargando,  setCargando]  = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado,  setGuardado]  = useState(false)
  const [generando, setGenerando] = useState(false)
  const [logoBlancoB64, setLogoBlancoB64] = useState(null)
  const [convToken,  setConvToken]  = useState(null)   // { token, activo, vence_en }
  const [genToken,   setGenToken]   = useState(false)
  const [copiado,    setCopiado]    = useState(false)
  const flyerRef = useRef(null)

  useEffect(() => {
    generarLogoBlanco().then(b64 => setLogoBlancoB64(b64))
  }, [])

  useEffect(() => { cargar() }, [servicioId])

  async function cargar() {
    setCargando(true)
    try {
      const [d, t, tk] = await Promise.all([
        api.get('/api/servicios-adicionales/' + servicioId + '/flyer-data'),
        api.get('/api/servicios-adicionales/' + servicioId + '/turnos'),
        api.get('/api/servicios-adicionales/' + servicioId + '/convocatoria-token').catch(() => null),
      ])
      setConvToken(tk)
      setDatos(d)
      setTurnos(t || [])
      setForm({
        ubicacion:          d.ubicacion         || '',
        modalidad_contrato: d.modalidad_contrato || 'Todas las modalidades',
        link_postulacion:   d.link_postulacion   || '',
        vigencia_link_hs:   d.vigencia_link_hs   ?? 24,
      })
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  async function generarToken() {
    setGenToken(true)
    try {
      const tk = await api.post('/api/servicios-adicionales/' + servicioId + '/convocatoria-token', { vigencia_hs: parseInt(form.vigencia_link_hs) || null })
      setConvToken(tk)
    } catch (e) { alert(e.message) }
    finally { setGenToken(false) }
  }

  async function toggleToken() {
    try {
      const tk = await api.patch('/api/servicios-adicionales/' + servicioId + '/convocatoria-token', { activo: !convToken.activo })
      setConvToken(tk)
    } catch (e) { alert(e.message) }
  }

  function copiarLink() {
    const url = window.location.origin + '/postular/' + convToken.token
    navigator.clipboard.writeText(url).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) })
  }

  async function guardar() {
    setGuardando(true)
    try {
      const updated = await api.patch('/api/servicios-adicionales/' + servicioId + '/flyer', {
        ...form,
        vigencia_link_hs: parseInt(form.vigencia_link_hs) || 24,
      })
      setDatos(prev => ({ ...prev, ...updated }))
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    } catch (e) { alert(e.message) }
    finally { setGuardando(false) }
  }

  async function descargarImagen() {
    if (!flyerRef.current || !datos) return
    setGenerando(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const card = flyerRef.current.firstElementChild
      const canvas = await html2canvas(card, {
        scale: 3,
        useCORS: false,
        backgroundColor: null,
        logging: false,
        allowTaint: true,
      })
      const url = canvas.toDataURL('image/png')
      const a   = document.createElement('a')
      a.href = url
      a.download = 'flyer-adicional.png'
      a.click()
    } catch (e) {
      console.error(e)
      alert('Error al generar la imagen')
    } finally {
      setGenerando(false)
    }
  }

  if (cargando) return <div style={{ padding: 44, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Cargando...</div>

  const datosConForm = datos ? { ...datos, ...form } : null

  // Dotación total desde turnos
  const dotAgentes  = calcDotacion(turnos, 'dotacion_agentes')
  const dotSuperv   = calcDotacion(turnos, 'dotacion_supervisores')
  const dotChoferes = calcDotacion(turnos, 'dotacion_choferes')
  const dotMotor    = calcDotacion(turnos, 'dotacion_motorizados')
  const dotTotal    = dotAgentes + dotSuperv + dotChoferes + dotMotor
    || (datos?.dotacion_agentes||0) + (datos?.dotacion_supervisores||0) + (datos?.dotacion_motorizados||0)

  const franjaAutoRestriccion = generarFranjaRestriccion(turnos)

  return (
    <div style={{ padding: '24px 44px', display: 'grid', gridTemplateColumns: '1fr 460px', gap: 32, alignItems: 'start' }}>

      {/* Editor */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744', marginBottom: 6 }}>Datos del flyer</div>
        <div style={{ fontSize: 13, color: '#8e8e93', marginBottom: 22 }}>Los datos marcados con * se toman automáticamente de la OS y los turnos.</div>

        {/* Datos automáticos */}
        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', padding: '20px 22px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Datos automáticos *</div>
          {[
            { label: 'Servicio',      valor: datos?.evento_motivo || datos?.os_nombre || '—' },
            { label: 'Dotación',      valor: dotTotal > 0 ? dotTotal + ' personas' : '—' },
            { label: 'Restricción',   valor: franjaAutoRestriccion || (turnos.length > 0 ? turnos.length + ' turno(s)' : '—') },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid #f5f5f7' }}>
              <span style={{ fontSize: 12, color: '#aeaeb2' }}>{r.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', maxWidth: 260, textAlign: 'right' }}>{r.valor}</span>
            </div>
          ))}
        </div>

        {/* Campos editables */}
        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', padding: '20px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Campos editables</div>

          <CampoEditable label="Ubicación" valor={form.ubicacion} placeholder="Ej: Saturación Abasto" onChange={v => setForm(p => ({ ...p, ubicacion: v }))}/>

          <CampoEditable label="Modalidad de contrato" valor={form.modalidad_contrato} placeholder="Ej: Todas las modalidades" onChange={v => setForm(p => ({ ...p, modalidad_contrato: v }))}/>
          <CampoEditable label="Link de postulación" valor={form.link_postulacion} placeholder="https://forms.gle/..." tipo="url" onChange={v => setForm(p => ({ ...p, link_postulacion: v }))}/>
          <CampoEditable label="Vigencia del link (horas)" valor={String(form.vigencia_link_hs)} tipo="number" placeholder="24" onChange={v => setForm(p => ({ ...p, vigencia_link_hs: v }))}/>

          <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
            {guardado && <span style={{ fontSize: 13, color: '#0f6e56', fontWeight: 600 }}>✓ Guardado</span>}
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: guardando ? '#aeaeb2' : '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer' }}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>

        {/* Formulario de postulación */}
        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', padding: '20px 22px', marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Formulario de postulación</div>
          <div style={{ fontSize: 12, color: '#8e8e93', marginBottom: 14 }}>Generá un link público para que los agentes se postulen directamente desde la plataforma.</div>

          {!convToken ? (
            <button onClick={generarToken} disabled={genToken}
              style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: genToken ? '#aeaeb2' : '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: genToken ? 'not-allowed' : 'pointer' }}>
              {genToken ? 'Generando...' : '✦ Generar convocatoria'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Link */}
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ flex: 1, padding: '8px 12px', borderRadius: 9, background: '#f5f5f7', fontSize: 11, color: '#636366', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: '0.5px solid #e5e5ea' }}>
                  {window.location.origin}/postular/{convToken.token}
                </div>
                <button onClick={copiarLink}
                  style={{ padding: '8px 12px', borderRadius: 9, border: 'none', background: copiado ? '#0f6e56' : '#1a2744', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                  {copiado ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              {/* Estado + toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: convToken.activo ? '#0f6e56' : '#aeaeb2' }}/>
                  <span style={{ fontSize: 12, color: convToken.activo ? '#0f6e56' : '#aeaeb2', fontWeight: 600 }}>
                    {convToken.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  {convToken.vence_en && convToken.activo && (
                    <span style={{ fontSize: 11, color: '#aeaeb2' }}>
                      · vence {new Date(convToken.vence_en).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={toggleToken}
                    style={{ padding: '5px 10px', borderRadius: 7, border: '0.5px solid #e5e5ea', background: '#fff', fontSize: 11, color: convToken.activo ? '#A32D2D' : '#0f6e56', fontWeight: 600, cursor: 'pointer' }}>
                    {convToken.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={generarToken} disabled={genToken}
                    style={{ padding: '5px 10px', borderRadius: 7, border: '0.5px solid #e5e5ea', background: '#fff', fontSize: 11, color: '#636366', cursor: 'pointer' }}>
                    Regenerar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div style={{ position: 'sticky', top: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2744' }}>Vista previa</div>
          <button onClick={descargarImagen} disabled={generando}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: generando ? '#aeaeb2' : '#1a2744', color: '#fff', fontSize: 12, fontWeight: 700, cursor: generando ? 'not-allowed' : 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            {generando ? 'Generando...' : 'Descargar PNG'}
          </button>
        </div>
        <div ref={flyerRef}>
          {datosConForm && <FlyerPreview datos={datosConForm} turnos={turnos} logoBlancoB64={logoBlancoB64}/>}
        </div>
        <div style={{ fontSize: 11, color: '#aeaeb2', textAlign: 'center', marginTop: 10 }}>
          El archivo HTML se puede abrir en cualquier browser y compartir por WhatsApp como imagen.
        </div>
      </div>
    </div>
  )
}

// ── HTML standalone ───────────────────────────────────────────
function generarHTML(d, turnos) {
  const fmtH = h => h ? String(h).slice(0, 5) : ''
  const fechasStr = (() => {
    if (!d.fechas?.length) return ''
    const fmt = f => { const dt = new Date(String(f).slice(0,10)+'T12:00:00'); return dt.toLocaleDateString('es-AR',{weekday:'short',day:'numeric',month:'short'}) }
    if (d.fechas.length === 1) return fmt(d.fechas[0])
    if (d.fechas.length === 2) return fmt(d.fechas[0]) + ' y ' + fmt(d.fechas[1])
    return d.fechas.map(fmt).join(' · ')
  })()

  const dotAgentes  = calcDotacion(turnos, 'dotacion_agentes')
  const dotSuperv   = calcDotacion(turnos, 'dotacion_supervisores')
  const dotChoferes = calcDotacion(turnos, 'dotacion_choferes')
  const dotMotor    = calcDotacion(turnos, 'dotacion_motorizados')
  const dotTotal    = dotAgentes + dotSuperv + dotChoferes + dotMotor
    || (d.dotacion_agentes||0)+(d.dotacion_supervisores||0)+(d.dotacion_motorizados||0)
  const dotDetalle  = [dotAgentes>0?dotAgentes+' infantes':null, dotSuperv>0?dotSuperv+' supervisores':null, dotChoferes>0?dotChoferes+' choferes':null, dotMotor>0?dotMotor+' motorizados':null].filter(Boolean).join(' · ')
  const franjaRestriccion = generarFranjaRestriccion(turnos)
  const fecha = new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Flyer Servicio Adicional</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f0f2f5;display:flex;justify-content:center;padding:20px;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.card{width:100%;max-width:420px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(26,39,68,0.18)}
.header{background:linear-gradient(135deg,#1a2744 0%,#243561 100%);padding:28px 24px 22px;position:relative;overflow:hidden}
.header::before{content:'';position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(245,200,0,0.08)}
.header::after{content:'';position:absolute;bottom:-20px;left:-20px;width:80px;height:80px;border-radius:50%;background:rgba(78,205,196,0.1)}
.logo-row{display:flex;align-items:center;gap:10px;margin-bottom:18px;position:relative}
.logo-badge{width:32px;height:32px;background:#f5c800;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#1a2744}
.badge{display:inline-block;background:rgba(245,200,0,0.15);border:1px solid rgba(245,200,0,0.3);border-radius:6px;padding:3px 10px;font-size:10px;font-weight:700;color:#f5c800;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;position:relative}
.title{font-size:22px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-0.5px;position:relative}
.subtitle{font-size:14px;color:rgba(255,255,255,0.65);margin-top:6px;position:relative}
.body{padding:20px 24px}
.info-list{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
.info-item{display:flex;align-items:flex-start;gap:12px}
.info-icon{width:36px;height:36px;border-radius:10px;background:#f5f5f7;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.info-label{font-size:10px;font-weight:700;color:#aeaeb2;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:1px}
.info-valor{font-size:14px;font-weight:600;color:#1a2744;line-height:1.3}
.divider{height:1px;background:linear-gradient(90deg,#f5f5f7,#e5e5ea,#f5f5f7);margin-bottom:16px}
.section-label{font-size:10px;font-weight:700;color:#aeaeb2;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:5px}
.section-value{font-size:13px;color:#3a3a3c;line-height:1.5;white-space:pre-line;margin-bottom:12px}
.turnos-disp{margin-bottom:14px}.turnos-disp-label{font-size:10px;font-weight:700;color:#aeaeb2;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px}.turnos-chips{display:flex;flex-wrap:wrap;gap:6px}.turno-chip{display:inline-flex;align-items:center;gap:5px;background:#f0f4ff;border:1px solid #c7d4f5;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:600;color:#1a2744}.turno-chip-hora{font-size:10px;color:#6b7cb5;font-weight:400}
.restriccion{background:#fffbea;border-radius:10px;padding:10px 14px;border:1px solid #f5e6a3;margin-bottom:14px}
.restriccion-label{font-size:10px;font-weight:700;color:#92700a;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px}
.restriccion-franja{font-size:13px;font-weight:700;color:#1d1d1f;margin-bottom:3px}
.restriccion-nota{font-size:11px;color:#8e8e93;line-height:1.4}
.cta{background:linear-gradient(135deg,#1a2744,#243561);border-radius:14px;padding:16px 18px;text-align:center;margin-top:4px}
.cta-text{font-size:13px;color:rgba(255,255,255,0.75);margin-bottom:6px}
.cta-link{font-size:12px;color:#f5c800;font-weight:700;word-break:break-all}
.cta-sub{font-size:11px;color:rgba(255,255,255,0.5);margin-top:6px}
.footer{background:#f5f5f7;padding:12px 24px;display:flex;justify-content:space-between;align-items:center}
.footer-date{font-size:11px;color:#aeaeb2}
.footer-brand{font-size:10px;font-weight:700;color:#aeaeb2;letter-spacing:0.08em}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="logo-row">
      <div class="logo-badge">BA</div>
      <div><div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:0.12em;text-transform:uppercase">DGCAT · GCBA</div><div style="font-size:12px;color:rgba(255,255,255,0.85);font-weight:600">Cuerpo de Agentes de Tránsito</div></div>
    </div>
    <div class="badge">Convocatoria</div>
    <div class="title">Servicio Adicional</div>
    ${d.evento_motivo||d.os_nombre?'<div class="subtitle">'+(d.evento_motivo||d.os_nombre)+'</div>':''}
  </div>
  <div class="body">
    <div class="info-list">
      ${d.ubicacion?'<div class="info-item"><div class="info-icon">📍</div><div><div class="info-label">Ubicación</div><div class="info-valor">'+d.ubicacion+'</div></div></div>':''}
      ${fechasStr?'<div class="info-item"><div class="info-icon">📅</div><div><div class="info-label">Fecha</div><div class="info-valor">'+fechasStr+'</div></div></div>':''}
      ${dotTotal>0?'<div class="info-item"><div class="info-icon">👥</div><div><div class="info-label">Dotación</div><div class="info-valor">'+(dotDetalle||dotTotal+' personas')+'</div></div></div>':''}
    </div>
    <div class="divider"></div>
    ${turnos.filter(t=>t.nombre).length>0?'<div class="turnos-disp"><div class="turnos-disp-label">Turnos disponibles</div><div class="turnos-chips">'+turnos.filter(t=>t.nombre).map(t=>'<span class="turno-chip">'+t.nombre+(t.hora_inicio?'<span class="turno-chip-hora">'+fmtH(t.hora_inicio)+'–'+fmtH(t.hora_fin)+'</span>':'')+'</span>').join('')+'</div></div>':''}
    ${(franjaRestriccion||turnos.length>0)?'<div class="restriccion"><div class="restriccion-label">Restricción de postulación</div>'+(turnos.filter(t=>t.nombre).length===0&&franjaRestriccion?'<div class="restriccion-franja">'+franjaRestriccion+'</div>':'')+'<div class="restriccion-nota">Los agentes con turno ordinario en las franjas indicadas quedan excluidos de la convocatoria.</div></div>':''}
    ${d.modalidad_contrato?'<div class="section-label">Modalidad de contrato</div><div class="section-value">'+d.modalidad_contrato+'</div>':''}
    ${d.link_postulacion?'<div class="cta"><div class="cta-text">Postulate ingresando al link'+(d.vigencia_link_hs?' (habilitado por '+d.vigencia_link_hs+' hs)':'')+'</div><div class="cta-link">'+d.link_postulacion+'</div><div class="cta-sub">Usá tu correo institucional (@buenosaires.gob.ar)</div></div>':''}
  </div>
  <div class="footer"><div class="footer-date">${fecha}</div><div class="footer-brand">ADICIONALES CAT</div></div>
</div>
</body>
</html>`
}
