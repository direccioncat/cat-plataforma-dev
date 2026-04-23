/**
 * UbicacionInput.jsx
 * Campo unico de busqueda + poligono con mapa interactivo.
 *
 * ENTRE CALLES: el dropdown aparece cuando el texto tiene formato completo.
 * Georef entiende: "Corrientes entre Callao y Uruguay"
 * Para el autocompletado parcial usamos el endpoint /calles para sugerir calles.
 *
 * POLIGONO:
 * - Mini mapa (Leaflet) muestra el poligono trazado — sin Google Maps
 * - Campo de nombre para la zona
 * - Reverse geocoding de vertices para detectar calles de referencia
 */
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import MapaPoligono from './MapaPoligono'

const GEOREF = 'https://apis.datos.gob.ar/georef/api'

// ── Detecta si la query tiene forma "X entre Y y Z" ──────────
function esEntreCallesCompleto(texto) {
  return /\bentre\b.+\by\b/i.test(texto)
}

// ── Google Geocoding API — solo como fallback para entre calles ──
async function geocodificarPunto(texto) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!key) return null
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(texto + ', CABA, Argentina')}&key=${key}&language=es&region=ar`
    const res  = await fetch(url)
    const data = await res.json()
    if (data.status === 'OK' && data.results?.[0]) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
        formatted: data.results[0].formatted_address,
      }
    }
    return null
  } catch { return null }
}

/**
 * Entre calles: geocodifica las DOS intersecciones y calcula el punto medio.
 * Ej: "Av Corrientes entre Callao y Uruguay"
 *   -> geocodifica "Av Corrientes y Callao" -> punto A
 *   -> geocodifica "Av Corrientes y Uruguay" -> punto B
 *   -> devuelve { lat, lng } = promedio(A, B)
 */
async function geocodificarEntreCalles(calle, desde, hasta) {
  const [pA, pB] = await Promise.all([
    geocodificarPunto(`${calle} y ${desde}`),
    geocodificarPunto(`${calle} y ${hasta}`),
  ])
  if (!pA || !pB) return pA || pB || null
  return {
    lat: (pA.lat + pB.lat) / 2,
    lng: (pA.lng + pB.lng) / 2,
    formatted: `${calle} entre ${desde} y ${hasta}`,
    puntoA: pA,
    puntoB: pB,
  }
}

// Para queries de texto libre con "entre" (sin campos separados)
async function geocodificarConGoogle(texto) {
  const match = texto.match(/^(.+?)\s+entre\s+(.+?)\s+y\s+(.+)$/i)
  if (match) {
    const [, calle, desde, hasta] = match
    const r = await geocodificarEntreCalles(calle.trim(), desde.trim(), hasta.trim())
    if (r) return {
      _tipo: 'entre_calles',
      calle: { nombre: calle.trim() },
      nomenclatura: r.formatted,
      ubicacion: { lat: r.lat, lon: r.lng },
      _puntos: { A: r.puntoA, B: r.puntoB },
    }
  }
  const r = await geocodificarPunto(texto)
  if (!r) return null
  return {
    _tipo: 'direccion',
    calle: { nombre: texto },
    nomenclatura: r.formatted,
    ubicacion: { lat: r.lat, lon: r.lng },
  }
}

// ── Detecta si tiene forma "X y Z" o "X esquina Z" ──────────
function esInterseccionCompleta(texto) {
  return /\by\b|\besq(uina)?\b/i.test(texto)
}

// ── Llama a Georef /direcciones para queries con estructura completa ──
async function buscarDirecciones(texto) {
  try {
    const url = `${GEOREF}/direcciones?direccion=${encodeURIComponent(texto)}&provincia=02&max=6`
    const res = await fetch(url)
    const data = await res.json()
    return (data.direcciones || []).filter(d => d.calle?.nombre)
  } catch { return [] }
}

// ── Llama a Georef /calles para autocompletar el nombre de calle ──
async function autocompletarCalle(texto) {
  if (!texto || texto.trim().length < 2) return []
  try {
    const url = `${GEOREF}/calles?nombre=${encodeURIComponent(texto)}&provincia=02&max=8&campos=basico`
    const res = await fetch(url)
    const data = await res.json()
    return data.calles || []
  } catch { return [] }
}

// ── Formatea una sugerencia de Georef en texto legible ──────
function formatSugerencia(d) {
  const partes = [d.calle?.nombre]
  if (d.altura?.valor) partes.push(d.altura.valor)
  if (d.calle_cruce_1?.nombre) partes.push('y', d.calle_cruce_1.nombre)
  if (d.calle_cruce_2?.nombre) partes.push('y', d.calle_cruce_2.nombre)
  return partes.filter(Boolean).join(' ')
}

function tipoDir(d) {
  if (d.calle_cruce_2?.nombre) return 'entre_calles'
  if (d.calle_cruce_1?.nombre) return 'interseccion'
  return 'altura'
}

// ── Reverse geocoding de un punto para obtener calle mas cercana ──
async function calleEnPunto(lat, lng) {
  try {
    const url = `${GEOREF}/ubicacion?lat=${lat}&lon=${lng}&campos=calle`
    const res = await fetch(url)
    const data = await res.json()
    return data.ubicacion?.calle?.nombre || null
  } catch { return null }
}

// ── Obtiene calles de referencia de los vertices del poligono ──
async function obtenerCallesReferencia(coords) {
  if (!coords || coords.length < 3) return []
  const muestra = coords.filter((_, i) => i % Math.max(1, Math.floor(coords.length / 8)) === 0).slice(0, 8)
  const calles = await Promise.all(muestra.map(p => calleEnPunto(p.lat, p.lng)))
  return [...new Set(calles.filter(Boolean))]
}

// ── MINI MAPA Leaflet — muestra el poligono ya trazado (solo lectura) ──
function MiniMapaPoligono({ poligono, height = 200, onAmpliar }) {
  const mapDivRef = useRef(null)
  const mapRef    = useRef(null)
  const polyRef   = useRef(null)

  useEffect(() => {
    if (!mapDivRef.current) return

    // Crear mapa si no existe
    if (!mapRef.current) {
      mapRef.current = L.map(mapDivRef.current, {
        center: [-34.6118, -58.4173],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapRef.current)
    }

    // Limpiar poligono anterior
    if (polyRef.current) {
      mapRef.current.removeLayer(polyRef.current)
      polyRef.current = null
    }

    if (poligono?.length >= 3) {
      const latlngs = poligono.map(p => [p.lat, p.lng])
      polyRef.current = L.polygon(latlngs, {
        color:       '#1a2744',
        fillColor:   '#1a2744',
        fillOpacity: 0.18,
        weight:      2,
      }).addTo(mapRef.current)
      mapRef.current.fitBounds(polyRef.current.getBounds(), { padding: [12, 12] })
    }
  }, [poligono])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        polyRef.current = null
      }
    }
  }, [])

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '0.5px solid #e5e5ea', position: 'relative' }}>
      <div ref={mapDivRef} style={{ height }}/>

      {/* Boton Ampliar — esquina inferior izquierda */}
      <button onClick={onAmpliar}
        title="Ampliar mapa para trazar"
        style={{
          position: 'absolute', bottom: 8, left: 8, zIndex: 500,
          display: 'flex', alignItems: 'center', gap: 5,
          background: '#fff', border: '0.5px solid #e5e5ea',
          borderRadius: 8, padding: '6px 11px',
          fontSize: 12, fontWeight: 600, color: '#1a2744',
          cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
        onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 3 21 3 21 9"/>
          <polyline points="9 21 3 21 3 15"/>
          <line x1="21" y1="3" x2="14" y2="10"/>
          <line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
        {poligono?.length >= 3 ? 'Editar zona' : 'Trazar zona'}
      </button>

      {/* Hint cuando esta vacio */}
      {(!poligono || poligono.length < 3) && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#534ab7', fontWeight: 600, pointerEvents: 'none', boxShadow: '0 1px 6px rgba(0,0,0,0.1)', whiteSpace: 'nowrap', textAlign: 'center', zIndex: 400 }}>
          Hace click en "Trazar zona" para comenzar
        </div>
      )}
    </div>
  )
}

// ── MODAL DE MAPA GRANDE ──────────────────────────────────────
function ModalMapaGrande({ poligono, onChange, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}/>
      <div style={{ position: 'relative', width: '82vw', maxWidth: 1000, background: '#fff', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid #f2f2f7' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2744' }}>Trazar zona en el mapa</div>
            <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>Usa la herramienta de dibujo para delimitar el area. Podes editar los vertices arrastandolos.</div>
          </div>
          <button onClick={onClose}
            style={{ background: '#1a2744', border: 'none', borderRadius: 9, cursor: 'pointer', padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#fff' }}>
            Listo
          </button>
        </div>
        <div style={{ padding: 16 }}>
          <MapaPoligono poligono={poligono} onChange={onChange} height={520}/>
        </div>
      </div>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function UbicacionInput({ form, setForm }) {
  const [query,       setQuery]       = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [buscando,    setBuscando]    = useState(false)
  const [abierto,     setAbierto]     = useState(false)
  const [geocState,   setGeocState]   = useState('idle')
  const [modoMapa,    setModoMapa]    = useState(false)
  const [modalMapa,   setModalMapa]   = useState(false)
  const [callesRef,   setCallesRef]   = useState([])
  const [loadingRef,  setLoadingRef]  = useState(false)

  const debounceRef = useRef(null)
  const wrapRef     = useRef(null)

  // Inicializar query desde el form si ya tiene datos
  useEffect(() => {
    if (form.modo_ubicacion === 'poligono') { setModoMapa(true); return }
    if (form.calle && !query) {
      const partes = [form.calle]
      if (form.altura)         partes.push(form.altura)
      if (form.calle2)         partes.push('y', form.calle2)
      else if (form.desde && form.hasta) partes.push('entre', form.desde, 'y', form.hasta)
      setQuery(partes.join(' '))
      if (form.lat) setGeocState('ok')
    }
  }, [])

  // Cerrar dropdown al clickear fuera
  useEffect(() => {
    const handler = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cada vez que cambia el poligono, obtener calles de referencia
  useEffect(() => {
    const coords = form.poligono_coords
    if (!coords || coords.length < 3) { setCallesRef([]); return }
    setLoadingRef(true)
    obtenerCallesReferencia(coords).then(calles => {
      setCallesRef(calles)
      setLoadingRef(false)
      if (!form.poligono_nombre) {
        setForm(f => ({ ...f, poligono_desc: calles.join(' / ') }))
      }
    })
  }, [form.poligono_coords])

  // ── Busqueda con debounce ────────────────────────────────────
  function handleChange(val) {
    setQuery(val)
    setGeocState('idle')
    setAbierto(false)
    clearTimeout(debounceRef.current)
    if (!val.trim() || val.trim().length < 3) { setSugerencias([]); return }

    setBuscando(true)
    debounceRef.current = setTimeout(async () => {
      let sugs = []

      if (esEntreCallesCompleto(val)) {
        const r = await geocodificarConGoogle(val)
        if (r) sugs = [r]
      } else if (esInterseccionCompleta(val) || /\d/.test(val)) {
        sugs = await buscarDirecciones(val)
        if (sugs.length === 0) {
          const r = await geocodificarConGoogle(val)
          if (r) sugs = [r]
        }
      }

      if (sugs.length === 0) {
        const partesCalle = val.split(/\sentre\s|\sy\s|\sesq(uina)?\s/i)
        const ultimaParte = partesCalle[partesCalle.length - 1]?.trim()
        const calles = await autocompletarCalle(ultimaParte || val)
        sugs = calles.map(c => ({
          _tipo: 'calle',
          calle: { nombre: c.nombre, categoria: c.categoria },
          nomenclatura: `${c.nomenclatura}`,
          ubicacion: c.centroide ? { lat: c.centroide.lat, lon: c.centroide.lon } : null,
        }))
      }

      setSugerencias(sugs)
      setBuscando(false)
      setAbierto(sugs.length > 0)
    }, 400)
  }

  function seleccionar(d) {
    if (d._tipo === 'calle') {
      const nombreCalle = d.calle.nombre
      const hayEntre = /\bentre\s+\S/i.test(query)
      const hayY     = /\sy\s*\S*$/i.test(query)

      let nuevoQuery
      if (hayEntre || hayY) {
        nuevoQuery = query.replace(/\S+$/, nombreCalle)
      } else {
        nuevoQuery = nombreCalle
      }
      setQuery(nuevoQuery)
      setAbierto(false)
      setSugerencias([])

      if (esEntreCallesCompleto(nuevoQuery) || esInterseccionCompleta(nuevoQuery)) {
        setTimeout(() => buscarCoordsDeTexto(nuevoQuery), 100)
      }
      return
    }

    const texto = d._tipo === 'entre_calles'
      ? (d.nomenclatura || d.calle?.nombre)
      : formatSugerencia(d)
    const tipo = d._tipo === 'entre_calles' ? 'entre_calles' : tipoDir(d)

    setQuery(texto)
    setAbierto(false)
    setSugerencias([])

    if (d._tipo === 'entre_calles') {
      const match = (d.nomenclatura || '').match(/^(.+?)\s+entre\s+(.+?)\s+y\s+(.+)$/i)
      setForm(f => ({
        ...f,
        modo_ubicacion: 'entre_calles',
        calle:  match?.[1] || d.calle?.nombre || '',
        desde:  match?.[2] || '',
        hasta:  match?.[3] || '',
        calle2: '',
        altura: '',
        lat:    d.ubicacion?.lat || null,
        lng:    d.ubicacion?.lon || null,
        place_id: null,
      }))
    } else {
      setForm(f => ({
        ...f,
        modo_ubicacion: tipo,
        calle:  d.calle?.nombre || '',
        altura: d.altura?.valor?.toString() || '',
        calle2: d.calle_cruce_1?.nombre || '',
        desde:  d.calle_cruce_1?.nombre || '',
        hasta:  d.calle_cruce_2?.nombre || '',
        lat:    d.ubicacion?.lat || null,
        lng:    d.ubicacion?.lon || null,
        place_id: null,
      }))
    }

    setGeocState(d.ubicacion?.lat ? 'ok' : 'error')
  }

  async function buscarCoordsDeTexto(texto) {
    setBuscando(true)
    const dirs = await buscarDirecciones(texto)
    setBuscando(false)
    if (dirs.length > 0) {
      setSugerencias(dirs)
      setAbierto(true)
    }
  }

  function limpiarCampos() {
    setQuery('')
    setSugerencias([])
    setGeocState('idle')
    setAbierto(false)
    setCallesRef([])
    setForm(f => ({ ...f, calle: '', altura: '', calle2: '', desde: '', hasta: '', lat: null, lng: null, place_id: null, poligono_coords: [], poligono_desc: '', poligono_nombre: '' }))
  }

  function limpiar() {
    limpiarCampos()
    setModoMapa(false)
  }

  const mapsUrl = (geocState === 'ok' && form.lat && form.lng)
    ? `https://www.google.com/maps?q=${form.lat},${form.lng}`
    : null

  const INP_BASE = {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    fontSize: 14, fontFamily: 'inherit', color: '#1d1d1f', padding: '11px 13px',
  }

  return (
    <div>
      {/* Toggle Direccion / Zona */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 9, background: '#f5f5f7', borderRadius: 10, padding: 3 }}>
        <button onClick={() => { setModoMapa(false); limpiarCampos() }}
          style={{ flex: 1, padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: !modoMapa ? 700 : 500, background: !modoMapa ? '#fff' : 'transparent', color: !modoMapa ? '#1a2744' : '#8e8e93', boxShadow: !modoMapa ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
          Direccion
        </button>
        <button onClick={() => { setModoMapa(true); limpiarCampos() }}
          style={{ flex: 1, padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: modoMapa ? 700 : 500, background: modoMapa ? '#fff' : 'transparent', color: modoMapa ? '#1a2744' : '#8e8e93', boxShadow: modoMapa ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
          Zona / Poligono
        </button>
      </div>

      {/* ── MODO DIRECCION ───────────────────────────────── */}
      {!modoMapa && (
        <div ref={wrapRef} style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f9f9fb', border: `1.5px solid ${geocState === 'ok' ? '#0f6e56' : geocState === 'error' ? '#e24b4a' : '#e5e5ea'}`, borderRadius: 10, overflow: 'hidden' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2" style={{ marginLeft: 12, flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={query}
              onChange={e => handleChange(e.target.value)}
              onFocus={() => sugerencias.length > 0 && setAbierto(true)}
              onKeyDown={e => e.key === 'Enter' && query.trim().length > 3 && buscarCoordsDeTexto(query)}
              placeholder="Ej: Av. Corrientes 1234  ·  Corrientes y Callao  ·  Corrientes entre Callao y Uruguay"
              style={INP_BASE}
              autoComplete="off"
            />
            {buscando && <span style={{ marginRight: 10, fontSize: 13 }}>⏳</span>}
            {query && !buscando && (
              <button onClick={limpiar} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 10px', color: '#c7c7cc', fontSize: 18, lineHeight: 1 }}>×</button>
            )}
          </div>

          <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 5, paddingLeft: 2 }}>
            Escribi la direccion como queras — altura, esquina o entre calles · <strong>Enter</strong> para buscar
          </div>

          {/* Dropdown de sugerencias */}
          {abierto && sugerencias.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 500, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
              {sugerencias.map((d, i) => {
                const esCalle = d._tipo === 'calle'
                const tipoIcon = esCalle ? '' : tipoDir(d) === 'entre_calles' ? '↔' : tipoDir(d) === 'interseccion' ? '✕' : '📍'
                const tipoLabel = esCalle ? (d.calle.categoria || 'Calle') : tipoDir(d) === 'entre_calles' ? 'Entre calles' : tipoDir(d) === 'interseccion' ? 'Esquina' : 'Direccion'
                const texto = esCalle ? d.calle.nombre : formatSugerencia(d)
                const subtitulo = esCalle ? d.nomenclatura : (d.nomenclatura || 'CABA')
                return (
                  <div key={i} onClick={() => seleccionar(d)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: i < sugerencias.length - 1 ? '0.5px solid #f5f5f7' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ fontSize: 14, flexShrink: 0, width: 20, textAlign: 'center' }}>{tipoIcon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{texto}</div>
                      <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 1 }}>
                        {subtitulo} · {tipoLabel}
                      </div>
                    </div>
                    {!esCalle && d.ubicacion?.lat && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#0f6e56" stroke="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Estado de geocodificacion */}
          {geocState === 'ok' && mapsUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', background: '#e8faf2', borderRadius: 9, marginTop: 8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0f6e56" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontSize: 12, color: '#0f6e56', fontWeight: 600 }}>Ubicacion georreferenciada</span>
              <span style={{ fontSize: 11, color: '#aeaeb2' }}>{form.lat?.toFixed(4)}, {form.lng?.toFixed(4)}</span>
              <a href={mapsUrl} target="_blank" rel="noreferrer"
                style={{ marginLeft: 'auto', fontSize: 12, color: '#185fa5', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                Ver en Maps
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          )}
          {geocState === 'error' && (
            <div style={{ fontSize: 12, color: '#854f0b', background: '#faeeda', borderRadius: 9, padding: '7px 11px', marginTop: 8 }}>
              No se encontraron coordenadas exactas. La direccion se guardara como texto.
            </div>
          )}
        </div>
      )}

      {/* ── MODO POLIGONO ────────────────────────────────── */}
      {modoMapa && (
        <div>
          {/* Mini mapa — muestra el poligono trazado */}
          <MiniMapaPoligono
            poligono={form.poligono_coords || []}
            height={180}
            onAmpliar={() => setModalMapa(true)}
          />

          {/* Info: zona trazada + calles de referencia + campo de nombre */}
          {form.poligono_coords?.length >= 3 ? (
            <div style={{ marginTop: 8 }}>
              {callesRef.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '7px 11px', background: '#f0f4ff', borderRadius: 9, marginBottom: 8 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#534ab7" strokeWidth="2" style={{ marginTop: 1, flexShrink: 0 }}><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#534ab7', marginBottom: 2 }}>Calles de referencia detectadas</div>
                    <div style={{ fontSize: 12, color: '#3c3489', fontWeight: 600 }}>
                      {loadingRef ? 'Detectando...' : callesRef.join(' / ')}
                    </div>
                  </div>
                </div>
              )}
              {loadingRef && callesRef.length === 0 && (
                <div style={{ fontSize: 12, color: '#8e8e93', padding: '6px 0' }}>Detectando calles de referencia...</div>
              )}

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                  Nombre de la zona
                </div>
                <input
                  value={form.poligono_nombre || ''}
                  onChange={e => setForm(f => ({
                    ...f,
                    poligono_nombre: e.target.value,
                    poligono_desc: e.target.value || callesRef.join(' / '),
                  }))}
                  placeholder={callesRef.length > 0 ? `Ej: ${callesRef.slice(0,2).join(' / ')}` : 'Ej: Zona Norte, Poligono Microcentro...'}
                  style={{ width: '100%', background: '#f9f9fb', border: '0.5px solid #e5e5ea', borderRadius: 9, padding: '9px 12px', fontSize: 14, color: '#1d1d1f', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 4 }}>
                  Si no pones un nombre, se usa la referencia de calles detectada automaticamente
                </div>
              </div>

              <button onClick={() => setForm(f => ({ ...f, poligono_coords: [], poligono_desc: '', poligono_nombre: '', lat: null, lng: null }))}
                style={{ marginTop: 8, fontSize: 12, color: '#e24b4a', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                × Borrar zona trazada
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 6, textAlign: 'center' }}>
              Hace click en "Trazar zona" para abrir el mapa y delimitar el area
            </div>
          )}
        </div>
      )}

      {/* Modal mapa grande */}
      {modalMapa && (
        <ModalMapaGrande
          poligono={form.poligono_coords || []}
          onChange={(coords, desc, centroide) => {
            setForm(f => ({
              ...f,
              poligono_coords: coords,
              poligono_desc: form.poligono_nombre || desc,
              lat: centroide?.lat ?? f.lat,
              lng: centroide?.lng ?? f.lng,
              modo_ubicacion: 'poligono',
            }))
          }}
          onClose={() => setModalMapa(false)}
        />
      )}
    </div>
  )
}
