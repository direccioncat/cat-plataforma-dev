/**
 * ReportePDF.jsx  —  v13
 *
 * Fix 1: Fotos verticales — máximo 2 por fila siempre (2×2 para 4 fotos)
 * Fix 2: Reporte de cierre largo — se trunca en p1 y continúa en p2
 */

import { useState } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// ── FACTOR DE ESCALA ──────────────────────────────────────────
const S = 1.25

// ── CONSTANTES A4 ─────────────────────────────────────────────
const A4_W        = 794
const A4_H        = 1123
const PAD_X       = Math.round(40 * S)
const PAD_TOP     = Math.round(22 * S)
const HEADER_H    = Math.round(152 * S)
const HEADER_C_H  = Math.round(52 * S)
const FOOTER_H    = Math.round(46 * S)
const EVENTO_H    = Math.round(44 * S)
const HIST_LABEL  = Math.round(28 * S)
const FOTO_LABEL  = Math.round(26 * S)
const GAP         = Math.round(10 * S)
const BODY_W      = A4_W - PAD_X * 2
const BODY_P2     = A4_H - HEADER_C_H - FOOTER_H - PAD_TOP - PAD_TOP

// Caracteres aprox. que caben en el reporte de cierre dentro de página 1
// Estimación conservadora: ancho útil / fontSize * líneas disponibles
// Se usa para truncar y continuar en página 2
const REPORTE_FONT_PX = Math.round(12 * S)  // fontSize del texto del reporte
const CHARS_POR_LINEA = Math.floor(BODY_W / (REPORTE_FONT_PX * 0.52))  // ~0.52em por char
const MAX_LINEAS_REPORTE_P1 = 5  // máximo de líneas del reporte en página 1
const MAX_CHARS_REPORTE_P1  = CHARS_POR_LINEA * MAX_LINEAS_REPORTE_P1

const sc = n => Math.round(n * S)

const COLORES = {
  azul:      '#1a2744', amarillo: '#f5c800', verde: '#0f6e56',
  rojo:      '#e24b4a', gris: '#8e8e93',    grisClaro: '#f5f5f7',
  azulMedio: '#185fa5',
}
const ESTADOS_LABEL = {
  sin_asignar:'Sin asignar', asignada:'Asignada', en_curso:'En curso',
  cumplida:'Cumplida', rechazada:'Rechazada', incumplida:'Incumplida',
}
const ESTADOS_COLOR = {
  sin_asignar:{ bg:'#fce8e8', color:'#a32d2d' },
  asignada:   { bg:'#faeeda', color:'#854f0b' },
  en_curso:   { bg:'#e8f0fe', color:'#185fa5' },
  cumplida:   { bg:'#e8faf2', color:'#0f6e56' },
  rechazada:  { bg:'#fce8e8', color:'#a32d2d' },
  incumplida: { bg:'#f5f5f7', color:'#aeaeb2' },
}
const ACCION_LABEL = {
  asignada:'Misión asignada', aceptada:'Misión aceptada por el agente',
  tomada:'Tomada por el supervisor', rechazada:'Rechazada',
  cumplida:'Misión cumplida', cumplida_post_interrupcion:'Completada tras interrupción',
  incumplida:'Incumplida', interrumpida:'Interrumpida — reasignación',
  desasignado:'Agente desasignado', liberado:'Agente liberado',
  encargado_promovido:'Nuevo encargado asignado',
}
const ACCION_COLOR = {
  asignada:'#854f0b', aceptada:'#185fa5', tomada:'#185fa5',
  cumplida:'#0f6e56', cumplida_post_interrupcion:'#0f6e56',
  rechazada:'#a32d2d', incumplida:'#aeaeb2',
  interrumpida:'#854f0b', desasignado:'#aeaeb2', liberado:'#aeaeb2',
  encargado_promovido:'#185fa5',
}

// ── UTILS ─────────────────────────────────────────────────────
function fmt(f) {
  if (!f) return '—'
  return new Date(f).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
}
function fmtDia(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'})
}
function codigoMision(m) {
  return `${m.numero_mision?`M-${String(m.numero_mision).padStart(4,'0')}`:'—'} / ${m.numero_orden_servicio??'—'}`
}
function getFechaAsignacion(m) {
  const h = Array.isArray(m.historial)?m.historial:[]
  return h.find(x=>x.accion==='asignada')?.fecha??null
}
function calcStats(m) {
  const h  = Array.isArray(m.historial)?m.historial:[]
  const fa = getFechaAsignacion(m)
  const pa = h.find(x=>x.accion==='aceptada')
  const mins=(a,b)=>!a||!b?null:Math.round((new Date(b)-new Date(a))/60000)
  const fmtM=n=>n===null?'—':n<60?`${n} min`:`${Math.floor(n/60)} h ${n%60} min`
  return {
    duracion: fmtM(mins(fa??m.created_at,m.cerrada_en)),
    respuesta:fmtM(mins(fa??m.created_at,pa?.fecha)),
    ejecucion:fmtM(mins(m.iniciada_en,m.cerrada_en)),
  }
}

// Divide el texto del reporte: parte que va en p1, continuación en p2
function dividirReporte(texto) {
  if (!texto) return { p1: null, p2: null }
  if (texto.length <= MAX_CHARS_REPORTE_P1) return { p1: texto, p2: null }
  // Buscar un corte limpio (espacio) cerca del límite
  let corte = MAX_CHARS_REPORTE_P1
  while (corte > MAX_CHARS_REPORTE_P1 - 40 && texto[corte] !== ' ') corte--
  return {
    p1: texto.slice(0, corte).trimEnd() + '…',
    p2: texto.slice(corte).trimStart(),
  }
}

// ── DETECCIÓN DE ORIENTACIÓN ──────────────────────────────────
async function detectarOrientaciones(urls) {
  return Promise.all(urls.map((url,index)=>new Promise(resolve=>{
    const img=new window.Image()
    img.crossOrigin='anonymous'
    img.onload =()=>resolve({url,index,landscape:img.naturalWidth>=img.naturalHeight})
    img.onerror=()=>resolve({url,index,landscape:true})
    img.src=url
  })))
}

// ── CÁLCULO DE LAYOUT DE FOTOS ────────────────────────────────
function calcLayout(fotos, espacioDisponible) {
  const H = fotos.filter(f=>f.landscape)
  const V = fotos.filter(f=>!f.landscape)

  const porFilaH = H.length===1 ? 1 : 2
  // Fix: verticales siempre de a 2 por fila máximo → 2×2 para 4 fotos, mejor proporción
  const porFilaV = V.length===1 ? 1 : 2
  const filasH = H.length>0 ? Math.ceil(H.length/porFilaH) : 0
  const filasV = V.length>0 ? Math.ceil(V.length/porFilaV) : 0
  const totalFilas = filasH + filasV

  const espImgs = espacioDisponible - FOTO_LABEL - (totalFilas>0?(totalFilas-1)*GAP:0) - 8

  if (totalFilas === 0) return { alturaH:0, anchoH:0, alturaV:0, anchoV:0, porFilaH, porFilaV }

  // Landscape: ancho según cuántas por fila
  const anchoH = porFilaH===1 ? BODY_W : Math.floor((BODY_W - GAP) / 2)

  // Portrait: 2 por fila → ancho = mitad del BODY_W
  const anchoV = Math.floor((BODY_W - GAP) / 2)
  // Altura portrait: ratio 3:4 (portrait natural)
  const alturaV_natural = Math.floor(anchoV * (4/3))

  const espacioV = filasV > 0 ? filasV * alturaV_natural : 0
  const espacioH = espImgs - espacioV

  let alturaH = filasH > 0 ? Math.floor(espacioH / filasH) : 0
  alturaH = Math.max(sc(80), Math.min(alturaH, Math.floor(anchoH * (9/16) * 1.5)))

  let alturaV = alturaV_natural
  if (filasV === 0 && filasH > 0) {
    alturaH = Math.max(sc(100), Math.floor(espImgs / filasH))
    alturaH = Math.min(alturaH, Math.floor(anchoH * (3/2)))
  }
  if (filasH === 0 && filasV > 0) {
    // Solo portrait: distribuir todo el espacio entre las filas
    const altDisp = Math.floor(espImgs / filasV)
    alturaV = Math.max(sc(120), altDisp)
    // Clampear al ratio máximo para que no queden demasiado altas
    alturaV = Math.min(alturaV, Math.floor(anchoV * 2))
  }

  return { alturaH, anchoH, alturaV, anchoV, porFilaH, porFilaV }
}

// ── COMPONENTE GALERÍA ────────────────────────────────────────
function GaleriaFotos({ fotos, espacioDisponible }) {
  if (!fotos || fotos.length === 0) return null

  const H = fotos.filter(f=>f.landscape)
  const V = fotos.filter(f=>!f.landscape)
  const { alturaH, anchoH, alturaV, anchoV, porFilaH, porFilaV } = calcLayout(fotos, espacioDisponible)

  const badge = n => (
    <div style={{position:'absolute',top:sc(7),left:sc(7),background:COLORES.azul,color:'#fff',fontSize:sc(9),fontWeight:700,borderRadius:sc(5),padding:`1px ${sc(6)}px`,zIndex:1}}>
      {String(n+1).padStart(2,'0')}
    </div>
  )
  const marco = (w, h) => ({
    borderRadius:sc(10), overflow:'hidden',
    border:`2px solid ${COLORES.azul}`,
    boxShadow:`0 2px ${sc(8)}px rgba(26,39,68,0.15)`,
    position:'relative', flexShrink:0,
    width:w, height:h,
  })

  const filasH=[], filasV=[]
  for (let i=0; i<H.length; i+=porFilaH) filasH.push(H.slice(i,i+porFilaH))
  for (let i=0; i<V.length; i+=porFilaV) filasV.push(V.slice(i,i+porFilaV))

  return (
    <div>
      <div style={{fontSize:sc(9),fontWeight:700,color:COLORES.gris,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:sc(8)}}>
        Fotografías adjuntas ({fotos.length})
      </div>

      {/* Landscape: 1 o 2 por fila */}
      {filasH.map((fila,fi)=>(
        <div key={`h${fi}`} style={{display:'flex',gap:GAP,marginBottom:GAP}}>
          {fila.map(f=>(
            <div key={f.index} style={marco(fila.length===1 ? BODY_W : anchoH, alturaH)}>
              {badge(f.index)}
              <img src={f.url} alt={`Foto ${f.index+1}`}
                style={{width:'100%',height:alturaH,objectFit:'cover',display:'block'}}
                crossOrigin="anonymous"/>
            </div>
          ))}
        </div>
      ))}

      {/* Portrait: siempre 2 por fila → 2×2 para 4 fotos */}
      {filasV.map((fila,fi)=>(
        <div key={`v${fi}`} style={{display:'flex',gap:GAP,marginBottom:GAP}}>
          {fila.map(f=>(
            <div key={f.index} style={marco(anchoV, alturaV)}>
              {badge(f.index)}
              <img src={f.url} alt={`Foto ${f.index+1}`}
                style={{width:anchoV,height:alturaV,objectFit:'cover',display:'block'}}
                crossOrigin="anonymous"/>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── BLOQUE REPORTE DE CIERRE ──────────────────────────────────
function BloqueReporte({ mision, texto }) {
  if (!texto) return null
  return (
    <div style={{marginBottom:sc(12)}}>
      <div style={{fontSize:sc(9),fontWeight:700,color:COLORES.gris,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:sc(6)}}>Reporte de cierre</div>
      <div style={{background:'#e8faf2',border:'1px solid #b5e8d0',borderRadius:sc(10),padding:`${sc(13)}px ${sc(15)}px`}}>
        <div style={{display:'flex',alignItems:'center',gap:sc(6),marginBottom:sc(6)}}>
          <div style={{width:sc(7),height:sc(7),borderRadius:'50%',background:COLORES.verde,flexShrink:0}}/>
          <span style={{fontSize:sc(10),fontWeight:700,color:COLORES.verde,textTransform:'uppercase',letterSpacing:'0.05em'}}>{ESTADOS_LABEL[mision.estado]??'Cerrada'}</span>
        </div>
        <div style={{fontSize:sc(12),color:'#2d4a3e',lineHeight:1.6,wordBreak:'break-word'}}>{texto}</div>
      </div>
    </div>
  )
}

// ── HEADER / FOOTER / HEADERS COMPACTOS ───────────────────────
function Header({ mision }) {
  const es=ESTADOS_COLOR[mision.estado]??ESTADOS_COLOR.sin_asignar
  const esU=mision.prioridad==='urgente'
  return (
    <div style={{background:COLORES.azul,padding:`${sc(28)}px ${sc(40)}px ${sc(24)}px`,position:'relative',flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:sc(20)}}>
        <div style={{display:'flex',alignItems:'center',gap:sc(12)}}>
          <div style={{width:sc(40),height:sc(40),background:COLORES.amarillo,borderRadius:sc(10),display:'flex',alignItems:'center',justifyContent:'center',fontSize:sc(14),fontWeight:800,color:COLORES.azul,flexShrink:0}}>BA</div>
          <div>
            <div style={{fontSize:sc(16),fontWeight:700,color:'#fff',letterSpacing:'-0.3px'}}>Plataforma CAT</div>
            <div style={{fontSize:sc(10),color:'rgba(255,255,255,0.45)'}}>Cuerpo de Agentes de Tránsito · GCBA</div>
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:sc(10),color:'rgba(255,255,255,0.4)',marginBottom:sc(2)}}>Reporte de misión</div>
          <div style={{fontSize:sc(11),color:'rgba(255,255,255,0.7)',fontFamily:'monospace'}}>{codigoMision(mision)}</div>
          <div style={{fontSize:sc(10),color:'rgba(255,255,255,0.4)',marginTop:sc(2)}}>{fmtDia(new Date())}</div>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:sc(8),marginBottom:sc(6),flexWrap:'wrap'}}>
        {esU&&<span style={{fontSize:sc(10),fontWeight:800,color:'#fff',background:COLORES.rojo,padding:`2px ${sc(8)}px`,borderRadius:sc(5)}}>⚑ URGENTE</span>}
        <span style={{fontSize:sc(10),fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{mision.tipo}</span>
        <span style={{fontSize:sc(10),fontWeight:700,padding:`2px ${sc(9)}px`,borderRadius:sc(20),background:es.bg,color:es.color}}>{ESTADOS_LABEL[mision.estado]??mision.estado}</span>
      </div>
      <div style={{fontSize:sc(22),fontWeight:700,color:'#fff',letterSpacing:'-0.4px',lineHeight:1.2,wordBreak:'break-word'}}>{mision.titulo}</div>
      <div style={{position:'absolute',bottom:0,left:sc(40),right:sc(40),height:3,background:COLORES.amarillo,borderRadius:'3px 3px 0 0'}}/>
    </div>
  )
}

function HeaderCompacto({ mision, pagina, totalPaginas }) {
  return (
    <div style={{background:COLORES.azul,padding:`${sc(12)}px ${sc(40)}px`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',gap:sc(10)}}>
        <div style={{width:sc(28),height:sc(28),background:COLORES.amarillo,borderRadius:sc(7),display:'flex',alignItems:'center',justifyContent:'center',fontSize:sc(10),fontWeight:800,color:COLORES.azul,flexShrink:0}}>BA</div>
        <div>
          <div style={{fontSize:sc(11),fontWeight:700,color:'#fff'}}>Plataforma CAT <span style={{fontFamily:'monospace',opacity:0.6,fontSize:sc(10)}}>· {codigoMision(mision)}</span></div>
          <div style={{fontSize:sc(10),color:'rgba(255,255,255,0.4)',wordBreak:'break-word'}}>{mision.titulo}</div>
        </div>
      </div>
      <div style={{fontSize:sc(10),color:'rgba(255,255,255,0.4)',fontFamily:'monospace',flexShrink:0,marginLeft:sc(16)}}>Página {pagina} de {totalPaginas}</div>
    </div>
  )
}

function Footer({ generadoPor, pagina, totalPaginas }) {
  return (
    <div style={{background:COLORES.azul,padding:`${sc(11)}px ${sc(40)}px`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
      <div>
        <div style={{fontSize:sc(9),color:'rgba(255,255,255,0.4)'}}>Generado por {generadoPor??'Plataforma CAT'} · {fmt(new Date())}</div>
        {pagina!=null&&<div style={{fontSize:sc(9),color:'rgba(255,255,255,0.25)',marginTop:1}}>Página {pagina} de {totalPaginas}</div>}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:sc(5)}}>
        <div style={{width:sc(18),height:sc(18),background:COLORES.amarillo,borderRadius:sc(4),display:'flex',alignItems:'center',justifyContent:'center',fontSize:sc(7),fontWeight:800,color:COLORES.azul,flexShrink:0}}>BA</div>
        <span style={{fontSize:sc(9),color:'rgba(255,255,255,0.4)'}}>Gobierno de la Ciudad de Buenos Aires</span>
      </div>
    </div>
  )
}

// ── PÁGINA 1 ──────────────────────────────────────────────────
function Pagina1({ mision, generadoPor, totalPaginas, reporteP1 }) {
  const agentes=Array.isArray(mision.agentes_asignados)?mision.agentes_asignados:[]
  const stats=calcStats(mision)
  const esU=mision.prioridad==='urgente'
  const fa=getFechaAsignacion(mision)

  return (
    <div style={{width:A4_W,height:A4_H,background:'#fff',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',color:'#1d1d1f',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <Header mision={mision}/>
      <div style={{flex:1,padding:`${PAD_TOP}px ${PAD_X}px 0`,overflow:'hidden'}}>

        <div style={{display:'flex',gap:sc(10),marginBottom:sc(12)}}>
          {[
            {label:'Dirección',value:mision.direccion,sub:mision.comuna},
            {label:'Base',value:mision.base??'Base Centro'},
            {label:'Prioridad',value:esU?'⚑ Urgente':'Normal'},
            {label:'Horario',value:mision.hora_programada?fmt(mision.hora_programada):'Sin programar'},
          ].map((d,i)=>(
            <div key={i} style={{flex:1,background:COLORES.grisClaro,borderRadius:sc(10),padding:`${sc(11)}px ${sc(13)}px`}}>
              <div style={{fontSize:sc(9),fontWeight:700,color:COLORES.gris,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:sc(4)}}>{d.label}</div>
              <div style={{fontSize:sc(12),fontWeight:600,color:'#1d1d1f',lineHeight:1.3,wordBreak:'break-word'}}>{d.value}</div>
              {d.sub&&<div style={{fontSize:sc(10),color:COLORES.gris,marginTop:sc(2)}}>{d.sub}</div>}
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:sc(10),marginBottom:sc(12)}}>
          {[
            {label:'Asignada',value:fmt(fa??mision.created_at)},
            {label:'Iniciada',value:fmt(mision.iniciada_en)},
            {label:'Cerrada', value:fmt(mision.cerrada_en)},
          ].map((d,i)=>(
            <div key={i} style={{flex:1,background:'#f0f4ff',borderRadius:sc(10),padding:`${sc(10)}px ${sc(13)}px`}}>
              <div style={{fontSize:sc(9),fontWeight:700,color:COLORES.azulMedio,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:sc(3)}}>{d.label}</div>
              <div style={{fontSize:sc(11),fontWeight:600,color:COLORES.azul}}>{d.value}</div>
            </div>
          ))}
        </div>

        <div style={{marginBottom:sc(12)}}>
          <div style={{fontSize:sc(9),fontWeight:700,color:COLORES.gris,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:sc(7)}}>Estadísticas de la misión</div>
          <div style={{display:'flex',gap:sc(10)}}>
            {[
              {label:'Duración total',     value:stats.duracion, icon:'⏱',bg:'#faf0ff',color:'#6b21a8',desc:'Asignación → cierre'},
              {label:'Tiempo de respuesta',value:stats.respuesta,icon:'⚡',bg:'#fffbeb',color:'#92400e',desc:'Hasta 1ª aceptación'},
              {label:'Tiempo de ejecución',value:stats.ejecucion,icon:'▶', bg:'#ecfdf5',color:'#065f46',desc:'Inicio → cierre'},
            ].map((s,i)=>(
              <div key={i} style={{flex:1,background:s.bg,borderRadius:sc(10),padding:`${sc(11)}px ${sc(13)}px`,border:`1px solid ${s.color}22`}}>
                <div style={{fontSize:sc(15),marginBottom:sc(4)}}>{s.icon}</div>
                <div style={{fontSize:sc(17),fontWeight:800,color:s.color,lineHeight:1,marginBottom:sc(3)}}>{s.value}</div>
                <div style={{fontSize:sc(10),fontWeight:700,color:s.color,marginBottom:sc(1)}}>{s.label}</div>
                <div style={{fontSize:sc(9),color:s.color,opacity:0.6}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {mision.descripcion&&(
          <div style={{marginBottom:sc(12)}}>
            <div style={{fontSize:sc(9),fontWeight:700,color:COLORES.gris,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:sc(6)}}>Descripción</div>
            <div style={{background:COLORES.grisClaro,borderRadius:sc(10),padding:`${sc(11)}px ${sc(13)}px`,fontSize:sc(12),color:'#3d3d3a',lineHeight:1.6,wordBreak:'break-word'}}>{mision.descripcion}</div>
          </div>
        )}

        {agentes.length>0&&(
          <div style={{marginBottom:sc(12)}}>
            <div style={{fontSize:sc(9),fontWeight:700,color:COLORES.gris,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:sc(6)}}>Agentes asignados ({agentes.length})</div>
            <div style={{display:'flex',gap:sc(8),flexWrap:'wrap'}}>
              {agentes.map((a,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:sc(9),background:'#eeedf8',borderRadius:sc(10),padding:`${sc(8)}px ${sc(12)}px`,minWidth:sc(180)}}>
                  <div style={{width:sc(30),height:sc(30),borderRadius:'50%',background:COLORES.azul,display:'flex',alignItems:'center',justifyContent:'center',fontSize:sc(11),fontWeight:700,color:'#fff',flexShrink:0}}>
                    {`${a.nombre?.[0]??''}${a.apellido?.[0]??''}`.toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontSize:sc(12),fontWeight:700,color:COLORES.azul}}>{a.nombre} {a.apellido}</div>
                    <div style={{fontSize:sc(10),color:'#6b5ce7'}}>Legajo {a.legajo}</div>
                    {a.asignado_en&&<div style={{fontSize:sc(9),color:COLORES.gris,marginTop:1}}>Asignado {fmt(a.asignado_en)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reporte de cierre — solo la parte P1 (puede ser truncada) */}
        <BloqueReporte mision={mision} texto={reporteP1} />

        <div style={{marginBottom:sc(18)}}>
          <div style={{fontSize:sc(9),fontWeight:700,color:COLORES.gris,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:sc(6)}}>Ubicación</div>
          <div style={{background:'#e4eaf5',borderRadius:sc(10),padding:`${sc(14)}px ${sc(16)}px`,display:'flex',alignItems:'center',gap:sc(13)}}>
            <svg width={sc(22)} height={sc(28)} viewBox="0 0 22 28" style={{flexShrink:0}}>
              <path d="M11 0C5 0 0 5 0 11c0 9 11 17 11 17s11-8 11-17C22 5 17 0 11 0z" fill={COLORES.azul}/>
              <circle cx="11" cy="11" r="5" fill="#fff"/>
            </svg>
            <div>
              <div style={{fontSize:sc(13),fontWeight:700,color:COLORES.azul,marginBottom:sc(2),wordBreak:'break-word'}}>{mision.direccion}</div>
              {mision.comuna&&<div style={{fontSize:sc(11),color:COLORES.gris}}>{mision.comuna} · Buenos Aires</div>}
              {mision.reporte_lat&&mision.reporte_lng&&(
                <div style={{fontSize:sc(10),color:COLORES.azulMedio,marginTop:sc(3),fontFamily:'monospace'}}>
                  {mision.reporte_lat.toFixed(6)}, {mision.reporte_lng.toFixed(6)}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
      <Footer generadoPor={generadoPor} pagina={1} totalPaginas={totalPaginas}/>
    </div>
  )
}

// ── HISTORIAL ─────────────────────────────────────────────────
function SeccionHistorial({ historial }) {
  if (!historial||historial.length===0) return null
  return (
    <div>
      <div style={{fontSize:sc(9),fontWeight:700,color:COLORES.gris,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:sc(8)}}>
        Historial de la misión ({historial.length} evento{historial.length!==1?'s':''})
      </div>
      <div style={{background:COLORES.grisClaro,borderRadius:sc(10),overflow:'hidden'}}>
        {historial.map((h,i)=>{
          const label=ACCION_LABEL[h.accion]??h.accion
          const color=ACCION_COLOR[h.accion]??COLORES.gris
          return (
            <div key={i} style={{display:'flex',gap:sc(12),padding:`${sc(11)}px ${sc(15)}px`,borderBottom:i<historial.length-1?'0.5px solid #e5e5ea':'none',alignItems:'flex-start'}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:3}}>
                <div style={{width:sc(9),height:sc(9),borderRadius:'50%',background:color,flexShrink:0}}/>
                {i<historial.length-1&&<div style={{width:1.5,flex:1,background:'#e5e5ea',marginTop:sc(3),minHeight:sc(12)}}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:sc(8),marginBottom:sc(2)}}>
                  <div style={{fontSize:sc(12),fontWeight:700,color,wordBreak:'break-word'}}>{label}</div>
                  <div style={{fontSize:sc(10),color:COLORES.gris,flexShrink:0,whiteSpace:'nowrap'}}>{fmt(h.fecha)}</div>
                </div>
                {h.agentes&&<div style={{fontSize:sc(11),color:'#3d3d3a',wordBreak:'break-word'}}>→ {h.agentes}</div>}
                {h.agente&&!h.agentes&&<div style={{fontSize:sc(11),color:'#3d3d3a',wordBreak:'break-word'}}>Agente: {h.agente}</div>}
                {h.motivo&&<div style={{fontSize:sc(11),color:'#5d5d5a',marginTop:sc(2),background:'#fff',borderRadius:sc(6),padding:`3px ${sc(7)}px`,display:'inline-block',wordBreak:'break-word'}}>Motivo: {h.motivo}</div>}
                {h.nota&&<div style={{fontSize:sc(10),color:COLORES.gris,fontStyle:'italic',marginTop:sc(2),wordBreak:'break-word'}}>{h.nota}</div>}
                {h.rol&&<div style={{fontSize:sc(9),color:'#c7c7cc',marginTop:sc(2)}}>por {h.rol}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── PÁGINA N ──────────────────────────────────────────────────
function PaginaN({ mision, generadoPor, pagina, totalPaginas, historial, fotos, espacioFotos, reporteP2 }) {
  return (
    <div style={{width:A4_W,height:A4_H,background:'#fff',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',color:'#1d1d1f',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <HeaderCompacto mision={mision} pagina={pagina} totalPaginas={totalPaginas}/>
      <div style={{flex:1,padding:`${PAD_TOP}px ${PAD_X}px 0`,overflow:'hidden'}}>

        {/* Continuación del reporte de cierre si venía de p1 */}
        {reporteP2&&(
          <div style={{marginBottom:sc(16)}}>
            <div style={{fontSize:sc(9),fontWeight:700,color:COLORES.gris,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:sc(6)}}>
              Reporte de cierre <span style={{fontWeight:400,opacity:0.6}}>(continuación)</span>
            </div>
            <div style={{background:'#e8faf2',border:'1px solid #b5e8d0',borderRadius:sc(10),padding:`${sc(13)}px ${sc(15)}px`}}>
              <div style={{fontSize:sc(12),color:'#2d4a3e',lineHeight:1.6,wordBreak:'break-word'}}>{reporteP2}</div>
            </div>
          </div>
        )}

        {historial&&historial.length>0&&(
          <div style={{marginBottom:fotos?.length>0?sc(18):sc(22)}}>
            <SeccionHistorial historial={historial}/>
          </div>
        )}
        {fotos&&fotos.length>0&&(
          <GaleriaFotos fotos={fotos} espacioDisponible={espacioFotos}/>
        )}
      </div>
      <Footer generadoPor={generadoPor} pagina={pagina} totalPaginas={totalPaginas}/>
    </div>
  )
}

// ── CAPTURA ───────────────────────────────────────────────────
async function capturarPagina(elemento) {
  const contenedor=document.createElement('div')
  contenedor.style.cssText='position:fixed;top:-9999px;left:-9999px;z-index:-1;'
  document.body.appendChild(contenedor)
  const {createRoot}=await import('react-dom/client')
  const root=createRoot(contenedor)
  await new Promise(resolve=>{root.render(elemento);setTimeout(resolve,800)})
  const nodo=contenedor.firstChild
  const canvas=await html2canvas(nodo,{
    scale:2, useCORS:true, allowTaint:false, backgroundColor:'#ffffff',
    logging:false, width:A4_W, height:A4_H, windowWidth:A4_W, windowHeight:A4_H,
  })
  root.unmount()
  document.body.removeChild(contenedor)
  return canvas
}

// ── HOOK PRINCIPAL ────────────────────────────────────────────
export function useReportePDF() {
  const [generando,setGenerando]=useState(false)

  async function descargarPDF(mision, generadoPor) {
    setGenerando(true)
    try {
      const historial=Array.isArray(mision.historial)?mision.historial:[]
      const fotosRaw =Array.isArray(mision.reporte_fotos)?mision.reporte_fotos.filter(Boolean):[]

      const fotos=fotosRaw.length>0
        ?(await detectarOrientaciones(fotosRaw)).map((f,i)=>({...f,index:i}))
        :[]

      // Dividir el reporte de cierre si es muy largo
      const { p1: reporteP1, p2: reporteP2 } = dividirReporte(mision.reporte_texto)

      // Calcular paginación
      const altHistorial=historial.length>0
        ?HIST_LABEL+8+historial.length*EVENTO_H+18
        :0
      // Si hay continuación del reporte en p2, esa parte también ocupa espacio
      const altReporteP2 = reporteP2
        ? sc(9+6+13+15)*2 + Math.ceil(reporteP2.length/CHARS_POR_LINEA)*sc(12)*1.6 + sc(16)
        : 0
      const espacioFotosEnP2 = BODY_P2 - altHistorial - altReporteP2

      const {alturaH:aH,alturaV:aV,porFilaH:pfH,porFilaV:pfV}=fotos.length>0
        ?calcLayout(fotos,espacioFotosEnP2)
        :{alturaH:0,alturaV:0,porFilaH:1,porFilaV:1}
      const filasH=fotos.filter(f=>f.landscape).length>0?Math.ceil(fotos.filter(f=>f.landscape).length/pfH):0
      const filasV=fotos.filter(f=>!f.landscape).length>0?Math.ceil(fotos.filter(f=>!f.landscape).length/pfV):0
      const altMinGaleria=fotos.length>0
        ?FOTO_LABEL+(filasH*Math.max(aH,sc(80)))+(filasV*Math.max(aV,sc(100)))+(filasH+filasV-1)*GAP
        :0
      const cabenJuntos=fotos.length===0||(altHistorial+altReporteP2+altMinGaleria<=BODY_P2)

      const paginas=[]
      if (historial.length===0&&fotos.length===0&&!reporteP2) {
        // solo p1
      } else if (cabenJuntos) {
        paginas.push({
          historial:historial.length>0?historial:null,
          fotos:fotos.length>0?fotos:null,
          espacioFotos:espacioFotosEnP2,
          reporteP2: reporteP2 ?? null,
        })
      } else if (historial.length>0&&fotos.length>0) {
        paginas.push({historial,fotos:null,espacioFotos:0,reporteP2:reporteP2??null})
        paginas.push({historial:null,fotos,espacioFotos:BODY_P2,reporteP2:null})
      } else if (historial.length>0) {
        paginas.push({historial,fotos:null,espacioFotos:0,reporteP2:reporteP2??null})
      } else if (fotos.length>0) {
        paginas.push({historial:null,fotos,espacioFotos:BODY_P2,reporteP2:reporteP2??null})
      } else if (reporteP2) {
        paginas.push({historial:null,fotos:null,espacioFotos:0,reporteP2})
      }

      const totalPaginas=1+paginas.length

      const pdf=new jsPDF({orientation:'portrait',unit:'pt',format:'a4'})
      const pW=pdf.internal.pageSize.getWidth()
      const pH=pdf.internal.pageSize.getHeight()

      const c1=await capturarPagina(
        <Pagina1 mision={mision} generadoPor={generadoPor} totalPaginas={totalPaginas} reporteP1={reporteP1}/>
      )
      pdf.addImage(c1.toDataURL('image/jpeg',0.95),'JPEG',0,0,pW,pH)

      for (let i=0;i<paginas.length;i++) {
        pdf.addPage()
        const p=paginas[i]
        const cn=await capturarPagina(
          <PaginaN mision={mision} generadoPor={generadoPor}
            pagina={i+2} totalPaginas={totalPaginas}
            historial={p.historial} fotos={p.fotos} espacioFotos={p.espacioFotos}
            reporteP2={p.reporteP2}/>
        )
        pdf.addImage(cn.toDataURL('image/jpeg',0.95),'JPEG',0,0,pW,pH)
      }

      pdf.save(`CAT_Mision_${mision.numero_mision??mision.id.slice(0,8)}_${new Date().toISOString().slice(0,10)}.pdf`)

    } catch(err) {
      console.error('Error generando PDF:',err)
      alert('No se pudo generar el reporte.')
    } finally {
      setGenerando(false)
    }
  }

  return {descargarPDF,generando}
}

// ── BOTÓN ─────────────────────────────────────────────────────
export function BtnDescargarReporte({ mision, generadoPor, style={} }) {
  const {descargarPDF,generando}=useReportePDF()

  const tieneReporte=['cumplida','incumplida','rechazada'].includes(mision.estado)
    ||(Array.isArray(mision.historial)&&mision.historial.length>0)

  if (!tieneReporte) return null

  return (
    <button onClick={()=>descargarPDF(mision,generadoPor)} disabled={generando}
      style={{display:'flex',alignItems:'center',gap:7,padding:'9px 16px',borderRadius:11,border:'none',
        background:generando?'#e5e5ea':'#1a2744',color:generando?'#8e8e93':'#fff',
        fontSize:13,fontWeight:700,cursor:generando?'not-allowed':'pointer',...style}}>
      {generando?(
        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{width:14,height:14,animation:'spin 1s linear infinite'}}>
          <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
        </svg>Generando PDF...</>
      ):(
        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{width:14,height:14}}>
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>Descargar reporte PDF</>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </button>
  )
}
