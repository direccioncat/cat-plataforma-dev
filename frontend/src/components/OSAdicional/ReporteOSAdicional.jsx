/**
 * ReporteOSAdicional.jsx — v9
 * Iconos integrados: número dentro del ícono (no separado encima)
 * - Punto de control: círculo con número adentro
 * - Desvío: triángulo con número adentro
 * - Tramo/área: círculo con número (sin z-index issues)
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as htmlToImage from 'html-to-image'

const S      = 1.25
const A4_W   = 794
const A4_H   = 1123
const PAD_X  = Math.round(40 * S)
const PAD_TOP= Math.round(24 * S)
const BODY_W = A4_W - PAD_X * 2
const sc = n => Math.round(n * S)

const C = {
  azul:     '#1a2744',
  amarillo: '#f5c800',
  verde:    '#0f6e56',
  rojo:     '#e24b4a',
  gris:     '#8e8e93',
  grisClaro:'#f5f5f7',
  teal:     '#4ecdc4',
}

const TIPO_LABEL_CORTO = { punto_control:'Punto', tramo:'Tramo', zona_area:'Area', desvio:'Desvio' }
const TIPO_ICON        = { punto_control:'●', tramo:'—', zona_area:'▢', desvio:'▲' }

function fmtFechasCorto(fechas) {
  if (!fechas?.length) return '—'
  const fmt = f => {
    const iso = String(f?.fecha || f).slice(0, 10)
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'short' })
  }
  if (fechas.length === 1) return fmt(fechas[0])
  if (fechas.length <= 3) return fechas.map(fmt).join(', ')
  return `${fmt(fechas[0])} al ${fmt(fechas[fechas.length - 1])}`
}
function fmtHora(h) {
  if (!h) return null
  const s = String(h).trim()
  if (!s || s === '00:00:00' || s === '00:00') return null
  return s.slice(0, 5)
}
function hoy() {
  return new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric' })
}

function calcBoundsDeElementos(elementos) {
  const pts = []
  for (const el of elementos || []) {
    const geo = el.geometria
    if (!geo) continue
    if (geo.type === 'Point')      pts.push([geo.coordinates[1], geo.coordinates[0]])
    if (geo.type === 'LineString') geo.coordinates.forEach(([lng,lat]) => pts.push([lat,lng]))
    if (geo.type === 'Polygon')    geo.coordinates[0].forEach(([lng,lat]) => pts.push([lat,lng]))
  }
  return pts
}

// ── ÍCONOS CON NÚMERO INTEGRADO ───────────────────────────────
// Un solo SVG: la forma (círculo/triángulo) + el número adentro.
// Sin elementos separados → sin problemas de z-index.

function svgPunto(color, numero) {
  const n = String(numero)
  const fontSize = n.length > 1 ? 8 : 9
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="12" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="14" y="${14 + fontSize * 0.38}" text-anchor="middle" fill="white"
      font-size="${fontSize}" font-weight="800" font-family="system-ui,sans-serif">${n}</text>
  </svg>`
}

function svgDesvio(color, numero) {
  const n = String(numero)
  const fontSize = n.length > 1 ? 7 : 8
  // Triángulo: centroide aproximado en y=16 para el texto
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <polygon points="14,3 26,25 2,25" fill="${color}" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>
    <text x="14" y="21" text-anchor="middle" fill="white"
      font-size="${fontSize}" font-weight="800" font-family="system-ui,sans-serif">${n}</text>
  </svg>`
}

function svgLabel(color, numero) {
  // Círculo simple para tramos y áreas (se pone en el centroide/punto medio)
  const n = String(numero)
  const fontSize = n.length > 1 ? 8 : 9
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
    <circle cx="11" cy="11" r="10" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="11" y="${11 + fontSize * 0.38}" text-anchor="middle" fill="white"
      font-size="${fontSize}" font-weight="800" font-family="system-ui,sans-serif">${n}</text>
  </svg>`
}

// ── GENERADOR DE MAPA ─────────────────────────────────────────
async function generarImagenMapa({ fases, filtroFaseId = null, width = BODY_W, height = sc(300) }) {
  return new Promise((resolve) => {
    const L = window.L
    if (!L) { resolve(null); return }

    const div = document.createElement('div')
    div.style.cssText = [
      `width:${width}px`,
      `height:${height}px`,
      `position:fixed`,
      `top:0`,
      `left:0`,
      `z-index:-9999`,
      `visibility:hidden`,
      `background:#f0ece4`,
    ].join(';')
    document.body.appendChild(div)

    const map = L.map(div, {
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: false,
      zoomAnimation: false,
      markerZoomAnimation: false,
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map)

    const fasesVisibles = filtroFaseId ? fases.filter(f => f.id === filtroFaseId) : fases
    const todosLosBounds = calcBoundsDeElementos(fases.flatMap(f => f.elementos || []))
    const bounds = []

    fasesVisibles.forEach(fase => {
      const color = fase.color || '#1a2744'
      const elementos = fase.elementos || []

      elementos.forEach((el, idx) => {
        const geo = el.geometria
        if (!geo) return
        const num = idx + 1

        if ((el.tipo === 'punto_control' || el.tipo === 'desvio') && geo.type === 'Point') {
          const [lng, lat] = geo.coordinates
          bounds.push([lat, lng])

          const svg = el.tipo === 'desvio' ? svgDesvio(color, num) : svgPunto(color, num)
          const icon = L.divIcon({
            html: `<div style="filter:drop-shadow(0 2px 5px rgba(0,0,0,0.4))">${svg}</div>`,
            iconSize: [28, 28], iconAnchor: [14, 14], className: '',
          })
          L.marker([lat, lng], { icon }).addTo(map)
        }

        if (el.tipo === 'tramo' && geo.type === 'LineString') {
          const latlngs = geo.coordinates.map(([lng, lat]) => [lat, lng])
          latlngs.forEach(p => bounds.push(p))
          L.polyline(latlngs, { color, weight: 4, opacity: 0.95, lineCap: 'round' }).addTo(map)
          // Label en el punto medio del tramo — zIndexOffset para que quede encima del SVG
          const mid = latlngs[Math.floor(latlngs.length / 2)]
          const icon = L.divIcon({
            html: `<div style="filter:drop-shadow(0 1px 4px rgba(0,0,0,0.4))">${svgLabel(color, num)}</div>`,
            iconSize: [22, 22], iconAnchor: [11, 11], className: '',
          })
          L.marker(mid, { icon, zIndexOffset: 1000 }).addTo(map)
        }

        if (el.tipo === 'zona_area' && geo.type === 'Polygon') {
          const latlngs = geo.coordinates[0].map(([lng, lat]) => [lat, lng])
          latlngs.forEach(p => bounds.push(p))
          L.polygon(latlngs, { color, fillColor: color, fillOpacity: 0.22, weight: 2.5 }).addTo(map)
          // Label en el centroide — zIndexOffset para que quede encima del SVG
          const latC = latlngs.reduce((s, p) => s + p[0], 0) / latlngs.length
          const lngC = latlngs.reduce((s, p) => s + p[1], 0) / latlngs.length
          const icon = L.divIcon({
            html: `<div style="filter:drop-shadow(0 1px 4px rgba(0,0,0,0.4))">${svgLabel(color, num)}</div>`,
            iconSize: [22, 22], iconAnchor: [11, 11], className: '',
          })
          L.marker([latC, lngC], { icon, zIndexOffset: 1000 }).addTo(map)
        }
      })
    })

    const boundsFinales = bounds.length > 0 ? bounds : todosLosBounds

    map.invalidateSize({ animate: false })

    setTimeout(() => {
      if (boundsFinales.length > 0) {
        map.fitBounds(L.latLngBounds(boundsFinales), {
          padding: filtroFaseId && bounds.length > 0 ? [28, 28] : [36, 36],
          maxZoom: filtroFaseId && bounds.length > 0 ? 17 : 15,
          animate: false,
        })
      } else {
        map.setView([-34.603, -58.450], 13)
      }

      div.style.visibility = 'visible'

      const tileLayer = map._layers
        ? Object.values(map._layers).find(l => l._url)
        : null

      function capturar() {
        htmlToImage.toJpeg(div, {
          quality: 0.92,
          width,
          height,
          pixelRatio: 2,
          backgroundColor: '#f0ece4',
          filter: (node) => {
            if (node.classList) {
              if (node.classList.contains('leaflet-control-container')) return false
            }
            return true
          },
        }).then(dataUrl => {
          map.remove()
          document.body.removeChild(div)
          resolve(dataUrl)
        }).catch(err => {
          console.warn('html-to-image error:', err)
          map.remove()
          document.body.removeChild(div)
          resolve(null)
        })
      }

      if (tileLayer) {
        let timedOut = false
        const timer = setTimeout(() => {
          timedOut = true
          capturar()
        }, 3000)

        tileLayer.once('load', () => {
          if (!timedOut) {
            clearTimeout(timer)
            setTimeout(capturar, 200)
          }
        })
      } else {
        setTimeout(capturar, 2500)
      }

    }, 150)
  })
}

// ── CAPTURA DE PÁGINA PDF ─────────────────────────────────────
async function capturarPagina(elemento) {
  const contenedor = document.createElement('div')
  contenedor.style.cssText = 'position:fixed;top:-9999px;left:-9999px;z-index:-1;'
  document.body.appendChild(contenedor)
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(contenedor)
  await new Promise(resolve => { root.render(elemento); setTimeout(resolve, 400) })
  const nodo = contenedor.firstChild
  const canvas = await html2canvas(nodo, {
    scale: 2, useCORS: true, allowTaint: false,
    backgroundColor: '#ffffff', logging: false,
    width: A4_W, height: A4_H, windowWidth: A4_W, windowHeight: A4_H,
  })
  root.unmount()
  document.body.removeChild(contenedor)
  return canvas
}

// ── HEADER / FOOTER ───────────────────────────────────────────
function HeaderOS({ os, pagina, totalPaginas, esPrimera = false }) {
  if (esPrimera) {
    return (
      <div style={{ background:C.azul, padding:`${sc(28)}px ${sc(40)}px ${sc(24)}px`, position:'relative', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:sc(18) }}>
          <div style={{ display:'flex', alignItems:'center', gap:sc(12) }}>
            <div style={{ width:sc(40), height:sc(40), background:C.amarillo, borderRadius:sc(10), display:'flex', alignItems:'center', justifyContent:'center', fontSize:sc(14), fontWeight:800, color:C.azul, flexShrink:0 }}>BA</div>
            <div>
              <div style={{ fontSize:sc(16), fontWeight:700, color:'#fff' }}>Plataforma CAT</div>
              <div style={{ fontSize:sc(10), color:'rgba(255,255,255,0.45)' }}>Cuerpo de Agentes de Transito · GCBA</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:sc(10), color:'rgba(255,255,255,0.4)', marginBottom:sc(2) }}>Orden de Servicio Adicional</div>
            <div style={{ fontSize:sc(10), color:'rgba(255,255,255,0.4)' }}>{hoy()}</div>
          </div>
        </div>
        <div style={{ fontSize:sc(10), fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:sc(6) }}>Operativo adicional</div>
        <div style={{ fontSize:sc(24), fontWeight:800, color:'#fff', letterSpacing:'-0.5px', lineHeight:1.2 }}>{os?.nombre || 'Operativo'}</div>
        {os?.evento_motivo && <div style={{ fontSize:sc(13), color:'rgba(255,255,255,0.6)', marginTop:sc(6) }}>{os.evento_motivo}</div>}
        <div style={{ position:'absolute', bottom:0, left:sc(40), right:sc(40), height:3, background:C.amarillo, borderRadius:'3px 3px 0 0' }}/>
      </div>
    )
  }
  return (
    <div style={{ background:C.azul, padding:`${sc(12)}px ${sc(40)}px`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:sc(10) }}>
        <div style={{ width:sc(28), height:sc(28), background:C.amarillo, borderRadius:sc(7), display:'flex', alignItems:'center', justifyContent:'center', fontSize:sc(10), fontWeight:800, color:C.azul, flexShrink:0 }}>BA</div>
        <div>
          <div style={{ fontSize:sc(11), fontWeight:700, color:'#fff' }}>Plataforma CAT <span style={{ fontFamily:'monospace', opacity:0.5, fontSize:sc(9) }}>· OS Adicional</span></div>
          <div style={{ fontSize:sc(10), color:'rgba(255,255,255,0.4)' }}>{os?.nombre}</div>
        </div>
      </div>
      <div style={{ fontSize:sc(10), color:'rgba(255,255,255,0.4)', fontFamily:'monospace', flexShrink:0 }}>Pag {pagina} / {totalPaginas}</div>
    </div>
  )
}

function FooterOS({ pagina, totalPaginas }) {
  return (
    <div style={{ background:C.azul, padding:`${sc(11)}px ${sc(40)}px`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
      <div style={{ fontSize:sc(9), color:'rgba(255,255,255,0.4)' }}>Generado {hoy()} · Plataforma CAT</div>
      <div style={{ display:'flex', alignItems:'center', gap:sc(5) }}>
        <div style={{ width:sc(16), height:sc(16), background:C.amarillo, borderRadius:sc(3), display:'flex', alignItems:'center', justifyContent:'center', fontSize:sc(7), fontWeight:800, color:C.azul }}>BA</div>
        <span style={{ fontSize:sc(9), color:'rgba(255,255,255,0.4)' }}>GCBA · Pagina {pagina} de {totalPaginas}</span>
      </div>
    </div>
  )
}

// ── PÁGINA PORTADA ────────────────────────────────────────────
function PaginaPortada({ os, fases, mapaDataUrl, altMapa, objetivo, totalPaginas, recursos }) {
  const fechas     = os?.fechas || []
  const horaDesde  = fmtHora(os?.horario_desde)
  const horaHasta  = fmtHora(os?.horario_hasta)
  const dotAgentes = os?.dotacion_agentes || 0
  const dotSup     = os?.dotacion_supervisores || 0
  const dotMot     = os?.dotacion_motorizados || 0
  const recursosConCantidad = (recursos || []).filter(r => r.cantidad > 0)
  const fasesConElementos = fases.filter(f => (f.elementos||[]).length > 0)

  return (
    <div style={{ width:A4_W, height:A4_H, background:'#fff', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color:'#1d1d1f', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <HeaderOS os={os} pagina={1} totalPaginas={totalPaginas} esPrimera/>
      <div style={{ flex:1, padding:`${PAD_TOP}px ${PAD_X}px 0`, overflow:'hidden', display:'flex', flexDirection:'column' }}>

        <div style={{ display:'flex', gap:sc(10), marginBottom:sc(12) }}>
          <div style={{ flex:2, background:C.grisClaro, borderRadius:sc(10), padding:`${sc(11)}px ${sc(13)}px` }}>
            <div style={{ fontSize:sc(9), fontWeight:700, color:C.gris, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:sc(4) }}>Fechas</div>
            <div style={{ fontSize:sc(13), fontWeight:700, color:C.azul }}>{fmtFechasCorto(fechas)}</div>
            <div style={{ fontSize:sc(10), color:C.gris, marginTop:sc(2) }}>{fechas.length} dia{fechas.length !== 1 ? 's' : ''} de operativo</div>
          </div>
          {(horaDesde || horaHasta) && (
            <div style={{ flex:1, background:C.grisClaro, borderRadius:sc(10), padding:`${sc(11)}px ${sc(13)}px` }}>
              <div style={{ fontSize:sc(9), fontWeight:700, color:C.gris, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:sc(4) }}>Horario</div>
              <div style={{ fontSize:sc(13), fontWeight:700, color:C.azul }}>{horaDesde || '?'} – {horaHasta || '?'} hs</div>
            </div>
          )}
          <div style={{ flex:1, background:'#e8faf2', borderRadius:sc(10), padding:`${sc(11)}px ${sc(13)}px` }}>
            <div style={{ fontSize:sc(9), fontWeight:700, color:C.verde, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:sc(4) }}>Cobertura</div>
            <div style={{ fontSize:sc(13), fontWeight:700, color:C.verde }}>DGCAT</div>
          </div>
        </div>

        {objetivo && (
          <div style={{ marginBottom:sc(12) }}>
            <div style={{ fontSize:sc(9), fontWeight:700, color:C.gris, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:sc(6) }}>Objetivo del operativo</div>
            <div style={{ background:C.grisClaro, borderRadius:sc(10), padding:`${sc(12)}px ${sc(14)}px`, fontSize:sc(12), color:'#3d3d3a', lineHeight:1.65 }}>{objetivo}</div>
          </div>
        )}

        <div style={{ marginBottom:sc(10), flexShrink:0 }}>
          <div style={{ fontSize:sc(9), fontWeight:700, color:C.gris, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:sc(6) }}>Mapa del operativo</div>
          {mapaDataUrl ? (
            <img src={mapaDataUrl} style={{
              width: BODY_W, height: altMapa, objectFit: 'fill', display: 'block',
              borderRadius: fasesConElementos.length > 0 ? `${sc(10)}px ${sc(10)}px 0 0` : sc(10),
              border: `1px solid #e5e5ea`,
              borderBottom: fasesConElementos.length > 0 ? 'none' : undefined,
            }} alt="mapa"/>
          ) : (
            <div style={{ width:BODY_W, height:altMapa, borderRadius:sc(10), background:C.grisClaro, display:'flex', alignItems:'center', justifyContent:'center', color:C.gris, fontSize:sc(12) }}>Mapa no disponible</div>
          )}
          {fasesConElementos.length > 0 && (
            <div style={{ background:'#f5f5f7', border:'1px solid #e5e5ea', borderTop:'none', borderRadius:`0 0 ${sc(10)}px ${sc(10)}px`, padding:`${sc(8)}px ${sc(14)}px`, display:'flex', flexWrap:'wrap', gap:sc(16), alignItems:'center' }}>
              <span style={{ fontSize:sc(9), fontWeight:700, color:C.gris, textTransform:'uppercase', letterSpacing:'0.05em', flexShrink:0 }}>Fases:</span>
              {fasesConElementos.map(fase => (
                <div key={fase.id} style={{ display:'flex', alignItems:'center', gap:sc(6), flexShrink:0 }}>
                  <div style={{ width:sc(10), height:sc(10), borderRadius:'50%', background:fase.color, boxShadow:`0 0 0 2px ${fase.color}44` }}/>
                  <span style={{ fontSize:sc(10), fontWeight:600, color:C.azul }}>{fase.nombre}</span>
                  <span style={{ fontSize:sc(9), color:C.gris }}>({(fase.elementos||[]).length})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:sc(10), flex:1, marginBottom:sc(14) }}>
          <div style={{ flex:1.3, background:C.grisClaro, borderRadius:sc(10), padding:`${sc(11)}px ${sc(13)}px` }}>
            <div style={{ fontSize:sc(9), fontWeight:700, color:C.gris, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:sc(9) }}>Dotacion declarada</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:sc(7) }}>
              {[['Agentes', dotAgentes, C.azul], ['Supervisores', dotSup, C.teal], ['Motorizados', dotMot, C.verde]].map(([label, val, color]) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:sc(6), background:'#fff', borderRadius:sc(8), padding:`${sc(7)}px ${sc(10)}px`, border:`1px solid ${color}22` }}>
                  <span style={{ fontSize:sc(18), fontWeight:800, color, lineHeight:1 }}>{val}</span>
                  <span style={{ fontSize:sc(9), color:C.gris }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex:1, background:C.grisClaro, borderRadius:sc(10), padding:`${sc(11)}px ${sc(13)}px` }}>
            <div style={{ fontSize:sc(9), fontWeight:700, color:C.gris, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:sc(9) }}>Materiales</div>
            {recursosConCantidad.length === 0 ? (
              <span style={{ fontSize:sc(11), color:C.gris, fontStyle:'italic' }}>Sin materiales</span>
            ) : (
              <div style={{ display:'flex', flexWrap:'wrap', gap:sc(6) }}>
                {recursosConCantidad.map((r, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:sc(5), background:'#fff', borderRadius:sc(7), padding:`${sc(5)}px ${sc(9)}px`, border:`0.5px solid #e5e5ea` }}>
                    <span style={{ fontSize:sc(14), fontWeight:800, color:C.azul }}>{r.cantidad}</span>
                    <span style={{ fontSize:sc(10), color:C.gris }}>{r.tipo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
      <FooterOS pagina={1} totalPaginas={totalPaginas}/>
    </div>
  )
}

// ── PÁGINA DE FASE ────────────────────────────────────────────
function PaginaFase({ os, fase, mapaDataUrl, altMapa, instruccionGeneral, pagina, totalPaginas }) {
  const horaDesde = fmtHora(fase?.horario_desde)
  const horaHasta = fmtHora(fase?.horario_hasta)
  const elementos = fase?.elementos || []
  const hayElementos = elementos.length > 0

  return (
    <div style={{ width:A4_W, height:A4_H, background:'#fff', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color:'#1d1d1f', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <HeaderOS os={os} pagina={pagina} totalPaginas={totalPaginas}/>
      <div style={{ flex:1, padding:`${PAD_TOP}px ${PAD_X}px 0`, overflow:'hidden', display:'flex', flexDirection:'column' }}>

        <div style={{ display:'flex', alignItems:'center', gap:sc(10), marginBottom:sc(14), paddingBottom:sc(12), borderBottom:`2px solid ${fase.color}` }}>
          <div style={{ width:sc(14), height:sc(14), borderRadius:'50%', background:fase.color, flexShrink:0, boxShadow:`0 0 0 3px ${fase.color}30` }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:sc(20), fontWeight:800, color:C.azul }}>{fase.nombre}</div>
            {(horaDesde || horaHasta) && (
              <div style={{ fontSize:sc(11), color:C.gris, marginTop:sc(2) }}>Horario: {horaDesde || '?'} – {horaHasta || '?'} hs</div>
            )}
          </div>
          <div style={{ background:`${fase.color}18`, border:`1px solid ${fase.color}44`, borderRadius:sc(10), padding:`${sc(7)}px ${sc(13)}px`, textAlign:'center' }}>
            <div style={{ fontSize:sc(18), fontWeight:800, color:fase.color }}>{elementos.length}</div>
            <div style={{ fontSize:sc(9), color:fase.color, opacity:0.8 }}>elemento{elementos.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div style={{ marginBottom:sc(14), flexShrink:0 }}>
          <div style={{ fontSize:sc(9), fontWeight:700, color:C.gris, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:sc(6) }}>Disposicion en mapa</div>
          {mapaDataUrl ? (
            <img src={mapaDataUrl} style={{ width:BODY_W, height:altMapa, objectFit:'fill', borderRadius:sc(10), display:'block', border:`1.5px solid ${fase.color}55` }} alt="mapa fase"/>
          ) : (
            <div style={{ width:BODY_W, height:altMapa, borderRadius:sc(10), background:C.grisClaro, display:'flex', alignItems:'center', justifyContent:'center', color:C.gris, fontSize:sc(12) }}>Mapa no disponible</div>
          )}
        </div>

        {hayElementos && (
          <div style={{ marginBottom: instruccionGeneral ? sc(14) : 0, flex:1, overflow:'hidden' }}>
            <div style={{ fontSize:sc(9), fontWeight:700, color:C.gris, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:sc(6) }}>Elementos operativos</div>
            <div style={{ background:C.grisClaro, borderRadius:sc(10), overflow:'hidden' }}>
              <div style={{ display:'flex', gap:sc(6), padding:`${sc(8)}px ${sc(12)}px`, background:C.azul }}>
                <div style={{ width:sc(24), fontSize:sc(9), fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase' }}>#</div>
                <div style={{ width:sc(54), fontSize:sc(9), fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase' }}>Tipo</div>
                <div style={{ flex:1.2, fontSize:sc(9), fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase' }}>Nombre</div>
                <div style={{ flex:2, fontSize:sc(9), fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase' }}>Instruccion</div>
              </div>
              {elementos.map((el, i) => (
                <div key={el.id || i} style={{ display:'flex', gap:sc(6), padding:`${sc(9)}px ${sc(12)}px`, borderTop: i > 0 ? `0.5px solid #e5e5ea` : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa', alignItems:'flex-start' }}>
                  {/* Número en la tabla — mismo SVG integrado, pequeño */}
                  <div style={{ width:sc(24), flexShrink:0, display:'flex', alignItems:'center' }}>
                    <div style={{ width:sc(18), height:sc(18), borderRadius:'50%', background:fase.color, color:'#fff', fontSize:sc(10), fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid white', boxShadow:`0 1px 3px ${fase.color}66` }}>{i + 1}</div>
                  </div>
                  <div style={{ width:sc(54), flexShrink:0, display:'flex', alignItems:'center', gap:sc(4) }}>
                    <span style={{ fontSize:sc(11), color:fase.color }}>{TIPO_ICON[el.tipo] || '●'}</span>
                    <span style={{ fontSize:sc(10), color:C.gris }}>{TIPO_LABEL_CORTO[el.tipo] || el.tipo}</span>
                  </div>
                  <div style={{ flex:1.2, fontSize:sc(11), fontWeight:600, color:C.azul, wordBreak:'break-word' }}>
                    {el.nombre || <span style={{ color:C.gris, fontStyle:'italic', fontWeight:400 }}>Sin nombre</span>}
                  </div>
                  <div style={{ flex:2, fontSize:sc(10), color:'#3d3d3a', lineHeight:1.5, wordBreak:'break-word' }}>
                    {el.instruccion || <span style={{ color:C.gris, fontStyle:'italic' }}>Sin instruccion</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {instruccionGeneral && (
          <div style={{ marginBottom:sc(14), flexShrink:0 }}>
            <div style={{ fontSize:sc(9), fontWeight:700, color:C.gris, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:sc(6) }}>Instrucciones generales de la fase</div>
            <div style={{ background:`${fase.color}0e`, border:`1px solid ${fase.color}33`, borderRadius:sc(10), padding:`${sc(12)}px ${sc(14)}px`, fontSize:sc(12), color:'#3d3d3a', lineHeight:1.65 }}>
              {instruccionGeneral}
            </div>
          </div>
        )}

      </div>
      <FooterOS pagina={pagina} totalPaginas={totalPaginas}/>
    </div>
  )
}

// ── DRAWER ────────────────────────────────────────────────────
function DrawerPreview({ os, fases, recursos, onGenerar, onCerrar, generando }) {
  const [objetivo,      setObjetivo]      = useState('')
  const [instrucciones, setInstrucciones] = useState(() => {
    const init = {}
    fases.forEach(f => { init[f.id] = '' })
    return init
  })
  const INP = { width:'100%', background:'#f5f5f7', border:'none', borderRadius:10, padding:'9px 12px', fontSize:13, color:'#1d1d1f', fontFamily:'inherit', outline:'none', boxSizing:'border-box', resize:'none' }

  return createPortal(
    <>
      <div onClick={generando ? undefined : onCerrar} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.26)', backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)', zIndex:8998, cursor: generando ? 'default' : 'pointer' }}/>
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:420, background:'#fff', boxShadow:'-8px 0 40px rgba(0,0,0,0.14)', display:'flex', flexDirection:'column', zIndex:8999 }}>
        <div style={{ padding:'20px 22px 16px', borderBottom:'0.5px solid #ebebeb', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:'#1a2744' }}>Vista previa del PDF</div>
              <div style={{ fontSize:12, color:'#8e8e93', marginTop:3 }}>Completa los datos antes de generar</div>
            </div>
            <button onClick={generando ? undefined : onCerrar} style={{ background:'#f5f5f7', border:'none', borderRadius:9, cursor: generando ? 'not-allowed' : 'pointer', color:'#636366', padding:'7px 9px', display:'flex', opacity: generando ? 0.4 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'18px 22px' }}>
          <div style={{ background:'#f5f5f7', borderRadius:12, padding:'12px 14px', marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#aeaeb2', letterSpacing:'0.05em', marginBottom:10 }}>ESTRUCTURA</div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
              <div style={{ width:24, height:24, borderRadius:6, background:'#1a2744', color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>1</div>
              <span style={{ fontSize:12, color:'#1d1d1f', fontWeight:500 }}>Portada · mapa general · dotacion · materiales</span>
            </div>
            {fases.map((fase, i) => (
              <div key={fase.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom: i < fases.length - 1 ? 7 : 0 }}>
                <div style={{ width:24, height:24, borderRadius:6, background:fase.color, color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i + 2}</div>
                <span style={{ fontSize:12, color:'#1d1d1f', fontWeight:500 }}>{fase.nombre}</span>
                <span style={{ fontSize:11, color:'#aeaeb2' }}>{(fase.elementos || []).length} elem.</span>
              </div>
            ))}
          </div>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#aeaeb2', letterSpacing:'0.05em', marginBottom:7 }}>OBJETIVO DEL OPERATIVO</div>
            <textarea value={objetivo} onChange={e => setObjetivo(e.target.value)} placeholder="Describe el objetivo... (opcional)" rows={4} style={INP}/>
          </div>
          {fases.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#aeaeb2', letterSpacing:'0.05em', marginBottom:12 }}>INSTRUCCIONES POR FASE</div>
              {fases.map(fase => (
                <div key={fase.id} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:fase.color, flexShrink:0 }}/>
                    <span style={{ fontSize:12, fontWeight:600, color:'#1a2744' }}>{fase.nombre}</span>
                  </div>
                  <textarea value={instrucciones[fase.id] || ''} onChange={e => setInstrucciones(prev => ({ ...prev, [fase.id]: e.target.value }))} placeholder={`Instrucciones para ${fase.nombre}...`} rows={3} style={INP}/>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding:'16px 22px', borderTop:'0.5px solid #ebebeb', flexShrink:0 }}>
          <button onClick={() => onGenerar({ objetivo, instrucciones })} disabled={generando}
            style={{ width:'100%', padding:'13px', borderRadius:13, border:'none', background: generando ? '#e5e5ea' : '#1a2744', color: generando ? '#8e8e93' : '#fff', fontSize:14, fontWeight:700, cursor: generando ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {generando ? (
              <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation:'spin 1s linear infinite' }}><path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round"/></svg>Generando...</>
            ) : (
              <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Generar PDF</>
            )}
          </button>
          <div style={{ fontSize:11, color:'#aeaeb2', textAlign:'center', marginTop:9 }}>
            {1 + fases.length} paginas · Formato A4
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </>,
    document.body
  )
}

// ── HOOK PRINCIPAL ────────────────────────────────────────────
export function useReporteOSAdicional() {
  const [drawerAbierto, setDrawerAbierto] = useState(false)
  const [generando,     setGenerando]     = useState(false)

  async function generarPDF(os, fases, recursos, { objetivo, instrucciones }) {
    setGenerando(true)
    try {
      const totalPaginas   = 1 + fases.length
      const altMapaPortada = sc(objetivo ? 220 : 310)
      const altMapaFase    = sc(290)

      const [mapaGlobal, ...mapasFases] = await Promise.all([
        generarImagenMapa({ fases, width: BODY_W, height: altMapaPortada }),
        ...fases.map(fase =>
          generarImagenMapa({ fases, filtroFaseId: fase.id, width: BODY_W, height: altMapaFase })
        ),
      ])

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const pW  = pdf.internal.pageSize.getWidth()
      const pH  = pdf.internal.pageSize.getHeight()

      const c1 = await capturarPagina(
        <PaginaPortada os={os} fases={fases} mapaDataUrl={mapaGlobal}
          altMapa={altMapaPortada} objetivo={objetivo}
          totalPaginas={totalPaginas} recursos={recursos}/>
      )
      pdf.addImage(c1.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, pW, pH)

      for (let i = 0; i < fases.length; i++) {
        pdf.addPage()
        const fase = fases[i]
        const cn = await capturarPagina(
          <PaginaFase os={os} fase={fase} mapaDataUrl={mapasFases[i]}
            altMapa={altMapaFase}
            instruccionGeneral={instrucciones[fase.id] || ''}
            pagina={i + 2} totalPaginas={totalPaginas}/>
        )
        pdf.addImage(cn.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, pW, pH)
      }

      const nombre = (os?.nombre || 'operativo').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      pdf.save(`CAT_OS_${nombre}_${new Date().toISOString().slice(0, 10)}.pdf`)

    } catch (err) {
      console.error('Error generando PDF:', err)
      alert('Error al generar el PDF. Revisa la consola.')
    } finally {
      setGenerando(false)
      setDrawerAbierto(false)
    }
  }

  return { drawerAbierto, setDrawerAbierto, generando, generarPDF }
}

// ── BOTÓN ─────────────────────────────────────────────────────
export function BtnReporteOSAdicional({ os, fases = [], recursos = [] }) {
  const { drawerAbierto, setDrawerAbierto, generando, generarPDF } = useReporteOSAdicional()

  return (
    <>
      <button onClick={() => setDrawerAbierto(true)}
        style={{ padding:'6px 14px', borderRadius:9, border:'0.5px solid #e5e5ea', background:'#fff', color:'#185fa5', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        PDF
      </button>
      {drawerAbierto && (
        <DrawerPreview os={os} fases={fases} recursos={recursos} generando={generando}
          onCerrar={() => setDrawerAbierto(false)}
          onGenerar={(datos) => generarPDF(os, fases, recursos, datos)}/>
      )}
    </>
  )
}
