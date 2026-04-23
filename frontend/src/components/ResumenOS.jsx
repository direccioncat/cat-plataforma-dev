/**
 * ResumenOS.jsx — v9
 * Fix 1: tooltips comunas con sticky:true (elimina leader lines)
 * Fix 2: poligono_coords parseado defensivamente (puede llegar como string JSON del backend)
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../lib/api'

const TURNOS_DEF = [
  { id: 'manana',     label: 'Turno Manana',            short: 'TM',  color: '#854f0b', bg: '#faeeda' },
  { id: 'intermedio', label: 'Turno Intermedio',         short: 'TI',  color: '#534ab7', bg: '#eeedf8' },
  { id: 'tarde',      label: 'Turno Tarde',              short: 'TT',  color: '#185fa5', bg: '#e8f0fe' },
  { id: 'noche',      label: 'Turno Noche',              short: 'TN',  color: '#1a2744', bg: '#e4eaf5' },
  { id: 'fsd',        label: 'Fin de Semana Diurno',     short: 'FSD', color: '#0f6e56', bg: '#e8faf2' },
  { id: 'fsi',        label: 'Fin de Semana Intermedio', short: 'FSI', color: '#6b21a8', bg: '#f3e8ff' },
  { id: 'fsn',        label: 'Fin de Semana Noche',      short: 'FSN', color: '#8e8e93', bg: '#f5f5f7' },
]
const TURNO_MAP = Object.fromEntries(TURNOS_DEF.map(t => [t.id, t]))
const ORDEN_TURNOS = TURNOS_DEF.map(t => t.id)
const COLORES_PSV = ['#1a2744', '#185fa5', '#0f6e56', '#534ab7', '#854f0b', '#6b21a8']

const COMUNAS_GEOJSON = {"type":"FeatureCollection","features":[{"type":"Feature","properties":{"nombre":"Comuna 1","numero":1},"geometry":{"type":"Polygon","coordinates":[[[-58.368604,-34.57365],[-58.369748,-34.574046],[-58.367643,-34.573894],[-58.35818,-34.579337],[-58.355501,-34.591658],[-58.354788,-34.592712],[-58.355411,-34.591713],[-58.358106,-34.579321],[-58.367485,-34.573907],[-58.368604,-34.57365]]]}},{"type":"Feature","properties":{"nombre":"Comuna 10","numero":10},"geometry":{"type":"Polygon","coordinates":[[[-58.488337,-34.62016],[-58.495573,-34.614391],[-58.500192,-34.609126],[-58.513047,-34.616732],[-58.51695,-34.620215],[-58.529469,-34.610896],[-58.531519,-34.615494],[-58.530359,-34.634795],[-58.520688,-34.633821],[-58.520241,-34.632797],[-58.514864,-34.633203],[-58.50883,-34.635553],[-58.506819,-34.635812],[-58.505672,-34.636718],[-58.51051,-34.637371],[-58.509822,-34.640008],[-58.502299,-34.645818],[-58.497138,-34.643409],[-58.495302,-34.644848],[-58.478546,-34.636994],[-58.476072,-34.638935],[-58.473492,-34.637308],[-58.471303,-34.636655],[-58.477807,-34.622384],[-58.482743,-34.62463],[-58.488337,-34.62016]]]}},{"type":"Feature","properties":{"nombre":"Comuna 11","numero":11},"geometry":{"type":"Polygon","coordinates":[[[-58.498385,-34.596368],[-58.503544,-34.59445],[-58.503084,-34.594382],[-58.513921,-34.582398],[-58.515536,-34.581268],[-58.529469,-34.610896],[-58.51695,-34.620215],[-58.513047,-34.616732],[-58.500192,-34.609126],[-58.495573,-34.614391],[-58.482743,-34.62463],[-58.468635,-34.617562],[-58.459448,-34.613886],[-58.462705,-34.607373],[-58.458476,-34.604491],[-58.468912,-34.60186],[-58.474017,-34.605311],[-58.477499,-34.600825],[-58.476392,-34.6002],[-58.483456,-34.597758],[-58.497175,-34.596817],[-58.498385,-34.596368]]]}},{"type":"Feature","properties":{"nombre":"Comuna 12","numero":12},"geometry":{"type":"Polygon","coordinates":[[[-58.503311,-34.593856],[-58.488794,-34.584818],[-58.468081,-34.572909],[-58.473368,-34.566662],[-58.46649,-34.56219],[-58.467684,-34.561687],[-58.467037,-34.561315],[-58.474436,-34.552421],[-58.468189,-34.54894],[-58.475953,-34.538631],[-58.500551,-34.549489],[-58.515536,-34.581268],[-58.514517,-34.581744],[-58.503311,-34.593856]]]}},{"type":"Feature","properties":{"nombre":"Comuna 13","numero":13},"geometry":{"type":"Polygon","coordinates":[[[-58.440331,-34.540224],[-58.440885,-34.540202],[-58.440834,-34.539144],[-58.441581,-34.53762],[-58.441762,-34.537899],[-58.442287,-34.537027],[-58.443861,-34.536138],[-58.446382,-34.536003],[-58.448611,-34.537389],[-58.449404,-34.536308],[-58.44898,-34.535545],[-58.450017,-34.536133],[-58.449878,-34.537356],[-58.451192,-34.538142],[-58.452174,-34.539566],[-58.454084,-34.538784],[-58.454847,-34.537429],[-58.454069,-34.536533],[-58.453001,-34.535744],[-58.450846,-34.535685],[-58.450069,-34.535203],[-58.450915,-34.532544],[-58.451637,-34.531687],[-58.453924,-34.535085],[-58.458845,-34.537121],[-58.455328,-34.535366],[-58.45546,-34.533261],[-58.453347,-34.531542],[-58.453359,-34.530163],[-58.455536,-34.527467],[-58.457616,-34.526491],[-58.459252,-34.527145],[-58.461071,-34.530131],[-58.463796,-34.533261],[-58.475953,-34.538631],[-58.468189,-34.54894],[-58.474436,-34.552421],[-58.467037,-34.561315],[-58.467684,-34.561687],[-58.46649,-34.56219],[-58.473368,-34.566662],[-58.468081,-34.572909],[-58.467364,-34.572496],[-58.463187,-34.575105],[-58.460225,-34.578295],[-58.455399,-34.57907],[-58.444449,-34.583171],[-58.439939,-34.578547],[-58.443972,-34.575364],[-58.440745,-34.572106],[-58.449044,-34.567854],[-58.447854,-34.566713],[-58.442535,-34.563689],[-58.441162,-34.562134],[-58.435402,-34.562537],[-58.434958,-34.561792],[-58.43798,-34.561757],[-58.440328,-34.560556],[-58.441386,-34.558816],[-58.441059,-34.557896],[-58.434111,-34.553957],[-58.434654,-34.553594],[-58.434423,-34.55305],[-58.430984,-34.551119],[-58.429398,-34.55095],[-58.426758,-34.552024],[-58.425483,-34.549591],[-58.425897,-34.549498],[-58.425584,-34.548851],[-58.426777,-34.548163],[-58.427054,-34.548518],[-58.426175,-34.548986],[-58.426634,-34.549599],[-58.429167,-34.549042],[-58.430774,-34.547836],[-58.430592,-34.547507],[-58.430169,-34.547946],[-58.429862,-34.547317],[-58.43012,-34.54692],[-58.430725,-34.547326],[-58.431336,-34.544779],[-58.434604,-34.542629],[-58.434918,-34.541996],[-58.4342,-34.541859],[-58.434941,-34.541903],[-58.43617,-34.540386],[-58.437557,-34.539796],[-58.439276,-34.540119],[-58.440212,-34.539832],[-58.440243,-34.539202],[-58.440331,-34.540224]]]}},{"type":"Feature","properties":{"nombre":"Comuna 14","numero":14},"geometry":{"type":"Polygon","coordinates":[[[-58.4001251,-34.5693503],[-58.395206,-34.572191],[-58.392839,-34.572233],[-58.394562,-34.569229],[-58.396979,-34.566669],[-58.397505,-34.566696],[-58.399922,-34.569181],[-58.400222,-34.568993],[-58.396874,-34.565828],[-58.396969,-34.565059],[-58.399325,-34.563687],[-58.400709,-34.5643],[-58.401101,-34.564036],[-58.400979,-34.563383],[-58.402599,-34.563973],[-58.403946,-34.563569],[-58.398785,-34.560747],[-58.403906,-34.563479],[-58.410196,-34.558068],[-58.409432,-34.557133],[-58.409563,-34.556599],[-58.411139,-34.557352],[-58.415679,-34.5549],[-58.429759,-34.550936],[-58.43168,-34.551414],[-58.434423,-34.55305],[-58.434654,-34.553594],[-58.434111,-34.553957],[-58.440159,-34.557104],[-58.441164,-34.558071],[-58.441386,-34.558816],[-58.440958,-34.559914],[-58.439468,-34.561169],[-58.434858,-34.562089],[-58.436427,-34.562578],[-58.441162,-34.562134],[-58.442535,-34.563689],[-58.447854,-34.566713],[-58.449044,-34.567854],[-58.440745,-34.572106],[-58.443972,-34.575364],[-58.439939,-34.578547],[-58.443432,-34.581797],[-58.444786,-34.584514],[-58.42933,-34.594757],[-58.423367,-34.597748],[-58.416,-34.597855],[-58.414394,-34.594054],[-58.410081,-34.589057],[-58.406172,-34.583459],[-58.401943,-34.583426],[-58.400544,-34.584472],[-58.39656,-34.578507],[-58.401145,-34.575737],[-58.402646,-34.57414],[-58.399716,-34.570807],[-58.4001251,-34.5693503]]]}},{"type":"Feature","properties":{"nombre":"Comuna 15","numero":15},"geometry":{"type":"Polygon","coordinates":[[[-58.426024,-34.596614],[-58.444586,-34.584666],[-58.4444,-34.583192],[-58.455399,-34.57907],[-58.460225,-34.578295],[-58.463187,-34.575105],[-58.467364,-34.572496],[-58.488794,-34.584818],[-58.503472,-34.593954],[-58.503084,-34.594382],[-58.503544,-34.59445],[-58.497175,-34.596817],[-58.483456,-34.597758],[-58.476392,-34.6002],[-58.477499,-34.600825],[-58.474017,-34.605311],[-58.468912,-34.60186],[-58.446247,-34.607616],[-58.439202,-34.605583],[-58.432241,-34.602134],[-58.429429,-34.599126],[-58.427773,-34.598329],[-58.423367,-34.597748],[-58.426024,-34.596614]]]}},{"type":"Feature","properties":{"nombre":"Comuna 2","numero":2},"geometry":{"type":"Polygon","coordinates":[[[-58.4001251,-34.5693503],[-58.399716,-34.570807],[-58.402646,-34.57414],[-58.401145,-34.575737],[-58.39656,-34.578507],[-58.400544,-34.584472],[-58.401943,-34.583426],[-58.406172,-34.583459],[-58.410081,-34.589057],[-58.414394,-34.594054],[-58.416,-34.597855],[-58.404507,-34.598036],[-58.402008,-34.59937],[-58.398723,-34.59976],[-58.386863,-34.599293],[-58.38795,-34.591648],[-58.383686,-34.5875],[-58.386964,-34.583551],[-58.391645,-34.580831],[-58.389865,-34.578202],[-58.38658,-34.578115],[-58.38323,-34.578315],[-58.379836,-34.580162],[-58.37616,-34.57995],[-58.375121,-34.58052],[-58.373972,-34.579102],[-58.376711,-34.577545],[-58.370709,-34.577049],[-58.370749,-34.576605],[-58.375438,-34.573925],[-58.381817,-34.57441],[-58.383562,-34.573427],[-58.378279,-34.572742],[-58.378304,-34.572304],[-58.380502,-34.571038],[-58.380356,-34.570474],[-58.378679,-34.570475],[-58.371101,-34.574835],[-58.378592,-34.570422],[-58.380025,-34.570367],[-58.380089,-34.56827],[-58.380353,-34.570098],[-58.380707,-34.570112],[-58.381048,-34.568528],[-58.383114,-34.568377],[-58.384281,-34.568894],[-58.390316,-34.569336],[-58.391045,-34.570071],[-58.391261,-34.570605],[-58.382857,-34.575366],[-58.383438,-34.57617],[-58.38531,-34.576304],[-58.392984,-34.571976],[-58.395206,-34.572191],[-58.4001251,-34.5693503]]]}},{"type":"Feature","properties":{"nombre":"Comuna 3","numero":3},"geometry":{"type":"Polygon","coordinates":[[[-58.411919,-34.598003],[-58.413908,-34.607246],[-58.41466,-34.60819],[-58.414467,-34.610736],[-58.41287,-34.614116],[-58.411779,-34.630356],[-58.408364,-34.629516],[-58.39117,-34.627253],[-58.391807,-34.61128],[-58.392931,-34.599637],[-58.398723,-34.59976],[-58.402008,-34.59937],[-58.404507,-34.598036],[-58.411919,-34.598003]]]}},{"type":"Feature","properties":{"nombre":"Comuna 4","numero":4},"geometry":{"type":"Polygon","coordinates":[[[-58.38864,-34.633731],[-58.390353,-34.634124],[-58.39117,-34.627253],[-58.408364,-34.629516],[-58.411779,-34.630356],[-58.411521,-34.632857],[-58.410489,-34.635238],[-58.41126,-34.638099],[-58.432344,-34.641741],[-58.432108,-34.645164],[-58.434923,-34.646237],[-58.43043,-34.649874],[-58.434433,-34.653113],[-58.426746,-34.658674],[-58.424041,-34.662048],[-58.420878,-34.660493],[-58.412406,-34.658381],[-58.407101,-34.659951],[-58.402535,-34.659405],[-58.401065,-34.659929],[-58.400566,-34.660607],[-58.397876,-34.661246],[-58.397209,-34.661984],[-58.392738,-34.662229],[-58.391498,-34.66183],[-58.390751,-34.661013],[-58.3881,-34.660352],[-58.38485,-34.657696],[-58.374119,-34.656765],[-58.372544,-34.654983],[-58.369787,-34.653579],[-58.370012,-34.652103],[-58.369657,-34.651334],[-58.364333,-34.648224],[-58.362394,-34.648146],[-58.359814,-34.645971],[-58.357598,-34.64498],[-58.357322,-34.644044],[-58.358125,-34.641869],[-58.360903,-34.640723],[-58.361439,-34.639867],[-58.360354,-34.639189],[-58.358026,-34.639202],[-58.354138,-34.636518],[-58.35276,-34.633563],[-58.354878,-34.628998],[-58.361262,-34.624685],[-58.361018,-34.624394],[-58.361767,-34.623639],[-58.360859,-34.624238],[-58.360294,-34.623945],[-58.353967,-34.628089],[-58.352988,-34.629162],[-58.352382,-34.629011],[-58.351138,-34.631356],[-58.350143,-34.632323],[-58.34906,-34.632549],[-58.346097,-34.63166],[-58.347926,-34.631154],[-58.348309,-34.630274],[-58.347961,-34.629937],[-58.348784,-34.629084],[-58.347049,-34.627282],[-58.345372,-34.628665],[-58.344576,-34.627999],[-58.342508,-34.629456],[-58.341399,-34.628894],[-58.344271,-34.626374],[-58.342445,-34.626169],[-58.340662,-34.627829],[-58.339748,-34.62783],[-58.338877,-34.628919],[-58.336198,-34.628179],[-58.335152,-34.627095],[-58.335152,-34.626445],[-58.340046,-34.623237],[-58.341884,-34.623035],[-58.342371,-34.623373],[-58.343031,-34.62271],[-58.342098,-34.622242],[-58.341898,-34.622823],[-58.33721,-34.622525],[-58.336922,-34.621815],[-58.337513,-34.62001],[-58.338587,-34.618639],[-58.342855,-34.618568],[-58.344047,-34.61949],[-58.344057,-34.621759],[-58.344703,-34.621341],[-58.345481,-34.621519],[-58.346092,-34.622008],[-58.345932,-34.622956],[-58.34715,-34.619989],[-58.346323,-34.619212],[-58.345185,-34.619836],[-58.344667,-34.61963],[-58.344591,-34.619],[-58.347848,-34.618965],[-58.349572,-34.61979],[-58.35152,-34.619167],[-58.351917,-34.61962],[-58.354073,-34.619701],[-58.35514,-34.61955],[-58.35601,-34.617606],[-58.363196,-34.625135],[-58.367971,-34.625195],[-58.367945,-34.627142],[-58.370658,-34.629494],[-58.370963,-34.626647],[-58.374561,-34.626799],[-58.379044,-34.629333],[-58.378621,-34.630499],[-58.380143,-34.633032],[-58.38125,-34.63307],[-58.381333,-34.630845],[-58.383392,-34.632221],[-58.38864,-34.633731]]]}},{"type":"Feature","properties":{"nombre":"Comuna 5","numero":5},"geometry":{"type":"Polygon","coordinates":[[[-58.433334,-34.602673],[-58.430669,-34.605941],[-58.430029,-34.615449],[-58.429252,-34.615106],[-58.423492,-34.6402],[-58.41126,-34.638099],[-58.410489,-34.635238],[-58.411521,-34.632857],[-58.41287,-34.614116],[-58.414467,-34.610736],[-58.41466,-34.60819],[-58.413908,-34.607246],[-58.411919,-34.598003],[-58.426785,-34.597944],[-58.429429,-34.599126],[-58.432241,-34.602134],[-58.433334,-34.602673]]]}},{"type":"Feature","properties":{"nombre":"Comuna 6","numero":6},"geometry":{"type":"Polygon","coordinates":[[[-58.4304777,-34.6074712],[-58.4305407,-34.6063652],[-58.4332057,-34.6030972],[-58.4390737,-34.6060072],[-58.4461187,-34.6080402],[-58.4583458,-34.6049162],[-58.4625768,-34.6077972],[-58.4514478,-34.6310632],[-58.4266276,-34.6274222],[-58.4291236,-34.6155302],[-58.4299007,-34.6158732],[-58.4304777,-34.6074712]]]}},{"type":"Feature","properties":{"nombre":"Comuna 7","numero":7},"geometry":{"type":"Polygon","coordinates":[[[-58.4602288,-34.6570496],[-58.4548889,-34.6525426],[-58.4544629,-34.6510666],[-58.4431509,-34.6514336],[-58.4378318,-34.6560466],[-58.4302568,-34.6501176],[-58.4347498,-34.6464806],[-58.4319347,-34.6454076],[-58.4321708,-34.6419846],[-58.4233188,-34.6404436],[-58.4265828,-34.6272416],[-58.4514029,-34.6308826],[-58.4592749,-34.6141296],[-58.4684619,-34.6178056],[-58.4776339,-34.6226276],[-58.4690689,-34.6416406],[-58.4628259,-34.6464136],[-58.4668609,-34.6517116],[-58.4602288,-34.6570496]]]}},{"type":"Feature","properties":{"nombre":"Comuna 8","numero":8},"geometry":{"type":"Polygon","coordinates":[[[-58.460402,-34.656806],[-58.46443,-34.660049],[-58.467655,-34.657515],[-58.469556,-34.659105],[-58.470571,-34.658427],[-58.472515,-34.662773],[-58.478818,-34.657844],[-58.485945,-34.662448],[-58.488952,-34.663348],[-58.49704,-34.67118],[-58.502526,-34.674509],[-58.461715,-34.705293],[-58.4279,-34.665449],[-58.424041,-34.662048],[-58.426746,-34.658674],[-58.434433,-34.653113],[-58.438005,-34.655803],[-58.443324,-34.65119],[-58.44462,-34.650948],[-58.454636,-34.650823],[-58.455062,-34.652299],[-58.460402,-34.656806]]]}},{"type":"Feature","properties":{"nombre":"Comuna 9","numero":9},"geometry":{"type":"Polygon","coordinates":[[[-58.502522,-34.674506],[-58.49704,-34.67118],[-58.488952,-34.663348],[-58.485945,-34.662448],[-58.478818,-34.657844],[-58.472515,-34.662773],[-58.470571,-34.658427],[-58.469556,-34.659105],[-58.467655,-34.657515],[-58.46443,-34.660049],[-58.460402,-34.656806],[-58.467034,-34.651468],[-58.462999,-34.64617],[-58.469242,-34.641397],[-58.471303,-34.636655],[-58.473492,-34.637308],[-58.476072,-34.638935],[-58.478546,-34.636994],[-58.495302,-34.644848],[-58.497138,-34.643409],[-58.502299,-34.645818],[-58.509822,-34.640008],[-58.51051,-34.637371],[-58.505672,-34.636718],[-58.506819,-34.635812],[-58.50883,-34.635553],[-58.514864,-34.633203],[-58.520241,-34.632797],[-58.520688,-34.633821],[-58.530359,-34.634795],[-58.529209,-34.654299],[-58.502522,-34.674506]]]}}]}

// Parsear poligono_coords defensivamente — puede llegar como string JSON del backend
function parsePoligonoCoords(raw) {
  if (!raw) return null
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return null }
  }
  return null
}

function ubicLabel(item) {
  if (item.modo_ubicacion === 'interseccion') return `${item.calle || '?'} esq. ${item.calle2 || '?'}`
  if (item.modo_ubicacion === 'entre_calles')  return `${item.calle || '?'} entre ${item.desde || '?'} y ${item.hasta || '?'}`
  if (item.modo_ubicacion === 'poligono')       return item.poligono_desc || 'Zona trazada'
  return [item.calle, item.altura].filter(Boolean).join(' ') || 'Sin direccion'
}
function totalAgentesItem(item) {
  return (item.turnos || []).reduce((acc, e) => acc + (e.cantidad_agentes || 0), 0)
}
function itemIncompleto(item) {
  if (!item.calle && !item.lat) return true
  if (!item.eje_psv) return true
  if (item.tipo === 'servicio' && totalAgentesItem(item) === 0) return true
  if (!item.comuna) return true
  return false
}

function StatCard({ value, label, color = '#1a2744', sub, alert }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${alert ? '#f5c800' : '#e5e5ea'}`, padding: '14px 18px', flex: '1 1 130px', position: 'relative', overflow: 'hidden' }}>
      {alert && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#f5c800' }}/>}
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.8px', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#636366', marginTop: 5, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function TabTurno({ porTurno }) {
  const entradas = ORDEN_TURNOS.filter(id => porTurno[id])
  if (entradas.length === 0) return <Vacio texto="Sin datos de turnos en esta OS"/>
  const maxAgentes = Math.max(...entradas.map(id => porTurno[id].agentes || 0), 1)
  return (
    <div>
      <div style={{ fontSize: 13, color: '#636366', marginBottom: 16, lineHeight: 1.5 }}>
        Para cada turno se muestra la cantidad de servicios y misiones planificados, y el total de agentes requeridos segun la configuracion de la OS.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr 2fr', padding: '6px 14px', marginBottom: 4 }}>
        {['Turno', 'Servicios', 'Misiones', 'Agentes', 'Carga relativa'].map(h => (
          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
        ))}
      </div>
      {entradas.map(id => {
        const t = TURNO_MAP[id]; const d = porTurno[id]
        const pct = Math.round(((d.agentes || 0) / maxAgentes) * 100)
        return (
          <div key={id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr 2fr', padding: '12px 14px', background: '#f9f9fb', borderRadius: 10, marginBottom: 6, border: '0.5px solid #e5e5ea', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: t.bg, color: t.color, minWidth: 36, textAlign: 'center' }}>{t.short}</span>
              <span style={{ fontSize: 12, color: '#3c3c43', fontWeight: 500 }}>{t.label.replace('Turno ','')}</span>
            </div>
            <div><span style={{ fontSize: 20, fontWeight: 800, color: '#185fa5' }}>{d.servicios||0}</span><span style={{ fontSize: 11, color: '#185fa5', marginLeft: 3, opacity: .7 }}>serv.</span></div>
            <div><span style={{ fontSize: 20, fontWeight: 800, color: '#e24b4a' }}>{d.misiones||0}</span><span style={{ fontSize: 11, color: '#e24b4a', marginLeft: 3, opacity: .7 }}>mis.</span></div>
            <div><span style={{ fontSize: 20, fontWeight: 800, color: '#1a2744' }}>{d.agentes||0}</span><span style={{ fontSize: 11, color: '#8e8e93', marginLeft: 3 }}>ag.</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 8, background: '#e5e5ea', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: t.color, borderRadius: 4, transition: 'width 0.4s' }}/>
              </div>
              <span style={{ fontSize: 11, color: '#aeaeb2', minWidth: 30 }}>{pct}%</span>
            </div>
          </div>
        )
      })}
      <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0f4ff', borderRadius: 10, border: '0.5px solid #c7d2fe' }}>
        <span style={{ fontSize: 12, color: '#3451b2' }}>La carga relativa compara la dotacion de agentes de cada turno contra el turno con mas agentes asignados.</span>
      </div>
    </div>
  )
}

function TabComuna({ porComuna, items, comunasDisponibles, onComunaAsignada }) {
  const entradas = Object.entries(porComuna).sort((a,b) => ((b[1].servicios||0)+(b[1].misiones||0)) - ((a[1].servicios||0)+(a[1].misiones||0)))
  const maxTotal = entradas.length > 0 ? Math.max(...entradas.map(([,d])=>(d.servicios||0)+(d.misiones||0))) : 1
  const itemsSinComuna = items.filter(it => !it.comuna)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {entradas.length > 0 && (
        <div>
          <div style={{ fontSize: 13, color: '#636366', marginBottom: 12 }}>{entradas.length} {entradas.length===1?'comuna involucrada':'comunas involucradas'} en esta OS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {entradas.map(([comuna, d], i) => {
              const total=(d.servicios||0)+(d.misiones||0); const pct=Math.round((total/maxTotal)*100)
              return (
                <div key={comuna} style={{ padding: '11px 14px', background: '#f9f9fb', borderRadius: 10, border: '0.5px solid #e5e5ea' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#aeaeb2', minWidth: 22 }}>#{i+1}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2744', flex: 1 }}>{comuna}</span>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#e8f0fe', borderRadius: 6, padding: '3px 9px' }}><span style={{ fontSize: 12, fontWeight: 700, color: '#185fa5' }}>{d.servicios||0}</span><span style={{ fontSize: 10, color: '#185fa5', opacity: .8 }}>Serv.</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fce8e8', borderRadius: 6, padding: '3px 9px' }}><span style={{ fontSize: 12, fontWeight: 700, color: '#e24b4a' }}>{d.misiones||0}</span><span style={{ fontSize: 10, color: '#e24b4a', opacity: .8 }}>Mis.</span></div>
                      {d.agentes>0 && <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f5f5f7', borderRadius: 6, padding: '3px 9px' }}><span style={{ fontSize: 12, fontWeight: 700, color: '#636366' }}>{d.agentes}</span><span style={{ fontSize: 10, color: '#8e8e93' }}>ag.</span></div>}
                    </div>
                  </div>
                  <div style={{ height: 6, background: '#e5e5ea', borderRadius: 3, overflow: 'hidden' }}><div style={{ width:`${pct}%`, height: '100%', background: '#1a2744', borderRadius: 3, transition: 'width 0.4s' }}/></div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {itemsSinComuna.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #f5c800', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#854f0b' }}>{itemsSinComuna.length} {itemsSinComuna.length===1?'item sin':'items sin'} comuna asignada</div>
              <div style={{ fontSize: 12, color: '#a16207', marginTop: 1 }}>No se pudo resolver la ubicacion automaticamente. Asignala manualmente.</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {itemsSinComuna.map(it => <SelectorComunaItem key={it.id} item={it} comunasDisponibles={comunasDisponibles} onAsignar={onComunaAsignada}/>)}
          </div>
        </div>
      )}
      {entradas.length === 0 && itemsSinComuna.length === 0 && <Vacio texto="Sin datos de comunas disponibles"/>}
    </div>
  )
}

function SelectorComunaItem({ item, comunasDisponibles, onAsignar }) {
  const [guardando, setGuardando] = useState(false)
  const [asignado, setAsignado]   = useState(false)
  const esMis = item.tipo === 'mision'
  async function handleAsignar(comuna) {
    if (!comuna) return; setGuardando(true)
    try { await api.patch(`/api/os/items/${item.id}/comuna`, { comuna }); onAsignar(item.id, comuna); setAsignado(true) }
    catch (e) { console.warn('Error asignando comuna:', e) }
    setGuardando(false)
  }
  if (asignado) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#fff', borderRadius: 9, border: '0.5px solid #e5e5ea' }}>
      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: esMis?'#fce8e8':'#e8f0fe', color: esMis?'#a32d2d':'#0c447c', flexShrink: 0 }}>{item.codigo}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2744', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descripcion}</div>
        <div style={{ fontSize: 11, color: '#8e8e93' }}>{ubicLabel(item)}</div>
      </div>
      {guardando ? <span style={{ fontSize: 11, color: '#8e8e93', flexShrink: 0 }}>Guardando...</span> : (
        <select onChange={e => handleAsignar(e.target.value)} defaultValue="" style={{ fontSize: 12, border: '1px solid #d1d1d6', borderRadius: 8, padding: '5px 10px', background: '#f9f9fb', color: '#1a2744', cursor: 'pointer', outline: 'none', minWidth: 140, flexShrink: 0 }}>
          <option value="">Asignar comuna...</option>
          {comunasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
    </div>
  )
}

function TabEjePSV({ porEjePSV, sinEjePSV }) {
  const entradas = Object.entries(porEjePSV).sort((a,b) => ((b[1].servicios||0)+(b[1].misiones||0)) - ((a[1].servicios||0)+(a[1].misiones||0)))
  const totalConEje = entradas.reduce((acc,[,d]) => acc+(d.servicios||0)+(d.misiones||0), 0)
  const maxTotal = totalConEje > 0 ? Math.max(...entradas.map(([,d])=>(d.servicios||0)+(d.misiones||0))) : 1
  if (entradas.length === 0) return <Vacio texto="Ningun item tiene eje PSV asignado"/>
  return (
    <div>
      <div style={{ fontSize: 13, color: '#636366', marginBottom: 16 }}>
        Los ejes del Plan de Seguridad Vial definen el objetivo operativo de cada servicio o mision.
        {sinEjePSV>0 && <span style={{ color: '#854f0b', fontWeight: 600 }}> {sinEjePSV} {sinEjePSV===1?'item':'items'} sin eje asignado.</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entradas.map(([eje, d], i) => {
          const total=(d.servicios||0)+(d.misiones||0); const pct=totalConEje>0?Math.round((total/totalConEje)*100):0; const barPct=Math.round((total/maxTotal)*100); const color=COLORES_PSV[i%COLORES_PSV.length]
          return (
            <div key={eje} style={{ padding: '12px 16px', background: '#f9f9fb', borderRadius: 10, border: '0.5px solid #e5e5ea' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0, marginTop: 2 }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2744', lineHeight: 1.3, marginBottom: 5 }}>{eje}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#e8f0fe', borderRadius: 6, padding: '3px 9px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#185fa5' }}>{d.servicios||0}</span><span style={{ fontSize: 11, color: '#185fa5' }}>Servicios</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fce8e8', borderRadius: 6, padding: '3px 9px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#e24b4a' }}>{d.misiones||0}</span><span style={{ fontSize: 11, color: '#e24b4a' }}>Misiones</span></div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}><div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{pct}%</div><div style={{ fontSize: 10, color: '#aeaeb2' }}>del total</div></div>
              </div>
              <div style={{ height: 6, background: '#e5e5ea', borderRadius: 3, overflow: 'hidden' }}><div style={{ width:`${barPct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }}/></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TabAlertas({ items }) {
  function getFaltante(item) {
    const falta = []
    if (!item.calle && !item.lat) falta.push({ k:'ubicacion', label:'Sin ubicacion cargada', color:'#854f0b', bg:'#faeeda' })
    if (!item.eje_psv) falta.push({ k:'psv', label:'Sin eje PSV asignado', color:'#534ab7', bg:'#eeedf8' })
    if (item.tipo==='servicio' && totalAgentesItem(item)===0) falta.push({ k:'agentes', label:'Sin agentes configurados', color:'#e24b4a', bg:'#fce8e8' })
    if (!item.comuna) falta.push({ k:'comuna', label:'Sin comuna asignada', color:'#0f6e56', bg:'#e8faf2' })
    return falta
  }
  const itemsIncompletos = items.filter(it => getFaltante(it).length > 0)
  if (itemsIncompletos.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f6e56', marginBottom: 5 }}>Todos los items completos</div>
      <div style={{ fontSize: 13, color: '#8e8e93' }}>No hay datos faltantes en esta OS</div>
    </div>
  )
  return (
    <div>
      <div style={{ fontSize: 13, color: '#636366', marginBottom: 16 }}>{itemsIncompletos.length} {itemsIncompletos.length===1?'item tiene':'items tienen'} datos faltantes.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {itemsIncompletos.map(item => {
          const falta=getFaltante(item); const esMis=item.tipo==='mision'
          return (
            <div key={item.id} style={{ padding: '12px 14px', background: '#f9f9fb', borderRadius: 10, border: '0.5px solid #e5e5ea' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: esMis?'#fce8e8':'#e8f0fe', color: esMis?'#a32d2d':'#0c447c', flexShrink: 0, marginTop: 1 }}>{item.codigo}</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: '#1a2744', marginBottom: 3 }}>{item.descripcion||'Sin nombre'}</div><div style={{ fontSize: 11, color: '#8e8e93' }}>{ubicLabel(item)}</div></div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {falta.map(f => <span key={f.k} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: f.bg, color: f.color }}>⚠ {f.label}</span>)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MAPA CORE ─────────────────────────────────────────────────
// FIX v9 + leaflet npm:
// - Usa L del import de npm en vez de CDN
// - Tooltips de comunas: sticky:true elimina leader lines
// - poligono_coords: parseado defensivamente con parsePoligonoCoords()
function MapaCore({ items, height, filtroTipo, filtroTurno, comunasVisible }) {
  const mapRef          = useRef(null)
  const mapObjRef       = useRef(null)
  const capasRef        = useRef([])
  const comunasLayerRef = useRef(null)

  // Normalizar items: parsear poligono_coords si llega como string
  const itemsNorm = items.map(it => {
    if (it.modo_ubicacion === 'poligono' && it.poligono_coords != null) {
      const coords = parsePoligonoCoords(it.poligono_coords)
      return coords !== it.poligono_coords ? { ...it, poligono_coords: coords } : it
    }
    return it
  })

  const itemsMapaables = itemsNorm.filter(it => {
    if (it.modo_ubicacion === 'poligono') return Array.isArray(it.poligono_coords) && it.poligono_coords.length >= 3
    return !!(it.lat && it.lng)
  })

  useEffect(() => {
    if (!mapRef.current || mapObjRef.current) return
    const map = L.map(mapRef.current, { zoomControl: true, preferCanvas: false })
    mapObjRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map)
    comunasLayerRef.current = L.geoJSON(COMUNAS_GEOJSON, {
      style: { color: '#1a2744', weight: 2, fillColor: '#3451b2', fillOpacity: 0.05, dashArray: '5 4' },
      onEachFeature: (feature, layer) => {
        const nombre = feature.properties?.nombre || ''
        if (nombre) layer.bindTooltip(nombre, { permanent: false, sticky: true, opacity: 0.8 })
      },
    }).addTo(map)
    map.setView([-34.615, -58.443], 12)
    return () => { if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; comunasLayerRef.current = null } }
  }, [])

  useEffect(() => {
    const map = mapObjRef.current; if (!map) return
    capasRef.current.forEach(c => map.removeLayer(c)); capasRef.current = []
    const filtrados = itemsMapaables.filter(it => {
      if (filtroTipo !== 'todos' && it.tipo !== filtroTipo) return false
      if (filtroTurno !== 'todos' && it.turno !== filtroTurno) return false
      return true
    })
    const bounds = []
    filtrados.forEach(it => {
      const esMis   = it.tipo === 'mision'
      const color   = esMis ? '#e24b4a' : '#185fa5'
      const turno   = TURNO_MAP[it.turno]
      const agentes = totalAgentesItem(it)
      const esPoligono = it.modo_ubicacion === 'poligono' && Array.isArray(it.poligono_coords) && it.poligono_coords.length >= 3

      const popup = `<div style="font-family:system-ui;min-width:200px;padding:2px">
        <div style="font-size:9px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">${it.tipo}</div>
        <div style="font-size:13px;font-weight:700;color:#1a2744;line-height:1.3;margin-bottom:6px">${it.descripcion||'—'}</div>
        <div style="font-size:11px;color:#636366;margin-bottom:6px">${ubicLabel(it)}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          ${turno?`<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;background:${turno.bg};color:${turno.color}">${turno.short}</span>`:''}
          ${agentes>0?`<span style="font-size:10px;padding:2px 7px;border-radius:5px;background:#f5f5f7;color:#636366">${agentes} ag.</span>`:''}
          ${it.comuna?`<span style="font-size:10px;padding:2px 7px;border-radius:5px;background:#e8faf2;color:#0f6e56">${it.comuna}</span>`:''}
        </div>
        ${it.eje_psv?`<div style="font-size:10px;color:#8e8e93;margin-top:5px">${it.eje_psv}</div>`:''}
      </div>`

      if (esPoligono) {
        // Polígono de zona
        const latlngs = it.poligono_coords.map(p => [p.lat, p.lng])
        const poly = L.polygon(latlngs, { color, weight: 2.5, fillColor: color, fillOpacity: 0.18, dashArray: null })
        poly.bindPopup(popup, { maxWidth: 260 })
        poly.addTo(map)
        capasRef.current.push(poly)
        latlngs.forEach(p => bounds.push(p))
        // Marker en el centroide — mismo estilo que markers normales
        if (it.lat && it.lng) {
          const icon = L.divIcon({
            html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(45deg);color:#fff;font-size:10px;font-weight:900;">${esMis?'M':'S'}</div></div>`,
            className:'', iconSize:[28,28], iconAnchor:[14,14], popupAnchor:[0,-16],
          })
          const m = L.marker([it.lat, it.lng], { icon })
          m.bindPopup(popup, { maxWidth: 260 })
          m.addTo(map); capasRef.current.push(m)
        }
      } else {
        const icon = L.divIcon({
          html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(45deg);color:#fff;font-size:10px;font-weight:900;">${esMis?'M':'S'}</div></div>`,
          className:'', iconSize:[28,28], iconAnchor:[14,28], popupAnchor:[0,-32],
        })
        const marker = L.marker([it.lat, it.lng], { icon })
        marker.bindPopup(popup, { maxWidth: 260 })
        marker.addTo(map); capasRef.current.push(marker)
        bounds.push([it.lat, it.lng])
      }
    })
    if (bounds.length === 1) map.setView(bounds[0], 16)
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [50, 50] })
  }, [filtroTipo, filtroTurno, itemsMapaables.length])

  useEffect(() => {
    const map=mapObjRef.current; const layer=comunasLayerRef.current; if (!map||!layer) return
    comunasVisible ? (map.hasLayer(layer)||layer.addTo(map)) : (map.hasLayer(layer)&&map.removeLayer(layer))
  }, [comunasVisible])

  useEffect(() => {
    if (mapObjRef.current) setTimeout(() => mapObjRef.current?.invalidateSize(), 80)
  }, [height])

  if (itemsMapaables.length === 0) return (
    <div style={{ height, background: '#f5f5f7', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#aeaeb2' }}>
      <div style={{ fontSize: 32 }}>🗺</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2744' }}>Sin coordenadas disponibles</div>
      <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 260 }}>Usa Places Autocomplete o traza una zona para habilitar el mapa.</div>
    </div>
  )
  return <div ref={mapRef} style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden', border: '0.5px solid #e5e5ea' }}/>
}

// ── MAPA PRESENTACION ─────────────────────────────────────────
function MapaPresentacion({ os, items, onClose }) {
  const [filtroTipo,     setFiltroTipo]     = useState('todos')
  const [filtroTurno,    setFiltroTurno]    = useState('todos')
  const [comunasVisible, setComunasVisible] = useState(true)
  const [altMapa,        setAltMapa]        = useState(() => Math.max(400, window.innerHeight - 110))

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    function onResize() { setAltMapa(Math.max(400, window.innerHeight - 110)) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const itemsConCoords  = items.filter(it => it.lat && it.lng || parsePoligonoCoords(it.poligono_coords)?.length >= 3)
  const turnosPresentes = [...new Set(itemsConCoords.map(it => it.turno).filter(Boolean))]
  const totalAgentes    = items.reduce((acc, it) => acc + totalAgentesItem(it), 0)

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0d1829', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#1a2744', flexShrink: 0, boxShadow: '0 2px 16px rgba(0,0,0,0.5)', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 5, height: 30, background: '#f5c800', borderRadius: 2 }}/>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#f5c800', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1 }}>DGCAT · GCBA</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2, marginTop: 2 }}>
                OS-{String(os.numero).padStart(3,'0')} — {os.titulo || 'Orden de Servicio'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
            {[
              { v: items.filter(i=>i.tipo==='servicio').length, label: 'Servicios', color: '#4ecdc4' },
              { v: items.filter(i=>i.tipo==='mision').length,   label: 'Misiones',  color: '#e24b4a' },
              { v: totalAgentes || '—',                          label: 'Agentes',   color: '#f5c800' },
              { v: itemsConCoords.length,                        label: 'En mapa',   color: '#a8d8a8' },
            ].map(({ v, label, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: '4px 12px', background: 'rgba(255,255,255,0.07)', borderRadius: 8, minWidth: 54 }}>
                <div style={{ fontSize: 17, fontWeight: 900, color, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          <button onClick={onClose}
            style={{ marginLeft: 'auto', padding: '5px 16px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Cerrar
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px 10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 2 }}>
            {[['todos','Todos'],['servicio','Servicios'],['mision','Misiones']].map(([val, label]) => (
              <button key={val} onClick={() => setFiltroTipo(val)}
                style={{ padding: '3px 11px', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filtroTipo===val?700:400, background: filtroTipo===val?'rgba(255,255,255,0.92)':'transparent', color: filtroTipo===val?'#1a2744':'rgba(255,255,255,0.6)', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)' }}/>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <button onClick={() => setFiltroTurno('todos')}
              style={{ padding: '3px 10px', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filtroTurno==='todos'?700:400, background: filtroTurno==='todos'?'rgba(255,255,255,0.18)':'transparent', color: 'rgba(255,255,255,0.7)' }}>
              Todos los turnos
            </button>
            {turnosPresentes.map(id => {
              const t=TURNO_MAP[id]; if (!t) return null
              return (
                <button key={id} onClick={() => setFiltroTurno(id)}
                  style={{ padding: '3px 9px', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filtroTurno===id?800:500, background: filtroTurno===id?t.color:t.bg, color: filtroTurno===id?'#fff':t.color }}>
                  {t.short}
                </button>
              )
            })}
          </div>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)' }}/>
          <button onClick={() => setComunasVisible(v => !v)}
            style={{ padding: '3px 12px', borderRadius: 16, border: `1px solid ${comunasVisible?'#4ecdc4':'rgba(255,255,255,0.15)'}`, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: comunasVisible?'rgba(78,205,196,0.12)':'transparent', color: comunasVisible?'#4ecdc4':'rgba(255,255,255,0.4)' }}>
            {comunasVisible ? '✓' : '○'} Comunas
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#185fa5' }}/><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Servicio</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e24b4a' }}/><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Mision</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 14, height: 10, background: 'rgba(24,95,165,0.3)', border: '1.5px solid #185fa5', borderRadius: 2 }}/><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Zona</span></div>
            {comunasVisible && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 14, height: 6, border: '1.5px dashed rgba(78,205,196,0.6)', borderRadius: 2 }}/><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Comunas</span></div>}
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', marginLeft: 6 }}>CAT Plataforma · DGCAT/GCBA</span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: '8px', minHeight: 0 }}>
        <MapaCore items={items} height={altMapa} filtroTipo={filtroTipo} filtroTurno={filtroTurno} comunasVisible={comunasVisible}/>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

// ── TAB MAPA ──────────────────────────────────────────────────
function TabMapa({ items, os }) {
  const [filtroTipo,     setFiltroTipo]     = useState('todos')
  const [filtroTurno,    setFiltroTurno]    = useState('todos')
  const [comunasVisible, setComunasVisible] = useState(true)
  const [presentacion,   setPresentacion]   = useState(false)

  const itemsMapaables  = items.filter(it => {
    if (it.modo_ubicacion === 'poligono') {
      const c = parsePoligonoCoords(it.poligono_coords)
      return Array.isArray(c) && c.length >= 3
    }
    return !!(it.lat && it.lng)
  })
  const sinCoords       = items.length - itemsMapaables.length
  const turnosPresentes = [...new Set(itemsMapaables.map(it => it.turno).filter(Boolean))]

  return (
    <>
      {presentacion && <MapaPresentacion os={os} items={items} onClose={() => setPresentacion(false)}/>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 2 }}>Filtros</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['todos','Todos'],['servicio','Solo Servicios'],['mision','Solo Misiones']].map(([val, label]) => (
            <button key={val} onClick={() => setFiltroTipo(val)}
              style={{ padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filtroTipo===val?700:400, background: filtroTipo===val?'#1a2744':'#f0f0f5', color: filtroTipo===val?'#fff':'#636366' }}>
              {label}
            </button>
          ))}
        </div>
        <span style={{ color: '#d1d1d6' }}>|</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => setFiltroTurno('todos')}
            style={{ padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filtroTurno==='todos'?700:400, background: filtroTurno==='todos'?'#1a2744':'#f0f0f5', color: filtroTurno==='todos'?'#fff':'#636366' }}>
            Todos los turnos
          </button>
          {turnosPresentes.map(id => {
            const t=TURNO_MAP[id]; if (!t) return null
            return (
              <button key={id} onClick={() => setFiltroTurno(id)}
                style={{ padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filtroTurno===id?700:400, background: filtroTurno===id?t.color:t.bg, color: filtroTurno===id?'#fff':t.color }}>
                {t.short}
              </button>
            )
          })}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={() => setComunasVisible(v => !v)}
            style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${comunasVisible?'#1a2744':'#d1d1d6'}`, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: comunasVisible?'#e4eaf5':'#fff', color: comunasVisible?'#1a2744':'#8e8e93' }}>
            {comunasVisible ? '✓' : '○'} Comunas
          </button>
          <button onClick={() => setPresentacion(true)}
            style={{ padding: '4px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: '#1a2744', color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            Presentar
          </button>
        </div>
      </div>

      <MapaCore items={items} height={260} filtroTipo={filtroTipo} filtroTurno={filtroTurno} comunasVisible={comunasVisible}/>

      <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#185fa5' }}/><span style={{ fontSize: 11, color: '#636366' }}>Servicio ({itemsMapaables.filter(i=>i.tipo==='servicio').length})</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e24b4a' }}/><span style={{ fontSize: 11, color: '#636366' }}>Mision ({itemsMapaables.filter(i=>i.tipo==='mision').length})</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 14, height: 10, background: 'rgba(24,95,165,0.2)', border: '2px solid #185fa5', borderRadius: 2 }}/><span style={{ fontSize: 11, color: '#636366' }}>Zona trazada</span></div>
        {comunasVisible && <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 16, height: 7, border: '2px dashed #1a2744', borderRadius: 2, background: 'rgba(52,81,178,0.06)' }}/><span style={{ fontSize: 11, color: '#636366' }}>Comunas CABA</span></div>}
        {sinCoords > 0 && <span style={{ fontSize: 11, color: '#854f0b', background: '#faeeda', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{sinCoords} {sinCoords===1?'item':'items'} sin ubicacion</span>}
      </div>
    </>
  )
}

function Vacio({ texto }) {
  return <div style={{ textAlign: 'center', padding: '40px 20px', color: '#aeaeb2', fontSize: 13 }}>{texto}</div>
}
function Tab({ id, label, activo, badge, onClick }) {
  return (
    <button onClick={() => onClick(id)}
      style={{ padding: '10px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: activo?700:400, color: activo?'#1a2744':'#8e8e93', borderBottom: activo?'2px solid #1a2744':'2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap' }}>
      {label}
      {badge > 0 && <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 800, background: '#f5c800', color: '#854f0b', padding: '1px 6px', borderRadius: 8 }}>{badge}</span>}
    </button>
  )
}

export default function ResumenOS({ os, onClose }) {
  const [loading, setLoading]     = useState(true)
  const [data, setData]           = useState(null)
  const [error, setError]         = useState(null)
  const [tabActiva, setTabActiva] = useState('turno')
  const [items, setItems]         = useState([])

  useEffect(() => { cargarResumen() }, [os.id])

  async function cargarResumen() {
    setLoading(true); setError(null)
    try { const res = await api.get(`/api/os/${os.id}/resumen`); setData(res); setItems(res.items||[]) }
    catch (e) { setError('No se pudo cargar el resumen'); console.warn(e) }
    setLoading(false)
  }

  function handleComunaAsignada(itemId, comuna) {
    setItems(prev => prev.map(it => it.id===itemId ? {...it, comuna} : it))
    if (!data) return
    const item = items.find(it => it.id===itemId); if (!item) return
    const nuevoPorComuna = {...data.stats.por_comuna}
    if (!nuevoPorComuna[comuna]) nuevoPorComuna[comuna] = {servicios:0, misiones:0, agentes:0}
    if (item.tipo==='servicio') nuevoPorComuna[comuna].servicios++; else nuevoPorComuna[comuna].misiones++
    setData(prev => ({...prev, items: prev.items.map(it => it.id===itemId?{...it,comuna}:it), stats: {...prev.stats, por_comuna: nuevoPorComuna, totales: {...prev.stats.totales, comunas: Object.keys(nuevoPorComuna).length}, alertas: {...prev.stats.alertas, sin_comuna: Math.max(0,(prev.stats.alertas.sin_comuna||0)-1)}}}))
  }

  const stats            = data?.stats
  const alertas          = stats?.alertas || {}
  const totalIncompletos = items.filter(itemIncompleto).length

  const TABS = [
    { id:'turno',   label:'Por turno' },
    { id:'comuna',  label:'Por comuna',  badge: alertas.sin_comuna },
    { id:'psv',     label:'Eje PSV',     badge: alertas.sin_eje_psv },
    { id:'mapa',    label:'Mapa' },
    { id:'alertas', label:'Completitud', badge: totalIncompletos },
  ]

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 950 }}/>
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 951, background: '#fff', borderRadius: 20, boxShadow: '0 24px 72px rgba(0,0,0,0.2)', width: 'min(900px, 95vw)', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ padding: '22px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a2744', letterSpacing: '-0.4px' }}>Resumen operativo</div>
              <div style={{ fontSize: 13, color: '#8e8e93', marginTop: 2 }}>OS-{String(os.numero).padStart(3,'0')} · {os.titulo||''}</div>
            </div>
            <button onClick={onClose} style={{ background: '#f5f5f7', border: 'none', borderRadius: 9, cursor: 'pointer', color: '#636366', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Cerrar
            </button>
          </div>

          {stats && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
              <StatCard value={stats.totales.items} label="Items en la OS" sub={`${stats.totales.servicios} servicios · ${stats.totales.misiones} misiones`}/>
              <StatCard value={stats.totales.agentes||'—'} label="Agentes requeridos" color="#0f6e56" sub="Segun config. de items"/>
              <StatCard value={stats.totales.comunas||'—'} label="Comunas cubiertas" color="#534ab7" sub="Con ubicacion resuelta"/>
              {totalIncompletos > 0 && <StatCard value={totalIncompletos} label="Items con datos faltantes" color="#854f0b" alert sub="Ver tab Completitud"/>}
            </div>
          )}

          <div style={{ display: 'flex', borderBottom: '0.5px solid #e5e5ea', overflowX: 'auto' }}>
            {TABS.map(t => <Tab key={t.id} {...t} activo={tabActiva===t.id} onClick={setTabActiva}/>)}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 28px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#aeaeb2' }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>⏳</div>
              <div style={{ fontSize: 13 }}>Calculando estadisticas...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#e24b4a' }}>
              <div style={{ fontSize: 13, marginBottom: 12 }}>{error}</div>
              <button onClick={cargarResumen} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: '#1a2744', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Reintentar</button>
            </div>
          ) : data ? (
            <>
              {tabActiva==='turno'   && <TabTurno porTurno={data.stats.por_turno}/>}
              {tabActiva==='comuna'  && <TabComuna porComuna={data.stats.por_comuna} items={items} comunasDisponibles={data.comunas_disponibles} onComunaAsignada={handleComunaAsignada}/>}
              {tabActiva==='psv'     && <TabEjePSV porEjePSV={data.stats.por_eje_psv} sinEjePSV={alertas.sin_eje_psv}/>}
              {tabActiva==='mapa'    && <TabMapa items={items} os={os}/>}
              {tabActiva==='alertas' && <TabAlertas items={items}/>}
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
