import { useState, useEffect } from 'react'
import api from '../../lib/api'

const OPCIONES_SELECT = {
  reset_periodo:    ['mensual', 'bimestral', 'trimestral'],
  scoring_formula:  ['esperados_menos_acumulados'],
}

const LABELS = {
  reset_periodo:               'Período de reseteo de módulos',
  penalizacion_ausencia_meses: 'Duración penalización por ausencia (meses)',
  penalizacion_ausencia_puntos:'Puntos por ausencia injustificada',
  penalizacion_sancion_puntos: 'Puntos por sanción disciplinaria',
  modulo_duracion_horas:       'Duración de un módulo (horas)',
  scoring_formula:             'Fórmula de prioridad',
}

export default function SAConfigScoring() {
  const [config,   setConfig]   = useState([])
  const [editado,  setEditado]  = useState({})
  const [loading,  setLoading]  = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error,    setError]    = useState(null)
  const [ok,       setOk]       = useState(false)

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
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a2744' }}>Configuración del scoring</h2>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#8e8e93' }}>
          Parámetros que determinan cómo se calcula la prioridad y las penalizaciones de los agentes.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {config.map(c => (
          <div key={c.clave} style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #dde2ec',
            padding: '16px 20px',
          }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1a2744', marginBottom: 4 }}>
              {LABELS[c.clave] ?? c.clave}
            </label>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#8e8e93' }}>{c.descripcion}</p>

            {c.tipo === 'number' ? (
              <input
                type="number"
                min={0}
                value={editado[c.clave] ?? ''}
                onChange={e => handleChange(c.clave, e.target.value)}
                style={{
                  width: 100, padding: '8px 12px', borderRadius: 8,
                  border: '1.5px solid #dde2ec', fontSize: 14,
                  color: '#1a2744', outline: 'none',
                }}
              />
            ) : (
              <select
                value={editado[c.clave] ?? ''}
                onChange={e => handleChange(c.clave, e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: 8,
                  border: '1.5px solid #dde2ec', fontSize: 14,
                  color: '#1a2744', background: '#fff', outline: 'none',
                  minWidth: 200,
                }}
              >
                {(OPCIONES_SELECT[c.clave] ?? [c.valor]).map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
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
          }}
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>

        {ok    && <span style={{ fontSize: 13, color: '#0f6e56', fontWeight: 500 }}>Cambios guardados</span>}
        {error && <span style={{ fontSize: 13, color: '#e24b4a' }}>{error}</span>}
      </div>
    </div>
  )
}
