import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import AppShell from '../AppShell'
import SALista from './SALista'
import SADetalle from './SADetalle'
import SASanciones from './SASanciones'
import SAConfigScoring from './SAConfigScoring'
import SANomina from './SANomina'
import { useAuth } from '../../context/AuthContext'

const ROLES_CONFIG = ['admin', 'gerencia', 'director']

const ESTADO_LABELS = {
  pendiente:   { label: 'Pendiente',    color: '#c47f00', bg: '#fff8e6', text: '#7a4f00' },
  en_gestion:  { label: 'En gestión',   color: '#185fa5', bg: '#e8f0fe', text: '#185fa5' },
  convocado:   { label: 'Convocado',    color: '#0f6e56', bg: '#e8faf2', text: '#0f6e56' },
  en_curso:    { label: 'En curso',     color: '#6f42c1', bg: '#f0ebff', text: '#4a1a9e' },
  cerrado:     { label: 'Cerrado',      color: '#aeaeb2', bg: '#f5f5f7', text: '#636366' },
}

export { ESTADO_LABELS }

export default function ServiciosAdicionales({ servicioId, onVolver }) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [servicioSeleccionado, setServicioSeleccionado] = useState(servicioId || null)
  const [seccion, setSeccion] = useState('servicios') // 'servicios' | 'sanciones' | 'configuracion'
  const puedeConfigurar = ROLES_CONFIG.includes(profile?.role)

  useEffect(() => {
    if (servicioId) setServicioSeleccionado(servicioId)
  }, [servicioId])

  // Si hay detalle abierto, mostrarlo
  if (servicioSeleccionado) {
    return (
      <SADetalle
        servicioId={servicioSeleccionado}
        onVolver={() => {
          setServicioSeleccionado(null)
          navigate('/servicios-adicionales')
        }}
      />
    )
  }

  return (
    <AppShell titulo="Servicios adicionales">
      {/* Tabs de sección */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e0e4ed', padding: '0 40px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { key: 'servicios',     label: 'Servicios' },
            { key: 'nomina',        label: 'Nómina' },
            { key: 'sanciones',     label: 'Sanciones' },
            ...(puedeConfigurar ? [{ key: 'configuracion', label: 'Configuración' }] : []),
          ].map(t => (
            <button key={t.key} onClick={() => setSeccion(t.key)}
              style={{
                padding: '12px 20px', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: seccion === t.key ? 700 : 400,
                background: 'transparent',
                color: seccion === t.key ? '#1a2744' : '#8e8e93',
                borderBottom: seccion === t.key ? '2px solid #1a2744' : '2px solid transparent',
                marginBottom: -1,
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {seccion === 'servicios' && (
          <SALista
            onSeleccionar={(id) => {
              setServicioSeleccionado(id)
              navigate(`/servicios-adicionales/${id}`)
            }}
            onVolver={onVolver}
            sinHeader
          />
        )}
        {seccion === 'nomina'        && <SANomina />}
        {seccion === 'sanciones'     && <SASanciones />}
        {seccion === 'configuracion' && <SAConfigScoring />}
      </div>
    </AppShell>
  )
}
