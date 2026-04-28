import { useState, useRef, useEffect } from 'react'
import api from '../../lib/api'

const C = { navy: '#1a2744', accent: '#f5c800', border: '#e0e4ed', bg: '#f8f9fc' }

function formatPesos(n) {
  if (!n && n !== 0) return '$0'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

function filaVacia() {
  return { id: Date.now() + Math.random(), dia: '', cobertura: '', horario: '', personal: '', modulos: '' }
}

const IcoPlus = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IcoX = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

// ── Input helper ──────────────────────────────────────────────
function Campo({ label, children, required, error }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#c0392b' }}> *</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 11, color: '#c0392b', marginTop: 3 }}>{error}</div>}
    </div>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', borderRadius: 8,
  border: `1.5px solid ${C.border}`,
  fontSize: 13, color: C.navy, background: '#fff',
  outline: 'none', transition: 'border-color 0.15s',
}

// ── Modal ─────────────────────────────────────────────────────
// presupuesto → si viene, modo edición (PUT); si no, modo creación (POST)
export default function ModalNuevoPresupuesto({ onClose, onCreado, onCreadoYPDF, presupuesto }) {
  const esEdicion = !!presupuesto

  const [beneficiario, setBeneficiario] = useState(presupuesto?.beneficiario ?? '')
  const [evento, setEvento] = useState(presupuesto?.evento ?? '')
  const [valorModulo, setValorModulo] = useState(presupuesto?.valor_modulo ?? 71249.25)
  const [validezDias, setValidezDias] = useState(presupuesto?.validez_dias ?? 3)
  const [observaciones, setObservaciones] = useState(presupuesto?.observaciones ?? '')
  const [items, setItems] = useState(
    presupuesto?.items?.length
      ? presupuesto.items.map(it => ({ ...it, id: Date.now() + Math.random() }))
      : [filaVacia()]
  )
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const overlayRef = useRef()

  // Cerrar con ESC
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  // ── Items ─────────────────────────────────────────────────
  function actualizarItem(id, campo, valor) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [campo]: valor } : it))
  }
  function agregarFila() {
    setItems(prev => [...prev, filaVacia()])
  }
  function eliminarFila(id) {
    setItems(prev => prev.filter(it => it.id !== id))
  }

  // ── Cálculos ──────────────────────────────────────────────
  const totalAPagar = items.reduce((acc, it) => {
    const tm = (Number(it.personal) || 0) * (Number(it.modulos) || 0)
    return acc + tm * (Number(valorModulo) || 0)
  }, 0)

  // ── Validación ────────────────────────────────────────────
  function validar() {
    const e = {}
    if (!beneficiario.trim()) e.beneficiario = 'Requerido'
    if (!evento.trim())       e.evento = 'Requerido'
    if (!valorModulo || valorModulo <= 0) e.valorModulo = 'Debe ser mayor a 0'
    const itemsValidos = items.filter(it => it.cobertura.trim() && it.personal && it.modulos)
    if (itemsValidos.length === 0) e.items = 'Agregá al menos un ítem completo'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  // ── Guardar ───────────────────────────────────────────────
  async function guardar(abrirPDF = false) {
    if (!validar()) return
    setGuardando(true)
    try {
      const payload = {
        beneficiario: beneficiario.trim(),
        evento: evento.trim(),
        valor_modulo: Number(valorModulo),
        validez_dias: Number(validezDias),
        observaciones: observaciones.trim() || null,
        items: items
          .filter(it => it.cobertura.trim())
          .map(({ id, ...rest }) => ({
            dia: rest.dia,
            cobertura: rest.cobertura.trim(),
            horario: rest.horario.trim(),
            personal: Number(rest.personal) || 0,
            modulos: Number(rest.modulos) || 0,
          })),
        // Al modificar un presupuesto enviado vuelve a borrador para re-enviar
        ...(esEdicion ? { estado: 'borrador' } : {}),
      }

      const resultado = esEdicion
        ? await api.put(`/api/presupuestos/${presupuesto.id}`, payload)
        : await api.post('/api/presupuestos', payload)

      if (abrirPDF) onCreadoYPDF(resultado)
      else onCreado(resultado)
    } catch (e) {
      alert('Error al guardar: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,18,40,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 18,
        width: '100%', maxWidth: 860,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 28px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.navy }}>
              {esEdicion ? `Modificar ${presupuesto.numero}` : 'Nuevo presupuesto'}
            </div>
            <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>
              {esEdicion
                ? 'Los cambios vuelven el presupuesto a borrador para re-enviarlo'
                : 'Servicio Adicional de Tránsito — DGCAT'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', padding: 6, borderRadius: 8, display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = C.navy}
            onMouseLeave={e => e.currentTarget.style.color = '#aeaeb2'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Cuerpo */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>

          {/* Sección 1: Datos del servicio */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
              Datos del servicio
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Campo label="Beneficiario" required error={errores.beneficiario}>
                <input
                  value={beneficiario}
                  onChange={e => { setBeneficiario(e.target.value); setErrores(p => ({ ...p, beneficiario: null })) }}
                  placeholder="Ej: GCBA, Ministerio de Transporte..."
                  style={{ ...inputStyle, borderColor: errores.beneficiario ? '#c0392b' : C.border }}
                  onFocus={e => e.target.style.borderColor = C.navy}
                  onBlur={e => e.target.style.borderColor = errores.beneficiario ? '#c0392b' : C.border}
                />
              </Campo>
              <Campo label="Evento / Descripción" required error={errores.evento}>
                <input
                  value={evento}
                  onChange={e => { setEvento(e.target.value); setErrores(p => ({ ...p, evento: null })) }}
                  placeholder="Ej: Colapinto en Palermo"
                  style={{ ...inputStyle, borderColor: errores.evento ? '#c0392b' : C.border }}
                  onFocus={e => e.target.style.borderColor = C.navy}
                  onBlur={e => e.target.style.borderColor = errores.evento ? '#c0392b' : C.border}
                />
              </Campo>
            </div>
          </div>

          {/* Sección 2: Configuración económica */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
              Configuración económica
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Campo label="Valor módulo (UF) $" required error={errores.valorModulo}>
                <input
                  type="number"
                  value={valorModulo}
                  onChange={e => { setValorModulo(e.target.value); setErrores(p => ({ ...p, valorModulo: null })) }}
                  placeholder="71249.25"
                  step="0.01"
                  style={{ ...inputStyle, borderColor: errores.valorModulo ? '#c0392b' : C.border }}
                  onFocus={e => e.target.style.borderColor = C.navy}
                  onBlur={e => e.target.style.borderColor = errores.valorModulo ? '#c0392b' : C.border}
                />
              </Campo>
              <Campo label="Validez (días)">
                <input
                  type="number"
                  value={validezDias}
                  onChange={e => setValidezDias(e.target.value)}
                  min={1}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = C.navy}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </Campo>
            </div>
          </div>

          {/* Sección 3: Ítems */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Ítems de cobertura
              </div>
              {errores.items && <div style={{ fontSize: 11, color: '#c0392b' }}>{errores.items}</div>}
            </div>

            {/* Tabla de ítems */}
            <div style={{ background: C.bg, borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${C.border}` }}>
              {/* Cabecera */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr 100px 80px 80px 90px 110px 36px',
                gap: 0,
                background: C.navy, padding: '8px 12px',
              }}>
                {['Día', 'Cobertura', 'Horario', 'Personal', 'Módulos', 'Tot. Mód.', 'Total', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0 4px' }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Filas */}
              {items.map((it, idx) => {
                const tm = (Number(it.personal) || 0) * (Number(it.modulos) || 0)
                const total = tm * (Number(valorModulo) || 0)
                return (
                  <div
                    key={it.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr 100px 80px 80px 90px 110px 36px',
                      gap: 0,
                      padding: '6px 12px',
                      background: idx % 2 === 0 ? '#fff' : C.bg,
                      borderBottom: `1px solid ${C.border}`,
                      alignItems: 'center',
                    }}
                  >
                    {/* Día */}
                    <div style={{ padding: '0 4px' }}>
                      <input
                        type="date"
                        value={it.dia}
                        onChange={e => actualizarItem(it.id, 'dia', e.target.value)}
                        style={{ ...inputStyle, padding: '6px 8px', fontSize: 11 }}
                        onFocus={e => e.target.style.borderColor = C.navy}
                        onBlur={e => e.target.style.borderColor = C.border}
                      />
                    </div>
                    {/* Cobertura */}
                    <div style={{ padding: '0 4px' }}>
                      <input
                        value={it.cobertura}
                        onChange={e => actualizarItem(it.id, 'cobertura', e.target.value)}
                        placeholder="Descripción de la tarea..."
                        style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                        onFocus={e => e.target.style.borderColor = C.navy}
                        onBlur={e => e.target.style.borderColor = C.border}
                      />
                    </div>
                    {/* Horario */}
                    <div style={{ padding: '0 4px' }}>
                      <input
                        value={it.horario}
                        onChange={e => actualizarItem(it.id, 'horario', e.target.value)}
                        placeholder="Ej: 16 A 00HS"
                        style={{ ...inputStyle, padding: '6px 8px', fontSize: 11 }}
                        onFocus={e => e.target.style.borderColor = C.navy}
                        onBlur={e => e.target.style.borderColor = C.border}
                      />
                    </div>
                    {/* Personal */}
                    <div style={{ padding: '0 4px' }}>
                      <input
                        type="number"
                        value={it.personal}
                        onChange={e => actualizarItem(it.id, 'personal', e.target.value)}
                        placeholder="0"
                        min={0}
                        style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, textAlign: 'center' }}
                        onFocus={e => e.target.style.borderColor = C.navy}
                        onBlur={e => e.target.style.borderColor = C.border}
                      />
                    </div>
                    {/* Módulos */}
                    <div style={{ padding: '0 4px' }}>
                      <input
                        type="number"
                        value={it.modulos}
                        onChange={e => actualizarItem(it.id, 'modulos', e.target.value)}
                        placeholder="0"
                        min={0}
                        style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, textAlign: 'center' }}
                        onFocus={e => e.target.style.borderColor = C.navy}
                        onBlur={e => e.target.style.borderColor = C.border}
                      />
                    </div>
                    {/* Total módulos (calculado) */}
                    <div style={{ padding: '0 4px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: C.navy }}>
                      {tm || 0}
                    </div>
                    {/* Total $ (calculado) */}
                    <div style={{ padding: '0 4px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: total > 0 ? C.navy : '#aeaeb2' }}>
                      {total > 0 ? formatPesos(total) : '—'}
                    </div>
                    {/* Eliminar */}
                    <div style={{ padding: '0 4px', display: 'flex', justifyContent: 'center' }}>
                      {items.length > 1 && (
                        <button
                          onClick={() => eliminarFila(it.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#aeaeb2', padding: 4, borderRadius: 6, display: 'flex',
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#c0392b'}
                          onMouseLeave={e => e.currentTarget.style.color = '#aeaeb2'}
                        >
                          {IcoX}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Agregar fila */}
              <div style={{ padding: '8px 16px', background: C.bg }}>
                <button
                  onClick={agregarFila}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: `1.5px dashed ${C.border}`,
                    borderRadius: 8, padding: '6px 14px',
                    color: '#8e8e93', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.12s',
                    width: '100%', justifyContent: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.color = C.navy }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = '#8e8e93' }}
                >
                  {IcoPlus} Agregar día / turno
                </button>
              </div>
            </div>
          </div>

          {/* Total a pagar */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16,
            padding: '14px 18px', background: C.navy, borderRadius: 12, marginBottom: 20,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>TOTAL A PAGAR</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: C.accent, letterSpacing: '-0.5px' }}>
              {formatPesos(totalAPagar)}
            </span>
          </div>

          {/* Observaciones */}
          <Campo label="Observaciones (opcional)">
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Cláusulas adicionales, aclaraciones..."
              style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
              onFocus={e => e.target.style.borderColor = C.navy}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </Campo>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px', borderTop: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          flexShrink: 0, background: '#fafafa', borderRadius: '0 0 18px 18px',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 10,
              border: `1.5px solid ${C.border}`, background: '#fff',
              color: '#636366', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => guardar(false)}
            disabled={guardando}
            style={{
              padding: '10px 20px', borderRadius: 10,
              border: `1.5px solid ${C.navy}`, background: '#fff',
              color: C.navy, fontSize: 13, fontWeight: 700,
              cursor: guardando ? 'not-allowed' : 'pointer',
              opacity: guardando ? 0.6 : 1,
            }}
          >
            {esEdicion ? 'Guardar cambios' : 'Guardar borrador'}
          </button>
          <button
            onClick={() => guardar(true)}
            disabled={guardando}
            style={{
              padding: '10px 22px', borderRadius: 10,
              border: 'none', background: C.navy,
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: guardando ? 'not-allowed' : 'pointer',
              opacity: guardando ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            {guardando ? 'Guardando...' : esEdicion ? 'Guardar y ver PDF' : 'Guardar y ver PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
