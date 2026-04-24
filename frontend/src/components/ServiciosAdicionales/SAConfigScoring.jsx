import { useState, useEffect } from 'react'
import api from '../../lib/api'

const OPCIONES_SELECT = {
  reset_periodo:   ['mensual', 'bimestral', 'trimestral'],
  scoring_formula: ['esperados_menos_acumulados'],
}

const LABELS = {
  peso_modulo:                 'Peso de cada módulo (puntos)',
  reset_periodo:               'Período de reseteo de módulos',
  penalizacion_ausencia_meses: 'Duración penalización por ausencia (meses)',
  penalizacion_ausencia_puntos:'Puntos por ausencia injustificada',
  penalizacion_sancion_puntos: 'Puntos por sanción disciplinaria',
  modulo_duracion_horas:       'Duración de un módulo (horas)',
  scoring_formula:             'Fórmula de prioridad',
  max_modulos_dia:             'Máximo de módulos por día',
}

// Claves que forman parte del scoring (para el panel explicativo)
const CLAVES_SCORING = ['peso_modulo', 'penalizacion_ausencia_puntos']

function PanelFormula({ editado }) {
  const pesoModulo  = parseInt(editado['peso_modulo'] || 100)
  const ptsAusencia = parseInt(editado['penalizacion_ausencia_puntos'] || 25)
  const breakeven   = pesoModulo > 0 ? (pesoModulo / ptsAusencia).toFixed(1) : '—'

  const ejemplos = [
    { label: '0 módulos, 0 ausencias', mods: 0, aus: 0 },
    { label: '0 módulos, 1 ausencia',  mods: 0, aus: 1 },
    { label: '1 módulo,  0 ausencias', mods: 1, aus: 0 },
    { label: '1 módulo,  1 ausencia',  mods: 1, aus: 1 },
    { label: '2 módulos, 0 ausencias', mods: 2, aus: 0 },
    { label: '2 módulos, 3 ausencias', mods: 2, aus: 3 },
  ]

  function score(mods, aus) { return mods * pesoModulo + aus * ptsAusencia }

  return (
    <div style={{
      background: '#f8f9fc',
      border: '0.5px solid #dde2ec',
      borderRadius: 16,
      padding: '28px 28px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
    }}>

      {/* Título */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📐</span> Fórmula de scoring
        </div>
        <div style={{ fontSize: 12, color: '#8e8e93' }}>
          Se actualiza en tiempo real mientras editás los parámetros.
        </div>
      </div>

      {/* Fórmula principal */}
      <div style={{ background: '#1a2744', borderRadius: 12, padding: '18px 20px' }}>
        <div style={{ fontSize: 11, color: '#7b8db0', fontWeight: 600, marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Score del agente
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 15, color: '#fff', lineHeight: 1.7 }}>
          Score = (módulos × <span style={{ color: '#7dd3b0', fontWeight: 700 }}>{pesoModulo}</span>)
          {'  '}+{'  '}
          Σ penalizaciones
        </div>
        <div style={{ marginTop: 12, borderTop: '0.5px solid #2e3d5c', paddingTop: 12, fontFamily: 'monospace', fontSize: 13, color: '#a0b4cc', lineHeight: 1.7 }}>
          <div>donde: 1 ausencia = <span style={{ color: '#f9a94b' }}>+{ptsAusencia} pts</span></div>
          <div style={{ marginTop: 4, color: '#7b8db0' }}>
            Prioridad = orden ascendente por Score
          </div>
          <div style={{ color: '#7b8db0' }}>
            → Score 0 = máxima prioridad (llamado primero)
          </div>
        </div>
      </div>

      {/* Equivalencias clave */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          Equivalencias
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <EquivRow
            izq={<><Pill color="#185fa5">1 módulo</Pill> trabajado</>}
            val={`${pesoModulo} pts`}
            color="#185fa5"
          />
          <EquivRow
            izq={<><Pill color="#e67e22">1 ausencia</Pill> injustificada</>}
            val={`+${ptsAusencia} pts`}
            color="#e67e22"
          />
          <EquivRow
            izq={<span style={{ color: '#636366' }}>Breakeven: <strong>{breakeven} ausencias</strong></span>}
            val="= 1 módulo"
            color="#636366"
            note
          />
        </div>
      </div>

      {/* Tabla de ejemplos */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          Ejemplos con config actual
        </div>
        <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #e0e4ed', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '8px 14px', background: '#f0f2f7', borderBottom: '0.5px solid #e0e4ed' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Situación</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', minWidth: 60 }}>Score</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', minWidth: 70 }}>Prioridad</span>
          </div>
          {[...ejemplos]
            .map(e => ({ ...e, s: score(e.mods, e.aus) }))
            .sort((a, b) => a.s - b.s)
            .map((e, i, arr) => {
              const maxScore  = Math.max(...arr.map(x => x.s)) || 1
              const pct       = Math.round((e.s / maxScore) * 100)
              const prioColor = i === 0 ? '#0f6e56' : i === arr.length - 1 ? '#c0392b' : '#636366'
              return (
                <div key={e.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '9px 14px', borderBottom: i < arr.length - 1 ? '0.5px solid #f5f5f7' : 'none', alignItems: 'center', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#1d1d1f', marginBottom: 3 }}>{e.label}</div>
                    <div style={{ height: 4, borderRadius: 2, background: '#e8ecf4', width: '100%' }}>
                      <div style={{ height: 4, borderRadius: 2, background: prioColor, width: `${pct}%`, minWidth: e.s > 0 ? 4 : 0, transition: 'width 0.3s' }}/>
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', textAlign: 'right', minWidth: 60, fontFamily: 'monospace' }}>
                    {e.s}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: prioColor, textAlign: 'right', minWidth: 70 }}>
                    {i === 0 ? '↑ 1° lugar' : i === arr.length - 1 ? '↓ último' : `${i + 1}°`}
                  </span>
                </div>
              )
            })}
        </div>
      </div>

      {/* Sanciones — nota separada */}
      <div style={{ background: '#feecec', border: '0.5px solid #f5c6c6', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>🚫</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#c0392b', marginBottom: 3 }}>Sanciones disciplinarias</div>
          <div style={{ fontSize: 12, color: '#7a2e2e', lineHeight: 1.5 }}>
            Las sanciones <strong>no afectan el score</strong>. Un agente sancionado queda bloqueado
            completamente — no puede ser convocado hasta que se levante la sanción,
            independientemente de su puntaje.
          </div>
        </div>
      </div>

    </div>
  )
}

function EquivRow({ izq, val, color, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: 8, border: '0.5px solid #e8ecf4' }}>
      <span style={{ fontSize: 12, color: '#1d1d1f' }}>{izq}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'monospace' }}>{val}</span>
    </div>
  )
}

function Pill({ children, color }) {
  const map = {
    '#185fa5': { bg: '#e8f0fe', text: '#185fa5' },
    '#e67e22': { bg: '#fff3e0', text: '#c0620a' },
  }
  const s = map[color] || { bg: '#f0f0f5', text: '#636366' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: s.bg, color: s.text, marginRight: 4 }}>
      {children}
    </span>
  )
}

export default function SAConfigScoring() {
  const [config,    setConfig]    = useState([])
  const [editado,   setEditado]   = useState({})
  const [loading,   setLoading]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState(null)
  const [ok,        setOk]        = useState(false)

  useEffect(() => {
    api.get('/api/servicios-adicionales/config')
      .then(data => {
        setConfig(data)
        const inicial = {}
        data.forEach(c => { inicial[c.clave] = c.valor })
        setEditado(inicial)
      })
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(clave, valor) {
    setEditado(prev => ({ ...prev, [clave]: valor }))
    setOk(false)
  }

  async function handleGuardar() {
    setGuardando(true)
    setError(null)
    setOk(false)
    try {
      const cambios = Object.entries(editado).map(([clave, valor]) => ({ clave, valor }))
      await api.put('/api/servicios-adicionales/config', cambios)
      setConfig(prev => prev.map(c => ({ ...c, valor: editado[c.clave] ?? c.valor })))
      setOk(true)
    } catch {
      setError('No se pudieron guardar los cambios.')
    } finally {
      setGuardando(false)
    }
  }

  const haycambios = config.some(c => editado[c.clave] !== c.valor)

  if (loading) return <div style={{ padding: 40, color: '#8e8e93', fontSize: 14 }}>Cargando configuración...</div>

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a2744' }}>Configuración del scoring</h2>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#8e8e93' }}>
          Parámetros que determinan cómo se calcula la prioridad de asignación de los agentes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>

        {/* Columna izquierda: campos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {config.map(c => (
            <div key={c.clave} style={{
              background: '#fff',
              borderRadius: 12,
              border: `0.5px solid ${CLAVES_SCORING.includes(c.clave) ? '#c5d5f0' : '#dde2ec'}`,
              padding: '14px 18px',
              boxShadow: CLAVES_SCORING.includes(c.clave) ? '0 0 0 3px rgba(24,95,165,0.06)' : 'none',
            }}>
              {CLAVES_SCORING.includes(c.clave) && (
                <div style={{ fontSize: 10, fontWeight: 700, color: '#185fa5', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Afecta la fórmula →
                </div>
              )}
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1a2744', marginBottom: 3 }}>
                {LABELS[c.clave] ?? c.clave}
              </label>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#8e8e93', lineHeight: 1.4 }}>{c.descripcion}</p>

              {c.tipo === 'number' ? (
                <input
                  type="number" min={0}
                  value={editado[c.clave] ?? ''}
                  onChange={e => handleChange(c.clave, e.target.value)}
                  style={{ width: 100, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #dde2ec', fontSize: 14, color: '#1a2744', outline: 'none' }}
                />
              ) : (
                <select
                  value={editado[c.clave] ?? ''}
                  onChange={e => handleChange(c.clave, e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #dde2ec', fontSize: 14, color: '#1a2744', background: '#fff', outline: 'none', minWidth: 200 }}>
                  {(OPCIONES_SELECT[c.clave] ?? [c.valor]).map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              )}
            </div>
          ))}

          {/* Botón guardar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button
              onClick={handleGuardar}
              disabled={!haycambios || guardando}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: haycambios ? '#1a2744' : '#dde2ec',
                color: haycambios ? '#fff' : '#8e8e93',
                fontSize: 14, fontWeight: 600,
                cursor: haycambios ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}>
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
            {ok    && <span style={{ fontSize: 13, color: '#0f6e56', fontWeight: 500 }}>✓ Cambios guardados</span>}
            {error && <span style={{ fontSize: 13, color: '#e24b4a' }}>{error}</span>}
          </div>
        </div>

        {/* Columna derecha: panel explicativo */}
        <PanelFormula editado={editado} />

      </div>
    </div>
  )
}
