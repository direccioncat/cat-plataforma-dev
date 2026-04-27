// ── Buscador Nominatim (OpenStreetMap) restringido a CABA ─────
// Reemplaza USIG /suggest/ que redirige al mapa web y no devuelve JSON
function BuscadorUSIG({ mapRef }) {
  const [query,      setQuery]      = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando,   setBuscando]   = useState(false)
  const [abierto,    setAbierto]    = useState(false)
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  // Bounding box de CABA: SO(-58.531,-34.706) NE(-58.335,-34.527)
  const VIEWBOX = '-58.531,-34.706,-58.335,-34.527'

  async function buscar(texto) {
    if (!texto.trim() || texto.length < 3) { setResultados([]); setAbierto(false); return }
    setBuscando(true)
    try {
      const q   = encodeURIComponent(texto + ', Buenos Aires, Argentina')
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=6&countrycodes=ar&viewbox=${VIEWBOX}&bounded=1&addressdetails=0`
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      const data = await res.json()
      setResultados(data)
      setAbierto(data.length > 0)
    } catch (_) {
      setResultados([])
    }
    setBuscando(false)
  }

  function handleChange(e) {
    const v = e.target.value
    setQuery(v)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(v), 400)
  }

  function seleccionar(item) {
    const map = mapRef.current
    if (!map) return
    map.flyTo([parseFloat(item.lat), parseFloat(item.lon)], 17, { duration: 0.8 })
    // Mostrar solo la parte legible del display_name (antes de la primera coma, o las primeras 2 partes)
    const partes = item.display_name.split(',')
    setQuery(partes.slice(0, 2).join(',').trim())
    setResultados([])
    setAbierto(false)
  }

  function limpiar() {
    setQuery('')
    setResultados([])
    setAbierto(false)
    inputRef.current?.focus()
  }

  // Limpiar display_name para que sea legible: tomar primeras 2 partes
  function limpiarLabel(display_name) {
    return display_name.split(',').slice(0, 3).join(',').trim()
  }

  return (
    <div style={{ position:'absolute', top:14, left:14, zIndex:1000, width:268 }}>
      {/* Input */}
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)',
        border:'0.5px solid rgba(0,0,0,0.08)',
        borderRadius: abierto ? '13px 13px 0 0' : 13,
        padding:'9px 12px',
        boxShadow:'0 4px 24px rgba(0,0,0,0.10)',
        transition:'border-radius 0.12s',
      }}>
        {buscando ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2"
            style={{ flexShrink:0, animation:'spin 0.7s linear infinite' }}>
            <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2" style={{ flexShrink:0 }}>
            <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
          </svg>
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => resultados.length > 0 && setAbierto(true)}
          onKeyDown={e => { if (e.key === 'Escape') limpiar() }}
          placeholder="Buscar dirección en CABA..."
          style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:13, color:'#1d1d1f', fontFamily:'inherit' }}
        />
        {query && (
          <button onClick={limpiar}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#aeaeb2', padding:'1px', display:'flex', lineHeight:1 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {abierto && resultados.length > 0 && (
        <div style={{
          background:'rgba(255,255,255,0.98)', backdropFilter:'blur(12px)',
          border:'0.5px solid rgba(0,0,0,0.08)', borderTop:'none',
          borderRadius:'0 0 13px 13px',
          boxShadow:'0 8px 24px rgba(0,0,0,0.10)',
          overflow:'hidden',
        }}>
          {resultados.map((item, i) => (
            <div
              key={item.place_id}
              onClick={() => seleccionar(item)}
              style={{
                padding:'9px 12px', cursor:'pointer', fontSize:12,
                color:'#1d1d1f', borderTop: i > 0 ? '0.5px solid #f2f2f7' : 'none',
                display:'flex', alignItems:'flex-start', gap:8,
              }}
              onMouseEnter={e => e.currentTarget.style.background='#f5f5f7'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2"
                style={{ flexShrink:0, marginTop:1 }}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              <span style={{ flex:1, lineHeight:1.4 }}>{limpiarLabel(item.display_name)}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
