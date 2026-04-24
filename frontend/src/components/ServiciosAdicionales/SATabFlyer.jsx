import { useState, useEffect, useRef } from 'react'
import api from '../../lib/api'
import logoCat from '../../assets/logo-cat.png'

// ── Logo a base64 blanco (para header oscuro) ─────────────────
async function generarLogoBlanco() {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth; c.height = img.naturalHeight
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const id = ctx.getImageData(0, 0, c.width, c.height)
      const d  = id.data
      for (let i = 0; i < d.length; i += 4) {
        const lum = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114
        if      (lum > 200 && d[i+3] > 200) { d[i+3] = 0 }
        else if (d[i+3] > 10) { d[i] = 255; d[i+1] = 255; d[i+2] = 255; d[i+3] = 255 }
      }
      ctx.putImageData(id, 0, 0)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = logoCat
  })
}

// ── Paleta institucional ──────────────────────────────────────
const C = {
  headerDark:        '#0f1d38',
  headerMid:         '#1a2d54',
  amarillo:          '#f5c800',
  textoHeader:       '#8fa3c9',
  textoSecundario:   '#5a6b8c',
  textoMuted:        '#8b95ad',
  bgCard:            '#f5f7fb',
  borderCard:        '#dde5f2',
  separador:         '#edf0f6',
  turnoBg:           '#eaf0fb',
  turnoBorde:        '#185fa5',
  turnoTexto:        '#0c447c',
  turnoHorario:      '#185fa5',
  restriccionBg:     '#fff8e8',
  restriccionBorde:  '#f0d88a',
  restriccionIcono:  '#ba7517',
  restriccionTitulo: '#854f0b',
  restriccionTexto:  '#5a3a06',
}

// ── Utilidades ────────────────────────────────────────────────
function esc(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const DIAS_C  = ['Dom','Lun','Mar','Mi\u00e9','Jue','Vie','S\u00e1b']
const DIAS_L  = ['Domingo','Lunes','Martes','Mi\u00e9rcoles','Jueves','Viernes','S\u00e1bado']
const MESES   = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']
const MESES_C = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const MESES_L = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function parseFecha(f) {
  let d
  if (f instanceof Date) { d = f }
  else if (/^\d{4}-\d{2}-\d{2}$/.test(String(f))) {
    const [y, m, dd] = String(f).split('-').map(Number); d = new Date(y, m - 1, dd)
  } else { d = new Date(String(f).slice(0, 10) + 'T12:00:00') }
  const ds = d.getDay(), mi = d.getMonth()
  return {
    dia: DIAS_C[ds], num: d.getDate(),
    mes: MESES[mi], mesCorto: MESES_C[mi], mesLargo: MESES_L[mi],
    nombreCompleto: DIAS_L[ds] + ' ' + d.getDate() + ' de ' + MESES_L[mi],
    fechaObj: d, esFinDeSemana: ds === 0 || ds === 6,
  }
}

// "22 / 23 / 24 abr" — fechas agrupadas de un turno
function fmtFechasTurno(fechas) {
  if (!fechas || fechas.length === 0) return null
  const fps = [...new Set(fechas)].sort().map(parseFecha)
  const meses = [...new Set(fps.map(f => f.mesCorto))]
  if (meses.length === 1) return fps.map(f => f.num).join(' / ') + ' ' + meses[0]
  // fechas en distintos meses: "30 abr / 1 / 2 may"
  let out = '', lastMes = null
  fps.forEach((f, i) => {
    out += (i > 0 ? ' / ' : '') + f.num
    if (f.mesCorto !== lastMes) { out += ' ' + f.mesCorto; lastMes = f.mesCorto }
  })
  return out
}

function fmtHora(h) { return h ? String(h).slice(0, 5) : '' }
function calcDot(turnos, campo) { return (turnos || []).reduce((a, t) => a + (t[campo] || 0), 0) }

// ── SVGs ──────────────────────────────────────────────────────
function svgArrow() {
  return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 5l7 7-7 7" stroke="' + C.amarillo + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
}

function svgDotIcon(tipo) {
  const k = String(tipo).toLowerCase()
  if (k.includes('infante') || k.includes('agente'))
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="7" r="3.2" stroke="' + C.amarillo + '" stroke-width="1.8"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="' + C.amarillo + '" stroke-width="1.8" stroke-linecap="round"/></svg>'
  if (k.includes('supervisor'))
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  if (k.includes('chofer') || k.includes('conductor'))
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="8" rx="1.5" stroke="#fff" stroke-width="1.8"/><path d="M5 11l2-5h10l2 5" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7.5" cy="19" r="1.5" fill="#fff"/><circle cx="16.5" cy="19" r="1.5" fill="#fff"/></svg>'
  if (k.includes('motorizado'))
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="5.5" cy="17.5" r="2.5" stroke="#fff" stroke-width="1.8"/><circle cx="18.5" cy="17.5" r="2.5" stroke="#fff" stroke-width="1.8"/><path d="M8 17.5h7M12 10l3 7.5M9 10h5l1.5-3H8.5L8 10z" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="#fff" stroke-width="1.8"/><circle cx="17" cy="9" r="2.5" stroke="#fff" stroke-width="1.8"/><path d="M3 20c0-3 2.5-5.5 6-5.5s6 2.5 6 5.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M15 20c0-2.5 1.5-4.5 4-4.5s4 2 4 4.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>'
}

function colorDotIcon(tipo) {
  const k = String(tipo).toLowerCase()
  if (k.includes('infante') || k.includes('agente')) return C.headerDark
  if (k.includes('supervisor')) return '#0f6e56'
  if (k.includes('chofer') || k.includes('conductor')) return '#993c1d'
  if (k.includes('motorizado')) return '#6d28d9'
  return '#5a6b8c'
}

// ── Bloques HTML ──────────────────────────────────────────────

function htmlHeader({ titulo, subtitulo, cantFechas, logob64 }) {
  const logoSrc   = logob64 || logoCat
  const multiBadge = ''

  return (
    '<div style="background:' + C.headerDark + ';padding:20px 24px 22px;position:relative;overflow:hidden;">'
  + '<div style="position:absolute;top:-50px;right:-50px;width:160px;height:160px;border-radius:50%;background:' + C.headerMid + ';opacity:0.55;"></div>'
  + '<div style="position:absolute;bottom:-70px;right:30px;width:100px;height:100px;border-radius:50%;background:' + C.headerMid + ';opacity:0.35;"></div>'
  + '<div style="position:relative;display:flex;align-items:center;gap:14px;margin-bottom:18px;">'
  +   '<img src="' + logoSrc + '" alt="CAT" style="width:46px;height:46px;object-fit:contain;flex-shrink:0;"/>'
  +   '<div style="line-height:1.3;">'
  +     '<div style="font-size:10px;font-weight:500;color:' + C.textoHeader + ';letter-spacing:1.5px;text-transform:uppercase;">Direcci\u00f3n General</div>'
  +     '<div style="font-size:13px;font-weight:600;color:#fff;">Cuerpo de Agentes de Tr\u00e1nsito</div>'
  +   '</div>'
  + '</div>'
  + '<div style="position:relative;display:flex;align-items:center;gap:8px;margin-bottom:14px;">'
  +   '<div style="display:inline-flex;align-items:center;gap:7px;background:' + C.amarillo + ';padding:5px 12px;border-radius:5px;">'
  +     '<div style="width:6px;height:6px;border-radius:50%;background:' + C.headerDark + ';"></div>'
  +     '<span style="font-size:10px;font-weight:700;color:' + C.headerDark + ';letter-spacing:1px;">CONVOCATORIA ABIERTA</span>'
  +   '</div>'
  +   multiBadge
  + '</div>'
  + '<div style="position:relative;">'
  +   '<div style="font-size:11px;font-weight:500;color:' + C.textoHeader + ';letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Servicio adicional</div>'
  +   '<div style="font-size:24px;font-weight:700;color:#fff;letter-spacing:-0.3px;line-height:1.15;">' + esc(titulo) + '</div>'
  +   (subtitulo ? '<div style="font-size:13px;font-weight:400;color:' + C.textoHeader + ';margin-top:5px;">' + esc(subtitulo) + '</div>' : '')
  + '</div>'
  + '</div>'
  )
}

function htmlFechas(fps) {
  if (!fps || fps.length === 0) return ''

  if (fps.length === 1) {
    const f = fps[0]
    return (
      '<div style="padding:14px 24px;border-bottom:1px solid ' + C.separador + ';display:flex;align-items:center;gap:16px;">'
    + '<div style="width:54px;text-align:center;border:2px solid ' + C.headerDark + ';border-radius:9px;overflow:hidden;flex-shrink:0;">'
    +   '<div style="background:' + C.headerDark + ';color:' + C.amarillo + ';font-size:9px;font-weight:700;letter-spacing:1.5px;padding:3px 0;">' + f.mes + '</div>'
    +   '<div style="font-size:26px;font-weight:700;color:' + C.headerDark + ';line-height:1;padding:5px 0 3px;">' + f.num + '</div>'
    +   '<div style="font-size:9px;font-weight:600;color:' + C.textoSecundario + ';letter-spacing:0.5px;padding-bottom:4px;text-transform:uppercase;">' + f.dia + '</div>'
    + '</div>'
    + '<div>'
    +   '<div style="font-size:10px;font-weight:600;color:' + C.textoMuted + ';letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">Fecha del servicio</div>'
    +   '<div style="font-size:15px;font-weight:600;color:' + C.headerDark + ';line-height:1.25;">' + f.nombreCompleto + '</div>'
    + '</div>'
    + '</div>'
    )
  }

  const primera = fps[0], ultima = fps[fps.length - 1]
  const rango   = primera.dia + ' ' + primera.num + ' \u2014 ' + ultima.dia + ' ' + ultima.num + ' ' + ultima.mesCorto
  const cols    = Math.min(fps.length, 7)
  const chips   = fps.map(function(f) {
    const bg  = f.esFinDeSemana ? C.headerMid  : C.headerDark
    const bdr = f.esFinDeSemana ? 'border:1.5px solid ' + C.amarillo + ';' : ''
    const nc  = f.esFinDeSemana ? C.amarillo : '#fff'
    const lc  = f.esFinDeSemana ? C.amarillo : C.textoHeader
    return '<div style="text-align:center;background:' + bg + ';' + bdr + 'border-radius:7px;padding:5px 2px;">'
         + '<div style="font-size:8px;font-weight:600;color:' + lc + ';letter-spacing:0.5px;text-transform:uppercase;">' + f.dia + '</div>'
         + '<div style="font-size:14px;font-weight:700;color:' + nc + ';line-height:1.1;margin-top:2px;">' + f.num + '</div>'
         + '</div>'
  }).join('')

  return (
    '<div style="padding:14px 24px;border-bottom:1px solid ' + C.separador + ';">'
  + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
  +   '<div>'
  +     '<div style="font-size:10px;font-weight:600;color:' + C.textoMuted + ';letter-spacing:1px;text-transform:uppercase;">Fechas del servicio</div>'
  +     '<div style="font-size:15px;font-weight:700;color:' + C.headerDark + ';margin-top:2px;">' + rango + '</div>'
  +   '</div>'
  +   '<div style="background:' + C.headerDark + ';color:' + C.amarillo + ';padding:6px 10px;border-radius:9px;display:flex;align-items:center;gap:5px;">'
  +     '<span style="font-size:18px;font-weight:700;line-height:1;">' + fps.length + '</span>'
  +     '<span style="font-size:8px;font-weight:700;letter-spacing:1px;">D\u00cdAS</span>'
  +   '</div>'
  + '</div>'
  + '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:5px;">' + chips + '</div>'
  + '</div>'
  )
}

function htmlDotacion(dot) {
  if (!dot || dot.length === 0) return ''
  const total = dot.reduce(function(s, d) { return s + (d.cantidad || 0) }, 0)
  const cards = dot.map(function(d, i) {
    const span = dot.length === 3 && i === 2 ? 'grid-column:1/-1;' : ''
    return '<div style="background:' + C.bgCard + ';border:1px solid ' + C.borderCard + ';border-radius:11px;padding:11px 13px;display:flex;align-items:center;gap:11px;' + span + '">'
         + '<div style="width:38px;height:38px;border-radius:9px;background:' + colorDotIcon(d.tipo) + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + svgDotIcon(d.tipo) + '</div>'
         + '<div>'
         +   '<div style="font-size:20px;font-weight:700;color:' + C.headerDark + ';line-height:1;">' + d.cantidad + '</div>'
         +   '<div style="font-size:10px;font-weight:600;color:' + C.textoSecundario + ';letter-spacing:0.3px;margin-top:2px;text-transform:uppercase;">' + esc(d.tipo) + '</div>'
         + '</div>'
         + '</div>'
  }).join('')

  return (
    '<div style="padding:14px 24px;border-bottom:1px solid ' + C.separador + ';">'
  + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">'
  +   '<div style="font-size:10px;font-weight:600;color:' + C.textoMuted + ';letter-spacing:1px;text-transform:uppercase;">Dotaci\u00f3n requerida</div>'
  +   '<div style="font-size:12px;font-weight:700;color:' + C.headerDark + ';">' + total + ' ' + (total === 1 ? 'agente' : 'agentes') + ' en total</div>'
  + '</div>'
  + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;">' + cards + '</div>'
  + '</div>'
  )
}

function htmlTurnos(turnos) {
  if (!turnos || turnos.length === 0) return ''

  const items = turnos.map(function(t) {
    const metaParts = []
    if (t.horario)   metaParts.push('<span style="font-weight:600;color:' + C.turnoHorario + ';font-variant-numeric:tabular-nums;">' + esc(t.horario) + ' hs</span>')
    if (t.fechasStr) metaParts.push('<span style="color:' + C.textoMuted + ';">' + esc(t.fechasStr) + '</span>')
    const meta = metaParts.join('<span style="color:#c8d2e3;margin:0 5px;">\u00b7</span>')

    return '<div style="background:' + C.turnoBg + ';border-left:3px solid ' + C.turnoBorde + ';border-radius:8px;padding:9px 13px;">'
         + '<div style="display:flex;align-items:center;gap:8px;' + (meta ? 'margin-bottom:3px;' : '') + '">'
         +   '<div style="width:6px;height:6px;border-radius:50%;background:' + C.turnoBorde + ';flex-shrink:0;"></div>'
         +   '<span style="font-size:12px;font-weight:600;color:' + C.turnoTexto + ';letter-spacing:0.2px;text-transform:uppercase;">' + esc(t.nombre) + '</span>'
         + '</div>'
         + (meta ? '<div style="font-size:11px;padding-left:14px;line-height:1.4;">' + meta + '</div>' : '')
         + '</div>'
  }).join('')

  const label = turnos.length > 1
    ? '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">'
    +   '<div style="font-size:10px;font-weight:600;color:' + C.textoMuted + ';letter-spacing:1px;text-transform:uppercase;">Turnos disponibles</div>'
    +   '<div style="font-size:11px;font-weight:600;color:' + C.headerDark + ';">' + turnos.length + ' turnos</div>'
    + '</div>'
    : '<div style="font-size:10px;font-weight:600;color:' + C.textoMuted + ';letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Turno disponible</div>'

  return (
    '<div style="padding:14px 24px;border-bottom:1px solid ' + C.separador + ';">'
  + label
  + '<div style="display:flex;flex-direction:column;gap:6px;">' + items + '</div>'
  + '</div>'
  )
}

function htmlRestriccion(r) {
  if (!r) return ''
  const texto = 'Los agentes con turno ordinario en alguno de los turnos convocados no ser\u00e1n considerados.'
  return (
    '<div style="padding:8px 24px 4px;">'
  + '<div style="background:' + C.restriccionBg + ';border:1px solid ' + C.restriccionBorde + ';border-radius:10px;padding:10px 13px;display:flex;gap:10px;align-items:center;">'
  + '<div style="width:20px;height:20px;border-radius:50%;background:' + C.restriccionIcono + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
  +   '<span style="color:#fff;font-size:12px;font-weight:700;line-height:1;">!</span>'
  + '</div>'
  + '<div style="flex:1;">'
  +   '<div style="font-size:10px;font-weight:700;color:' + C.restriccionTitulo + ';letter-spacing:0.7px;text-transform:uppercase;margin-bottom:2px;">Restricci\u00f3n</div>'
  +   '<div style="font-size:11px;color:' + C.restriccionTexto + ';line-height:1.4;">' + texto + '</div>'
  + '</div>'
  + '</div>'
  + '</div>'
  )
}

function htmlModalidad(m) {
  if (!m) return ''
  let texto, tipo
  if (typeof m === 'string') {
    texto = m
    const l = m.toLowerCase()
    tipo = l.includes('planta') ? 'planta' : l.includes('contrato') ? 'contrato' : 'todas'
  } else { texto = m.texto || 'Todas las modalidades'; tipo = m.tipo || 'todas' }
  const badges = {
    todas:    { bg: '#e6f1fb', col: '#0c447c', label: 'SIN RESTRICCI\u00d3N' },
    planta:   { bg: '#fdecea', col: '#a32d2d', label: 'SOLO PLANTA' },
    contrato: { bg: '#fff0da', col: '#854f0b', label: 'SOLO CONTRATO' },
  }
  const b = badges[tipo] || badges.todas
  return (
    '<div style="padding:4px 24px 14px;">'
  + '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid ' + C.separador + ';">'
  +   '<div>'
  +     '<div style="font-size:10px;font-weight:600;color:' + C.textoMuted + ';letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">Modalidad</div>'
  +     '<div style="font-size:13px;font-weight:600;color:' + C.headerDark + ';">' + esc(texto) + '</div>'
  +   '</div>'
  +   '<div style="background:' + b.bg + ';color:' + b.col + ';font-size:10px;font-weight:700;padding:5px 10px;border-radius:5px;letter-spacing:0.5px;">' + b.label + '</div>'
  + '</div>'
  + '</div>'
  )
}

function htmlCTA(link) {
  if (link) {
    let visible = link
    try {
      const u = new URL(link)
      visible = u.hostname + u.pathname
      if (visible.length > 42) visible = visible.slice(0, 39) + '...'
    } catch (_) { if (visible.length > 42) visible = visible.slice(0, 39) + '...' }
    return (
      '<div style="padding:0 20px 16px;">'
    + '<div style="background:' + C.headerDark + ';border-radius:13px;padding:14px 18px;text-align:center;">'
    +   '<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:5px;">'
    +     '<span style="font-size:13px;font-weight:700;color:#fff;letter-spacing:0.5px;">POSTULARME AHORA</span>'
    +     svgArrow()
    +   '</div>'
    +   '<div style="font-size:10px;color:' + C.textoHeader + ';font-weight:500;">' + esc(visible) + '</div>'
    + '</div>'
    + '</div>'
    )
  }
  return (
    '<div style="padding:0 20px 16px;">'
  + '<div style="background:' + C.bgCard + ';border:1.5px dashed #c5cfdf;border-radius:13px;padding:14px 18px;text-align:center;">'
  +   '<div style="font-size:11px;font-weight:600;color:' + C.textoSecundario + ';margin-bottom:3px;">POSTULACI\u00d3N</div>'
  +   '<div style="font-size:11px;color:' + C.textoMuted + ';font-style:italic;">Link de postulaci\u00f3n pendiente de carga</div>'
  + '</div>'
  + '</div>'
  )
}

function htmlFooter() {
  const f   = parseFecha(new Date())
  const str = f.num + ' de ' + f.mesLargo + ' de ' + f.fechaObj.getFullYear()
  return (
    '<div style="background:' + C.headerDark + ';padding:11px 24px;display:flex;justify-content:space-between;align-items:center;">'
  + '<div style="display:flex;align-items:center;gap:7px;">'
  +   '<div style="width:4px;height:4px;border-radius:50%;background:' + C.amarillo + ';"></div>'
  +   '<span style="font-size:10px;color:' + C.textoHeader + ';font-weight:500;">Publicado el ' + str + '</span>'
  + '</div>'
  + '<div style="font-size:9px;color:' + C.amarillo + ';font-weight:700;letter-spacing:1.5px;">ADICIONALES CAT</div>'
  + '</div>'
  )
}

// ── Mapeo datos app → parámetros flyer ────────────────────────
function buildFlyerParams(datos, turnos, form) {
  const titulo    = (datos.os_nombre || datos.evento_motivo || 'SERVICIO ADICIONAL').toUpperCase()
  const subtitulo = datos.evento_motivo && datos.evento_motivo !== datos.os_nombre
    ? datos.evento_motivo : null

  // Fechas únicas
  const fechasSet = new Set()
  ;(turnos || []).forEach(t => { if (t.fecha) fechasSet.add(String(t.fecha).slice(0, 10)) })
  if (datos.fechas && datos.fechas.length) datos.fechas.forEach(f => fechasSet.add(String(f).slice(0, 10)))
  const fechas = [...fechasSet].sort()

  // Dotación acumulada desde turnos
  const ag = calcDot(turnos, 'dotacion_agentes')      || (datos.dotacion_agentes      || 0)
  const sv = calcDot(turnos, 'dotacion_supervisores') || (datos.dotacion_supervisores  || 0)
  const ch = calcDot(turnos, 'dotacion_choferes')     || 0
  const mo = calcDot(turnos, 'dotacion_motorizados')  || (datos.dotacion_motorizados   || 0)
  const dot = [
    ag > 0 && { tipo: 'Infantes',     cantidad: ag },
    sv > 0 && { tipo: 'Supervisores', cantidad: sv },
    ch > 0 && { tipo: 'Choferes',     cantidad: ch },
    mo > 0 && { tipo: 'Motorizados',  cantidad: mo },
  ].filter(Boolean)

  // Turnos agrupados por nombre → con sus fechas acumuladas
  const gruposTurno = {}
  ;(turnos || []).filter(t => t.nombre).forEach(t => {
    const k = t.nombre
    if (!gruposTurno[k]) gruposTurno[k] = { nombre: k, fechas: [], hora_inicio: t.hora_inicio, hora_fin: t.hora_fin }
    if (t.fecha) gruposTurno[k].fechas.push(String(t.fecha).slice(0, 10))
  })
  const turnosFlyer = Object.values(gruposTurno).map(g => ({
    nombre:    String(g.nombre).toUpperCase(),
    horario:   [fmtHora(g.hora_inicio), fmtHora(g.hora_fin)].filter(Boolean).join(' \u2013 ') || null,
    fechasStr: fmtFechasTurno(g.fechas),
  }))

  // Restricción — siempre presente
  const restriccion = { hay: true }

  return {
    titulo, subtitulo,
    fechas:    fechas.length > 0 ? fechas : null,
    dot, turnosFlyer, restriccion,
    modalidad: form.modalidad_contrato || null,
    link:      form.link_postulacion   || null,
  }
}

function buildFlyerCard(datos, turnos, form, logob64) {
  const p   = buildFlyerParams(datos, turnos, form)
  const fps = p.fechas ? p.fechas.map(parseFecha) : []
  return '<div style="width:100%;background:#fff;border-radius:20px;overflow:hidden;'
       + 'font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;'
       + 'box-shadow:0 4px 28px rgba(10,20,50,0.10);border:0.5px solid #d8e0ef;">'
       + htmlHeader({ titulo: p.titulo, subtitulo: p.subtitulo, cantFechas: fps.length, logob64 })
       + htmlFechas(fps)
       + htmlDotacion(p.dot)
       + htmlTurnos(p.turnosFlyer)
       + htmlRestriccion(p.restriccion)
       + htmlModalidad(p.modalidad)
       + htmlCTA(p.link)
       + htmlFooter()
       + '</div>'
}

// ── FlyerPreview ──────────────────────────────────────────────
function FlyerPreview({ datos, turnos, form, logob64 }) {
  const html = buildFlyerCard(datos, turnos, form, logob64)
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

// ── CampoEditable ─────────────────────────────────────────────
function CampoEditable({ label, valor, onChange, multiline, placeholder, tipo }) {
  const INP = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: '0.5px solid #e5e5ea', background: '#f5f5f7',
    fontSize: 13, color: '#1d1d1f', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
    resize: multiline ? 'vertical' : 'none',
  }
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
  const [logob64,   setLogob64]   = useState(null)
  const [convToken, setConvToken] = useState(null)
  const [genToken,  setGenToken]  = useState(false)
  const [copiado,   setCopiado]   = useState(false)
  const flyerRef = useRef(null)

  useEffect(() => { generarLogoBlanco().then(b => setLogob64(b)) }, [])
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
        ...form, vigencia_link_hs: parseInt(form.vigencia_link_hs) || 24,
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
      const wrapper = flyerRef.current.firstElementChild
      const card    = wrapper?.firstElementChild || wrapper || flyerRef.current
      const canvas  = await html2canvas(card, {
        scale: 3, useCORS: false, backgroundColor: '#eef1f6', logging: false, allowTaint: true,
      })
      const url = canvas.toDataURL('image/png')
      const a   = document.createElement('a')
      a.href = url; a.download = 'flyer-adicional.png'; a.click()
    } catch (e) { console.error(e); alert('Error al generar la imagen') }
    finally { setGenerando(false) }
  }

  if (cargando) return <div style={{ padding: 44, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Cargando...</div>

  // Resumen para panel editor
  const ag  = calcDot(turnos, 'dotacion_agentes')      || (datos?.dotacion_agentes      || 0)
  const sv  = calcDot(turnos, 'dotacion_supervisores') || (datos?.dotacion_supervisores  || 0)
  const ch  = calcDot(turnos, 'dotacion_choferes')     || 0
  const mo  = calcDot(turnos, 'dotacion_motorizados')  || (datos?.dotacion_motorizados   || 0)
  const tot = ag + sv + ch + mo

  const fechasResumen = (() => {
    const fs = new Set()
    ;(turnos||[]).forEach(t => { if(t.fecha) fs.add(String(t.fecha).slice(0,10)) })
    if (datos?.fechas?.length) datos.fechas.forEach(f => fs.add(String(f).slice(0,10)))
    const arr = [...fs].sort()
    if (!arr.length) return '—'
    if (arr.length === 1) { const f = parseFecha(arr[0]); return f.nombreCompleto }
    return arr.length + ' fechas'
  })()

  return (
    <div style={{ padding: '24px 44px', display: 'grid', gridTemplateColumns: '1fr 500px', gap: 36, alignItems: 'start' }}>

      {/* ── Panel editor ── */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744', marginBottom: 5 }}>Datos del flyer</div>
        <div style={{ fontSize: 13, color: '#8e8e93', marginBottom: 20 }}>Los datos automáticos (*) se toman de la OS y los turnos.</div>

        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', padding: '18px 20px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Datos automáticos *</div>
          {[
            { label: 'Evento / Motivo', valor: datos?.evento_motivo || datos?.os_nombre || '—' },
            { label: 'Fecha(s)',        valor: fechasResumen },
            { label: 'Dotación total',  valor: tot > 0 ? tot + ' agentes (' + [ag&&(ag+' inf.'), sv&&(sv+' sup.'), ch&&(ch+' chof.'), mo&&(mo+' mot.')].filter(Boolean).join(', ') + ')' : '—' },
            { label: 'Turnos',          valor: turnos.filter(t=>t.nombre).length > 0 ? turnos.filter(t=>t.nombre).map(t=>t.nombre).join(', ') : '—' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '0.5px solid #f5f5f7' }}>
              <span style={{ fontSize: 12, color: '#aeaeb2', flexShrink: 0 }}>{r.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', textAlign: 'right' }}>{r.valor}</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', padding: '18px 20px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Campos editables</div>
          <CampoEditable label="Modalidad de contrato"  valor={form.modalidad_contrato} placeholder="Ej: Todas las modalidades" onChange={v => setForm(p => ({ ...p, modalidad_contrato: v }))}/>
          <CampoEditable label="Link de postulación"    valor={form.link_postulacion}   placeholder="https://forms.gle/..."     tipo="url" onChange={v => setForm(p => ({ ...p, link_postulacion: v }))}/>
          <CampoEditable label="Vigencia del link (hs)" valor={String(form.vigencia_link_hs)} tipo="number" placeholder="24" onChange={v => setForm(p => ({ ...p, vigencia_link_hs: v }))}/>
          <div style={{ display: 'flex', gap: 10, marginTop: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
            {guardado && <span style={{ fontSize: 13, color: '#0f6e56', fontWeight: 600 }}>✓ Guardado</span>}
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: guardando ? '#aeaeb2' : '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer' }}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Formulario de postulación</div>
          <div style={{ fontSize: 12, color: '#8e8e93', marginBottom: 12 }}>Link público para que los agentes se postulen desde la plataforma.</div>

          {!convToken ? (
            <button onClick={generarToken} disabled={genToken}
              style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: genToken ? '#aeaeb2' : '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: genToken ? 'not-allowed' : 'pointer' }}>
              {genToken ? 'Generando...' : '✦ Generar convocatoria'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ flex: 1, padding: '8px 12px', borderRadius: 9, background: '#f5f5f7', fontSize: 11, color: '#636366', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: '0.5px solid #e5e5ea' }}>
                  {window.location.origin}/postular/{convToken.token}
                </div>
                <button onClick={copiarLink}
                  style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: copiado ? '#0f6e56' : '#1a2744', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                  {copiado ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
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

      {/* ── Vista previa ── */}
      <div style={{ position: 'sticky', top: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2744' }}>Vista previa</div>
          <button onClick={descargarImagen} disabled={generando}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: generando ? '#aeaeb2' : '#1a2744', color: '#fff', fontSize: 12, fontWeight: 700, cursor: generando ? 'not-allowed' : 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            {generando ? 'Generando...' : 'Descargar PNG'}
          </button>
        </div>
        <div ref={flyerRef} style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 6px 32px rgba(15,29,56,0.1)' }}>
          {datos && <FlyerPreview datos={datos} turnos={turnos} form={form} logob64={logob64} />}
        </div>
        <div style={{ fontSize: 11, color: '#aeaeb2', textAlign: 'center', marginTop: 10 }}>
          Descargá como PNG para compartir por WhatsApp o redes.
        </div>
      </div>
    </div>
  )
}

// ── HTML standalone (export / Puppeteer) ──────────────────────
export function generarFlyerHTML(datos, turnos, form, logob64) {
  const card = buildFlyerCard(datos, turnos, form, logob64)
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Flyer SA</title>'
       + '<style>*{box-sizing:border-box}html,body{margin:0;padding:0}body{background:#eef1f6;padding:28px 20px;display:flex;justify-content:center;}</style>'
       + '</head><body>' + card + '</body></html>'
}
