// ── DRAWER DE PREVIEW ─────────────────────────────────────────
// Fix: backdrop y panel como elementos hermanos con position:fixed independiente
// para evitar que el backdrop tape al panel por stacking context
function DrawerPreview({ os, fases, onGenerar, onCerrar, generando }) {
  const [objetivo,       setObjetivo]       = useState('')
  const [instrucciones,  setInstrucciones]  = useState(() => {
    const init = {}
    fases.forEach(f => { init[f.id] = '' })
    return init
  })

  const INP = {
    width: '100%', background: '#f5f5f7', border: 'none', borderRadius: 10,
    padding: '9px 12px', fontSize: 13, color: '#1d1d1f',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    resize: 'none',
  }

  return createPortal(
    <>
      {/* Backdrop — hermano del panel, no padre */}
      <div
        onClick={generando ? undefined : onCerrar}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.24)',
          backdropFilter: 'blur(2px)',
          zIndex: 8999,
          cursor: generando ? 'default' : 'pointer',
        }}
      />

      {/* Panel — position:fixed independiente, zIndex mayor al backdrop */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420,
        background: '#fff',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.14)',
        display: 'flex', flexDirection: 'column',
        zIndex: 9000,
      }}>
        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '0.5px solid #ebebeb', flexShrink: 0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744' }}>Vista previa del PDF</div>
              <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 3 }}>Completa los datos antes de generar</div>
            </div>
            <button onClick={onCerrar} disabled={generando}
              style={{ background:'#f5f5f7', border:'none', borderRadius:9, cursor: generando ? 'not-allowed' : 'pointer', color:'#636366', padding:'7px 9px', display:'flex', opacity: generando ? 0.4 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

          {/* Estructura del PDF */}
          <div style={{ background: '#f5f5f7', borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.05em', marginBottom: 10 }}>ESTRUCTURA DEL DOCUMENTO</div>
            <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 7 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#1a2744', color: '#fff', fontSize: 10, fontWeight: 700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>1</div>
              <span style={{ fontSize: 12, color: '#1d1d1f', fontWeight: 500 }}>Portada general · mapa completo · dotacion</span>
            </div>
            {fases.map((fase, i) => (
              <div key={fase.id} style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: i < fases.length - 1 ? 7 : 0 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: fase.color, color: '#fff', fontSize: 10, fontWeight: 700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>{i + 2}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, color: '#1d1d1f', fontWeight: 500 }}>{fase.nombre}</span>
                  <span style={{ fontSize: 11, color: '#aeaeb2', marginLeft: 6 }}>
                    {(fase.elementos || []).length} elemento{(fase.elementos || []).length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Objetivo general */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.05em', marginBottom: 7 }}>OBJETIVO DEL OPERATIVO</div>
            <textarea
              value={objetivo}
              onChange={e => setObjetivo(e.target.value)}
              placeholder="Describe el objetivo general del operativo... (opcional)"
              rows={4}
              style={INP}
            />
          </div>

          {/* Instrucciones por fase */}
          {fases.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.05em', marginBottom: 12 }}>INSTRUCCIONES POR FASE</div>
              {fases.map(fase => (
                <div key={fase.id} style={{ marginBottom: 14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 7, marginBottom: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: fase.color, flexShrink: 0 }}/>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1a2744' }}>{fase.nombre}</span>
                    {(fmtHora(fase.horario_desde) || fmtHora(fase.horario_hasta)) && (
                      <span style={{ fontSize: 11, color: '#aeaeb2' }}>
                        {[fmtHora(fase.horario_desde), fmtHora(fase.horario_hasta)].filter(Boolean).join(' – ')}hs
                      </span>
                    )}
                  </div>
                  <textarea
                    value={instrucciones[fase.id] || ''}
                    onChange={e => setInstrucciones(prev => ({ ...prev, [fase.id]: e.target.value }))}
                    placeholder={`Instrucciones generales para ${fase.nombre}... (opcional)`}
                    rows={3}
                    style={INP}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón generar */}
        <div style={{ padding: '16px 22px', borderTop: '0.5px solid #ebebeb', flexShrink: 0 }}>
          <button
            onClick={() => onGenerar({ objetivo, instrucciones })}
            disabled={generando}
            style={{
              width: '100%', padding: '13px', borderRadius: 13, border: 'none',
              background: generando ? '#e5e5ea' : '#1a2744',
              color: generando ? '#8e8e93' : '#fff',
              fontSize: 14, fontWeight: 700, cursor: generando ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s',
            }}>
            {generando ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round"/>
                </svg>
                Generando PDF...
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Generar PDF
              </>
            )}
          </button>
          <div style={{ fontSize: 11, color: '#aeaeb2', textAlign: 'center', marginTop: 9 }}>
            {1 + fases.length} pagina{1 + fases.length !== 1 ? 's' : ''} · Formato A4
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </>,
    document.body
  )
}
