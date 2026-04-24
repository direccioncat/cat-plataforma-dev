import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import api from '../../lib/api'
import { ROLES_OPERATIVOS } from '../../lib/rolesOperativos'

const ROL_LABELS = Object.fromEntries(Object.entries(ROLES_OPERATIVOS).map(([k, v]) => [k, v.label]))
const ROL_CFG    = Object.fromEntries(Object.entries(ROLES_OPERATIVOS).map(([k, v]) => [k, { color: v.color, bg: v.bg, pill: v.pill }]))

const ESTADO_CFG = {
  pendiente:   { label: 'Pendiente',  color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' },
  confirmado:  { label: 'Confirmado', color: '#065F46', bg: '#ECFDF5', dot: '#10B981' },
  rechazado:   { label: 'Rechazado',  color: '#991B1B', bg: '#FEF2F2', dot: '#EF4444' },
  reemplazado: { label: 'Reemplaz.',  color: '#1E40AF', bg: '#EFF6FF', dot: '#3B82F6' },
}

function fmtFecha(fecha) {
  if (!fecha) return ''
  return new Date(String(fecha).slice(0, 10) + 'T12:00:00')
    .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function fmtFechaCorta(fecha) {
  if (!fecha) return ''
  return new Date(String(fecha).slice(0, 10) + 'T12:00:00')
    .toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtHora(h) { return h ? String(h).slice(0, 5) : '' }

function normTel(tel) {
  let n = tel.replace(/\D/g, '')
  if (n.startsWith('549')) return n
  if (n.startsWith('54'))  return '549' + n.slice(2)
  if (n.startsWith('0'))   return '549' + n.slice(1)
  return '549' + n
}

function buildWsp(agente, svcNombre) {
  const nombre = agente.nombre_completo || 'agente'
  const rol    = ROL_LABELS[agente.rol] || agente.rol || ''
  const varios = agente.turnos.length > 1
  const L = [
    `Hola, ${nombre}!`, '',
    `Te contactamos desde el *Area de Servicios Adicionales* del Cuerpo de Agentes de Transito (DGCAT).`, '',
    `Queremos informarte que has sido convocado/a para el siguiente servicio:`, '',
    `>> *${svcNombre || 'Servicio Adicional'}*`, `· Rol: *${rol}*`, '',
  ]
  if (varios) {
    L.push('Tus turnos asignados son:', '')
    agente.turnos.forEach((t, i) => {
      const f = t.turno_fecha ? fmtFecha(t.turno_fecha) : ''
      const h = t.turno_hora_inicio ? `${fmtHora(t.turno_hora_inicio)} a ${fmtHora(t.turno_hora_fin)}hs` : ''
      L.push(`· Turno ${i + 1} - ${[f ? f[0].toUpperCase() + f.slice(1) : '', h].filter(Boolean).join(' · ')}`)
    })
    L.push('', 'Te pedimos que confirmes tu disponibilidad *por cada turno* a la brevedad posible:',
      ...agente.turnos.map((_, i) => `>> *T${i + 1} CONFIRMO* o *T${i + 1} NO VOY*`))
  } else {
    const t = agente.turnos[0] || {}
    const f = t.turno_fecha ? fmtFecha(t.turno_fecha) : ''
    const h = t.turno_hora_inicio ? `${fmtHora(t.turno_hora_inicio)} a ${fmtHora(t.turno_hora_fin)}hs` : ''
    if (f) L.push(`· Fecha: ${f[0].toUpperCase() + f.slice(1)}`)
    if (h) L.push(`· Horario: ${h}`)
    L.push('', 'Te pedimos que confirmes tu disponibilidad a la brevedad posible respondiendo:',
      '>> *CONFIRMO*', '>> *NO VOY*')
  }
  L.push('', 'Muchas gracias.', '_Area de Servicios Adicionales - DGCAT_')
  return L.join('\n')
}

function buildMail(agente, svcNombre) {
  const nombre = agente.nombre_completo || 'Agente'
  const rol    = ROL_LABELS[agente.rol] || agente.rol || ''
  const asunto = encodeURIComponent(`Convocatoria Servicio Adicional - ${svcNombre || 'DGCAT'}`)
  const lineasTurnos = agente.turnos.length > 1
    ? ['Sus turnos asignados son:', '', ...agente.turnos.map((t, i) => {
        const f = t.turno_fecha ? fmtFecha(t.turno_fecha) : ''
        const h = t.turno_hora_inicio ? `${fmtHora(t.turno_hora_inicio)} a ${fmtHora(t.turno_hora_fin)}hs` : ''
        return `Turno ${i + 1}: ${[f ? f[0].toUpperCase() + f.slice(1) : '', h].filter(Boolean).join(', ')}`
      })]
    : (() => {
        const t = agente.turnos[0] || {}
        const f = t.turno_fecha ? fmtFecha(t.turno_fecha) : ''
        const h = t.turno_hora_inicio ? `${fmtHora(t.turno_hora_inicio)} a ${fmtHora(t.turno_hora_fin)}hs` : ''
        return [f ? `Fecha: ${f[0].toUpperCase() + f.slice(1)}` : null, h ? `Horario: ${h}` : null].filter(Boolean)
      })()
  const cuerpo = encodeURIComponent([
    `Estimado/a ${nombre},`, '',
    `Por medio del presente le comunicamos que ha sido convocado/a para el siguiente servicio:`, '',
    `Servicio: ${svcNombre || 'Servicio Adicional'}`, `Rol: ${rol}`,
    ...lineasTurnos, '',
    `Le solicitamos que confirme su disponibilidad a la brevedad posible respondiendo este correo.`, '',
    `Atentamente,`, `Area de Servicios Adicionales`,
    `Direccion General de Control de Area de Transito (DGCAT)`,
    `Gobierno de la Ciudad de Buenos Aires`,
  ].filter(l => l !== null).join('\n'))
  return { asunto, cuerpo }
}

function agrupar(convocados) {
  const map = new Map()
  for (const c of convocados) {
    if (!map.has(c.agente_id)) {
      map.set(c.agente_id, {
        agente_id: c.agente_id, nombre_completo: c.nombre_completo,
        legajo: c.legajo, rol: c.rol, email: c.email,
        telefono: c.telefono, telefono_convocatoria: c.telefono_convocatoria,
        postulante_id: c.postulante_id, turnos: [],
      })
    }
    map.get(c.agente_id).turnos.push({
      conv_id: c.id, turno_id: c.turno_id,
      turno_fecha: c.turno_fecha,
      turno_hora_inicio: c.turno_hora_inicio,
      turno_hora_fin:    c.turno_hora_fin,
      estado: c.estado,
    })
  }
  return [...map.values()]
}

function TurnoPop({ turno, anchor, onAccion, onClose }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const est = ESTADO_CFG[turno.estado] || ESTADO_CFG.pendiente

  useEffect(() => {
    if (!anchor.current) return
    const r = anchor.current.getBoundingClientRect()
    const popH = 160 // altura estimada del popover
    const spaceBelow = window.innerHeight - r.bottom
    const top = spaceBelow < popH + 16 ? r.top - popH - 8 : r.bottom + 8
    setPos({ top, left: Math.min(r.left, window.innerWidth - 200) })
  }, [])

  useEffect(() => {
    const h = e => {
      if (!ref.current?.contains(e.target) && !anchor.current?.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return createPortal(
    <div ref={ref} style={{
      position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
      background: '#fff', borderRadius: 16, padding: 12,
      boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
      border: '0.5px solid #E5E7EB', minWidth: 190,
    }}>
      <div style={{ padding: '4px 4px 10px', borderBottom: '0.5px solid #F3F4F6', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
          {turno.turno_hora_inicio ? `${fmtHora(turno.turno_hora_inicio)} - ${fmtHora(turno.turno_hora_fin)}hs` : 'Sin horario'}
        </div>
        {turno.turno_fecha && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{fmtFechaCorta(turno.turno_fecha)}</div>}
        <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 20, background: est.bg }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: est.dot }}/>
          <span style={{ fontSize: 10, fontWeight: 700, color: est.color }}>{est.label}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {turno.estado !== 'confirmado' && (
          <button onClick={() => onAccion('confirmado')}
            style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#ECFDF5', color: '#065F46', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = '#D1FAE5'}
            onMouseLeave={e => e.currentTarget.style.background = '#ECFDF5'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Va al servicio
          </button>
        )}
        {turno.estado !== 'rechazado' && (
          <button onClick={() => onAccion('rechazado')}
            style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#FEF2F2', color: '#991B1B', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
            onMouseLeave={e => e.currentTarget.style.background = '#FEF2F2'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            No va
          </button>
        )}
        {turno.estado !== 'pendiente' && (
          <button onClick={() => onAccion('pendiente')}
            style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: 'none', color: '#9CA3AF', fontSize: 11, cursor: 'pointer', textAlign: 'left' }}>
            Deshacer
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}

function TurnoChip({ turno, idx, onCambiarEstado, guardando }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const est  = ESTADO_CFG[turno.estado] || ESTADO_CFG.pendiente
  const hora = turno.turno_hora_inicio ? `${fmtHora(turno.turno_hora_inicio)} - ${fmtHora(turno.turno_hora_fin)}` : '-'
  const fecha = turno.turno_fecha ? fmtFechaCorta(turno.turno_fecha) : ''

  const handleAccion = async (estado) => { setOpen(false); await onCambiarEstado(turno.conv_id, estado) }

  return (
    <>
      <div ref={ref} onClick={() => setOpen(p => !p)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 10,
          background: est.bg, border: `1.5px solid ${est.dot}30`,
          cursor: guardando === turno.conv_id ? 'wait' : 'pointer',
          opacity: guardando === turno.conv_id ? 0.4 : 1,
          transition: 'all 0.15s', userSelect: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = est.dot + '80'; e.currentTarget.style.boxShadow = `0 2px 8px ${est.dot}20` }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = est.dot + '30'; e.currentTarget.style.boxShadow = 'none' }}
      >
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: est.dot, flexShrink: 0 }}/>
        <span style={{ fontSize: 10, fontWeight: 800, color: est.color, opacity: 0.5 }}>T{idx + 1}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{hora}hs</span>
        {fecha && <span style={{ fontSize: 11, color: '#6B7280' }}>{fecha}</span>}
        <span style={{ fontSize: 10, fontWeight: 600, color: est.color, marginLeft: 2 }}>{est.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={est.dot} strokeWidth="2.5" style={{ opacity: 0.6 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {open && <TurnoPop turno={turno} anchor={ref} onAccion={handleAccion} onClose={() => setOpen(false)} />}
    </>
  )
}

function FilaAgente({ agente, svcNombre, svcId, onCambiarEstado, onTelGuardado, guardando, idx }) {
  const tel = agente.telefono_convocatoria || agente.telefono || ''
  const [editTel, setEditTel]     = useState(false)
  const [inputTel, setInputTel]   = useState('')
  const [savingTel, setSavingTel] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (editTel) setTimeout(() => inputRef.current?.focus(), 50) }, [editTel])

  const rolCfg    = ROL_CFG[agente.rol] || ROL_CFG.infante
  const todosConf = agente.turnos.every(t => t.estado === 'confirmado')
  const todosRech = agente.turnos.every(t => t.estado === 'rechazado')
  const bgBase    = idx % 2 === 0 ? '#ffffff' : '#FAFAFA'

  const handleWsp = () => {
    if (tel) window.open(`https://wa.me/${normTel(tel)}?text=${encodeURIComponent(buildWsp(agente, svcNombre))}`, '_blank')
    else { setInputTel(''); setEditTel(true) }
  }

  const handleMail = () => {
    if (!agente.email) return
    const { asunto, cuerpo } = buildMail(agente, svcNombre)
    window.open(`mailto:${agente.email}?subject=${asunto}&body=${cuerpo}`, '_blank')
  }

  const guardarTel = async () => {
    const num = inputTel.trim()
    if (!num || !agente.postulante_id) return
    setSavingTel(true)
    try {
      await api.patch(`/api/servicios-adicionales/${svcId}/postulantes/${agente.postulante_id}/telefono`, { telefono: num })
      setEditTel(false)
      onTelGuardado?.(agente.agente_id, num)
      window.open(`https://wa.me/${normTel(num)}?text=${encodeURIComponent(buildWsp({ ...agente, telefono_convocatoria: num }, svcNombre))}`, '_blank')
    } catch (e) { alert(e.message) }
    finally { setSavingTel(false) }
  }

  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: '1fr auto',
        borderTop: idx === 0 ? 'none' : '1px solid #F3F4F6',
        padding: '18px 24px', alignItems: 'center',
        background: bgBase, transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#F0F4FF'}
      onMouseLeave={e => e.currentTarget.style.background = bgBase}
    >
      {/* Bloque izquierdo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>
            {agente.nombre_completo}
          </span>
          <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>#{agente.legajo}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: rolCfg.bg, color: rolCfg.color, border: `1px solid ${rolCfg.pill}`,
          }}>
            {ROL_LABELS[agente.rol] || agente.rol}
          </span>
          {todosConf && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#ECFDF5', color: '#065F46' }}>Todo confirmado</span>}
          {todosRech && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#FEF2F2', color: '#991B1B' }}>Todo rechazado</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {agente.turnos.map((t, i) => (
            <TurnoChip key={t.conv_id} turno={t} idx={i} onCambiarEstado={onCambiarEstado} guardando={guardando} />
          ))}
        </div>
      </div>

      {/* Bloque derecho: contacto */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 110 }}>
        <button onClick={handleWsp}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: tel ? '#065F46' : '#92400E', color: '#fff',
            fontSize: 12, fontWeight: 700,
            boxShadow: tel ? '0 1px 4px #065F4630' : '0 1px 4px #92400E30',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {tel ? 'WhatsApp' : 'Sin tel.'}
        </button>

        <button onClick={handleMail}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 10, cursor: agente.email ? 'pointer' : 'default',
            background: 'transparent', color: agente.email ? '#1D4ED8' : '#9CA3AF',
            fontSize: 12, fontWeight: 600,
            border: `1.5px solid ${agente.email ? '#BFDBFE' : '#E5E7EB'}`,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (agente.email) { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#93C5FD' } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = agente.email ? '#BFDBFE' : '#E5E7EB' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Email
        </button>
      </div>

      {/* Toast tel */}
      {editTel && createPortal(
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#1a2744', borderRadius: 16, padding: '14px 18px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 12, color: '#f5c800', fontWeight: 700, whiteSpace: 'nowrap' }}>
            Tel. de {agente.nombre_completo.split(' ')[0]}
          </span>
          <input ref={inputRef} value={inputTel} onChange={e => setInputTel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') guardarTel(); if (e.key === 'Escape') setEditTel(false) }}
            placeholder="Ej: 1134567890"
            style={{ width: 140, padding: '8px 12px', borderRadius: 10, border: '1.5px solid #f5c80060', background: '#ffffff15', fontSize: 13, color: '#fff', outline: 'none' }}
          />
          <button onClick={guardarTel} disabled={savingTel || !inputTel.trim()}
            style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#f5c800', color: '#1a2744', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: savingTel || !inputTel.trim() ? 0.4 : 1 }}>
            {savingTel ? '...' : 'Guardar y enviar'}
          </button>
          <button onClick={() => setEditTel(false)}
            style={{ background: 'none', border: 'none', color: '#ffffff50', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>
            x
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}

export default function SATabConvocatoria({ servicioId, servicioNombre }) {
  const [convocados, setConvocados] = useState([])
  const [cargando, setCargando]     = useState(true)
  const [guardando, setGuardando]   = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      const data = await api.get(`/api/servicios-adicionales/${servicioId}/convocatoria`)
      setConvocados(data)
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  async function onCambiarEstado(convId, estado) {
    setGuardando(convId)
    try {
      await api.patch(`/api/servicios-adicionales/${servicioId}/convocatoria/${convId}`, { estado })
      setConvocados(prev => prev.map(c => c.id === convId ? { ...c, estado } : c))
    } catch (e) { alert(e.message) }
    finally { setGuardando(null) }
  }

  function onTelGuardado(agenteId, tel) {
    setConvocados(prev => prev.map(c => c.agente_id === agenteId ? { ...c, telefono_convocatoria: tel } : c))
  }

  const agentes = agrupar(convocados)
  const res = {
    total:       agentes.length,
    confirmados: agentes.filter(a => a.turnos.every(t => t.estado === 'confirmado')).length,
    rechazados:  agentes.filter(a => a.turnos.every(t => t.estado === 'rechazado')).length,
    pendientes:  agentes.filter(a => a.turnos.some(t => t.estado === 'pendiente')).length,
  }

  if (cargando) return <div style={{ padding: 44, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>Cargando convocatoria...</div>

  if (convocados.length === 0) return (
    <div style={{ padding: 44, textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📞</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Sin convocados</div>
      <div style={{ fontSize: 13, color: '#9CA3AF' }}>Primero arma el organigrama en la pestana "Armado".</div>
    </div>
  )

  return (
    <div style={{ padding: '28px 44px' }}>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Total convocados', valor: res.total,       color: '#1a2744', bg: '#F0F4FF', accent: '#1a274420' },
          { label: 'Confirmados',      valor: res.confirmados, color: '#065F46', bg: '#ECFDF5', accent: '#10B98120' },
          { label: 'Con pendientes',   valor: res.pendientes,  color: '#92400E', bg: '#FFF7ED', accent: '#F59E0B20' },
          { label: 'Rechazados',       valor: res.rechazados,  color: '#991B1B', bg: '#FEF2F2', accent: '#EF444420' },
        ].map(r => (
          <div key={r.label} style={{ background: r.bg, borderRadius: 14, padding: '14px 20px', minWidth: 110, border: `1px solid ${r.accent}` }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: r.color, lineHeight: 1, letterSpacing: '-1px' }}>{r.valor}</div>
            <div style={{ fontSize: 11, color: r.color, marginTop: 4, opacity: 0.6, fontWeight: 500 }}>{r.label}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 24px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {agentes.length} agente{agentes.length !== 1 ? 's' : ''} convocado{agentes.length !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 11, color: '#D1D5DB' }}>Click en un turno para confirmar</span>
        </div>
        {agentes.map((agente, i) => (
          <FilaAgente
            key={agente.agente_id}
            agente={agente}
            svcNombre={servicioNombre}
            svcId={servicioId}
            onCambiarEstado={onCambiarEstado}
            onTelGuardado={onTelGuardado}
            guardando={guardando}
            idx={i}
          />
        ))}
      </div>
    </div>
  )
}
