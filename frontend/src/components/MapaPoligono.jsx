/**
 * MapaPoligono.jsx
 * Mapa interactivo para dibujar un poligono sobre CABA.
 * Usa Leaflet + Geoman (reemplaza Google Maps DrawingManager).
 *
 * Props:
 *   poligono   : array de {lat,lng} — coordenadas actuales
 *   onChange   : fn(coordenadas, descripcion, centroide) — cuando cambia el poligono
 *   height     : number — altura del mapa en px (default 260)
 */
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'

const CABA_CENTER = [-34.6118, -58.4173]
const ZOOM_INIT   = 14

const POLY_STYLE = {
  color:       '#1a2744',
  fillColor:   '#1a2744',
  fillOpacity: 0.18,
  weight:      2,
}

// ── Busca una direccion en CABA usando GeoRef ────────────────
async function buscarDireccionGeoRef(texto) {
  if (!texto || texto.trim().length < 3) return []
  try {
    const url = `https://apis.datos.gob.ar/georef/api/direcciones?direccion=${encodeURIComponent(texto)}&provincia=02&max=5`
    const res  = await fetch(url)
    const data = await res.json()
    return (data.direcciones || []).filter(d => d.ubicacion?.lat)
  } catch {
    return []
  }
}

function formatDir(d) {
  const partes = [d.calle?.nombre]
  if (d.altura?.valor)          partes.push(d.altura.valor)
  if (d.calle_cruce_1?.nombre)  partes.push('y', d.calle_cruce_1.nombre)
  return partes.filter(Boolean).join(' ')
}

// ── Buscador de direccion para navegar el mapa ───────────────
function BuscadorMapa({ onNavegar }) {
  const [query,    setQuery]    = useState('')
  const [sugs,     setSugs]     = useState([])
  const [abierto,  setAbierto]  = useState(false)
  const [buscando, setBuscando] = useState(false)
  const debRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function handleChange(val) {
    setQuery(val)
    clearTimeout(debRef.current)
    if (val.trim().length < 3) { setSugs([]); return }
    setBuscando(true)
    debRef.current = setTimeout(async () => {
      const dirs = await buscarDireccionGeoRef(val)
      setSugs(dirs)
      setBuscando(false)
      setAbierto(dirs.length > 0)
    }, 400)
  }

  function seleccionar(d) {
    setQuery(formatDir(d))
    setAbierto(false)
    setSugs([])
    onNavegar({ lat: d.ubicacion.lat, lng: d.ubicacion.lon })
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => sugs.length > 0 && setAbierto(true)}
          placeholder="Buscar una direccion para navegar..."
          autoComplete="off"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', color: '#1d1d1f', padding: '9px 0' }}
        />
        {buscando && <span style={{ fontSize: 12 }}>⏳</span>}
        {query && !buscando && (
          <button onClick={() => { setQuery(''); setSugs([]); setAbierto(false) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c7c7cc', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>
            ×
          </button>
        )}
      </div>

      {abierto && sugs.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: -12, right: -12, zIndex: 1000, background: '#fff', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
          {sugs.map((d, i) => (
            <div key={i} onClick={() => seleccionar(d)}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: '#1d1d1f', borderBottom: i < sugs.length - 1 ? '0.5px solid #f5f5f7' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f7'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              📍 {formatDir(d)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────
export default function MapaPoligono({ poligono = [], onChange, height = 260 }) {
  const mapDivRef  = useRef(null)
  const mapRef     = useRef(null)
  const layerRef   = useRef(null)   // Polygono actual en el mapa

  // ── Inicializar mapa ───────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return

    const map = L.map(mapDivRef.current, {
      center: CABA_CENTER,
      zoom:   ZOOM_INIT,
      zoomControl: true,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    // Configurar Geoman — solo Polygon habilitado
    map.pm.addControls({
      position:        'topleft',
      drawMarker:      false,
      drawCircleMarker:false,
      drawPolyline:    false,
      drawRectangle:   false,
      drawCircle:      false,
      drawText:        false,
      drawPolygon:     true,
      editMode:        true,
      dragMode:        true,
      cutPolygon:      false,
      removalMode:     true,
      rotateMode:      false,
    })

    map.pm.setGlobalOptions({
      pathOptions: POLY_STYLE,
    })

    // Al terminar de dibujar
    map.on('pm:create', ({ layer }) => {
      // Si ya habia un poligono anterior, borrarlo
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
      }
      layerRef.current = layer
      layer.setStyle(POLY_STYLE)

      // Desactivar herramienta de dibujo automaticamente
      map.pm.disableDraw()

      notificar(layer)

      // Escuchar edicion
      layer.on('pm:edit',   () => notificar(layer))
      layer.on('pm:drag',   () => notificar(layer))
    })

    // Al remover una capa con la herramienta de borrado
    map.on('pm:remove', ({ layer }) => {
      if (layerRef.current === layer) {
        layerRef.current = null
        onChange?.([], '', null)
      }
    })

    // Si ya hay un poligono guardado, dibujarlo
    if (poligono.length >= 3) {
      const latlngs = poligono.map(p => [p.lat, p.lng])
      const poly = L.polygon(latlngs, POLY_STYLE).addTo(map)
      layerRef.current = poly
      map.fitBounds(poly.getBounds(), { padding: [20, 20] })

      poly.on('pm:edit', () => notificar(poly))
      poly.on('pm:drag', () => notificar(poly))
    }

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Notificar cambios al padre ─────────────────────────────
  function notificar(layer) {
    const latlngs = layer.getLatLngs()[0]
    const coords  = latlngs.map(p => ({ lat: p.lat, lng: p.lng }))
    const lat = coords.reduce((s, p) => s + p.lat, 0) / coords.length
    const lng = coords.reduce((s, p) => s + p.lng, 0) / coords.length
    const desc = `Zona delimitada (${coords.length} vertices)`
    onChange?.(coords, desc, { lat, lng })
  }

  // ── Limpiar poligono ───────────────────────────────────────
  function limpiarPoligono() {
    if (layerRef.current && mapRef.current) {
      mapRef.current.removeLayer(layerRef.current)
      layerRef.current = null
    }
    onChange?.([], '', null)
  }

  // ── Navegar a una ubicacion buscada ───────────────────────
  function navegarA({ lat, lng }) {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 17)
    }
  }

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '0.5px solid #e5e5ea' }}>
      {/* Buscador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: '0.5px solid #e5e5ea', background: '#fff', position: 'relative', zIndex: 10 }}>
        <BuscadorMapa onNavegar={navegarA} />
      </div>

      {/* Mapa */}
      <div style={{ position: 'relative' }}>
        <div ref={mapDivRef} style={{ height }}/>

        {poligono.length === 0 && (
          <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#534ab7', fontWeight: 600, pointerEvents: 'none', boxShadow: '0 1px 6px rgba(0,0,0,0.1)', whiteSpace: 'nowrap', zIndex: 500 }}>
            Usa la herramienta ▲ para trazar la zona
          </div>
        )}

        {poligono.length >= 3 && (
          <button onClick={limpiarPoligono}
            style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 500, background: '#fff', border: '0.5px solid #e5e5ea', borderRadius: 7, padding: '5px 12px', fontSize: 12, color: '#e24b4a', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.12)', fontWeight: 600 }}>
            Borrar zona
          </button>
        )}
      </div>
    </div>
  )
}
