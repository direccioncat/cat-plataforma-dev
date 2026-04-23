/**
 * MiEquipo.jsx
 * Organigrama interactivo del equipo por base.
 */
import { useEffect, useState } from 'react'
import { Tree, TreeNode } from 'react-organizational-chart'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import AppShell from '../components/AppShell'

const ROLE_LABEL = {
  gerencia: 'Gerencia', director: 'Director', jefe_base: 'Jefe de Base',
  jefe_cgm: 'Jefe CGM', coordinador: 'Coordinador', coordinador_cgm: 'Coordinador CGM',
  supervisor: 'Supervisor', agente: 'Agente', admin: 'Administrador', planeamiento: 'Planeamiento',
}

const ROLE_COLOR = {
  gerencia:        { bg: '#1a2744', text: '#fff' },
  director:        { bg: '#1a2744', text: '#fff' },
  jefe_base:       { bg: '#185fa5', text: '#fff' },
  jefe_cgm:        { bg: '#185fa5', text: '#fff' },
  coordinador:     { bg: '#0f6e56', text: '#fff' },
  coordinador_cgm: { bg: '#0f6e56', text: '#fff' },
  supervisor:      { bg: '#534ab7', text: '#fff' },
  agente:          { bg: '#fff',    text: '#1a2744' },
  admin:           { bg: '#636366', text: '#fff' },
  planeamiento:    { bg: '#854f0b', text: '#fff' },
}

const ESTADO_TURNO = {
  libre:       { label: 'Libre',       color: '#0f6e56', bg: '#e8faf2' },
  en_mision:   { label: 'En mision',   color: '#185fa5', bg: '#e8f0fe' },
  fuera_turno: { label: 'Fuera turno', color: '#aeaeb2', bg: '#f5f5f7' },
}

function getInitials(nombre) {
  const p = (nombre ?? '').trim().split(' ').filter(Boolean)
  return p.length >= 2 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : (p[0]?.[0] ?? '?').toUpperCase()
}

function construirArbol(miembros) {
  const porRol = {}
  for (const m of miembros) {
    if (!porRol[m.role]) porRol[m.role] = []
    porRol[m.role].push(m)
  }
  const orden = ['gerencia','director','jefe_base','jefe_cgm','planeamiento','coordinador','coordinador_cgm','supervisor','agente','admin']
  const presentes = orden.filter(r => porRol[r]?.length > 0)
  function buildLevel(idx) {
    if (idx >= presentes.length) return []
    const rol = presentes[idx]
    const hijos = buildLevel(idx + 1)
    return (porRol[rol] || []).map((p, i) => ({ ...p, hijos: i === 0 ? hijos : [] }))
  }
  return buildLevel(0)
}

function TarjetaPersona({ persona, seleccionado, onSelect, compacto = false }) {
  const colors = ROLE_COLOR[persona.role] ?? ROLE_COLOR.agente
  const estado = ESTADO_TURNO[persona.estado_turno] ?? ESTADO_TURNO.fuera_turno
  const size   = compacto ? 38 : 44

  return (
    <div onClick={() => onSelect(persona)}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 2px', minWidth: compacto ? 80 : 100, maxWidth: compacto ? 100 : 120 }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: colors.bg,
          border: seleccionado ? '3px solid #f5c800' : persona._esPropio ? '2.5px solid #4ecdc4' : `2px solid ${colors.bg === '#fff' ? '#dde2ec' : colors.bg}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: compacto ? 13 : 15, fontWeight: 800, color: colors.text,
          boxShadow: seleccionado ? '0 0 0 3px rgba(245,200,0,0.3)' : '0 2px 8px rgba(26,39,68,0.12)',
          transition: 'all 0.15s', flexShrink: 0,
        }}>
          {getInitials(persona.nombre_completo)}
        </div>

      </div>
      <div style={{ fontSize: compacto ? 10 : 11, fontWeight: 600, color: '#1a2744', textAlign: 'center', lineHeight: 1.3, maxWidth: compacto ? 90 : 110, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {persona.nombre_completo}
      </div>
      <div style={{ fontSize: compacto ? 8 : 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: colors.bg === '#fff' ? '#f0f4ff' : `${colors.bg}22`, color: colors.bg === '#fff' ? '#185fa5' : colors.bg, border: `0.5px solid ${colors.bg === '#fff' ? '#c7d2fe' : `${colors.bg}44`}`, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
        {ROLE_LABEL[persona.role] ?? persona.role}
      </div>
    </div>
  )
}

function PanelDetallePersona({ persona, onClose }) {
  if (!persona) return null
  const colors = ROLE_COLOR[persona.role] ?? ROLE_COLOR.agente
  const estado = ESTADO_TURNO[persona.estado_turno] ?? ESTADO_TURNO.fuera_turno

  return (
    <div style={{ width: 280, flexShrink: 0, background: '#fff', borderLeft: '0.5px solid #e0e4ed', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: colors.bg === '#fff' ? '#1a2744' : colors.bg, padding: '24px 20px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff' }}>
            {getInitials(persona.nombre_completo)}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', padding: '5px 8px', opacity: 0.8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>{persona.nombre_completo}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{ROLE_LABEL[persona.role] ?? persona.role}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {[
          { label: 'Legajo', val: persona.legajo ? `CAT · ${persona.legajo}` : '—' },
          { label: 'Turno',  val: persona.turno ?? '—' },
        ].map((r, i, arr) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #e8ecf4' : 'none' }}>
            <span style={{ fontSize: 13, color: '#aeaeb2', fontWeight: 500 }}>{r.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2744' }}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NodoOrg({ nodo, seleccionadoId, onSelect, profundidad = 0 }) {
  const compacto = profundidad >= 2
  const tarjeta = <TarjetaPersona persona={nodo} seleccionado={seleccionadoId === nodo.id} onSelect={onSelect} compacto={compacto}/>
  if (!nodo.hijos?.length) return <TreeNode label={tarjeta}/>
  return (
    <TreeNode label={tarjeta}>
      {nodo.hijos.map(h => <NodoOrg key={h.id} nodo={h} seleccionadoId={seleccionadoId} onSelect={onSelect} profundidad={profundidad + 1}/>)}
    </TreeNode>
  )
}



export default function MiEquipo() {
  const { profile }                     = useAuth()
  const [data, setData]                 = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)
  const [zoom, setZoom]                 = useState(1)

  useEffect(() => { if (profile) cargar() }, [profile?.id])

  async function cargar() {
    setLoading(true); setError(null)
    try { setData(await api.get('/api/profiles/equipo')) }
    catch (e) { setError('No se pudo cargar el equipo'); console.warn(e) }
    setLoading(false)
  }

  const miembros = data?.miembros ?? []
  const base     = data?.base
  const arbol    = construirArbol(miembros.map(m => ({ ...m, _esPropio: m.id === profile?.id })))

  const raizLabel = (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: '#1a2744', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(26,39,68,0.25)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5c800" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#1a2744', textAlign: 'center' }}>{base?.nombre ?? 'Base'}</div>
      <div style={{ fontSize: 10, color: '#8e8e93', textAlign: 'center' }}>{miembros.length} miembros</div>
    </div>
  )

  return (
    <AppShell titulo="Mi equipo">
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aeaeb2', fontSize: 14 }}>
          Cargando equipo...
        </div>
      ) : error ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#e24b4a' }}>{error}</div>
          <button onClick={cargar} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: '#1a2744', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Reintentar</button>
        </div>
      ) : (
        <>
          {/* Subheader */}
          <div style={{ background: '#fff', padding: '10px 32px', borderBottom: '0.5px solid #e0e4ed', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              {base && <div style={{ fontSize: 13, color: '#8e8e93' }}>{base.nombre}{base.direccion ? ` · ${base.direccion}` : ''}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eef1f6', borderRadius: 10, padding: '4px 10px' }}>
                <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#636366', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>−</button>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#636366', minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#636366', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>+</button>
                <div style={{ width: 1, height: 14, background: '#dde2ec', margin: '0 2px' }}/>
                <button onClick={() => setZoom(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', fontSize: 11, fontWeight: 600, padding: '0 2px' }}>Reset</button>
              </div>
            </div>
          </div>

          {/* Cuerpo */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px', background: '#eef1f6' }}>
              {miembros.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aeaeb2', gap: 10 }}>
                  <div style={{ fontSize: 36 }}>👥</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1a2744' }}>Sin miembros en esta base</div>
                </div>
              ) : (
                <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}>
                  <Tree lineWidth="1.5px" lineColor="#dde2ec" lineBorderRadius="8px" label={raizLabel}>
                    {arbol.map(nodo => (
                      <NodoOrg key={nodo.id} nodo={nodo} seleccionadoId={seleccionado?.id} onSelect={setSeleccionado} profundidad={0}/>
                    ))}
                  </Tree>
                </div>
              )}
            </div>
            {seleccionado && <PanelDetallePersona persona={seleccionado} onClose={() => setSeleccionado(null)}/>}
          </div>
        </>
      )}
    </AppShell>
  )
}
