import { useParams, useNavigate } from 'react-router-dom'
import ServiciosAdicionales from '../components/ServiciosAdicionales/ServiciosAdicionales'

export default function ServiciosAdicionalesPage() {
  const { id }   = useParams()
  const navigate = useNavigate()

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ServiciosAdicionales
        servicioId={id}
        onVolver={() => navigate('/')}
      />
    </div>
  )
}
