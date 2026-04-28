import { useRef } from 'react'
import logoCat    from '../../assets/logo-cat.png'
import logoBACiud from '../../assets/logo-ba-ciudad.svg'

// ── Helpers ───────────────────────────────────────────────────
function pesos(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n || 0)
}
function fc(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${parseInt(d)}-${parseInt(m)}-${y}`
}
function formatearFechas(items) {
  const dias = [...new Set((items || []).map(i => i.dia).filter(Boolean))].sort()
  if (!dias.length) return '—'
  return dias.map(fc).join(' — ')
}
function hoy() {
  return new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const NAVY = '#1a2744'
const YEL  = '#f5c800'
const F    = 'Arial, Helvetica, sans-serif'

// ── Documento React (preview en pantalla) ─────────────────────
function DocPresupuesto({ p, catSrc, baSrc }) {
  const vm    = Number(p.valor_modulo) || 0
  const items = p.items || []
  const total = items.reduce((acc, it) =>
    acc + (Number(it.personal) || 0) * (Number(it.modulos) || 0) * vm, 0)
  const fechas = formatearFechas(items)

  const th = (align = 'center', w) => ({
    background: NAVY, color: '#fff',
    padding: '9px 10px', fontSize: 9.5, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.07em',
    border: '1px solid #0d1e3a', fontFamily: F,
    textAlign: align, ...(w ? { width: w } : {}),
  })
  const td = (align = 'center', extra = {}) => ({
    padding: '8px 10px', fontSize: 11,
    border: '1px solid #dde3ee', textAlign: align,
    verticalAlign: 'middle', fontFamily: F, color: NAVY, ...extra,
  })

  return (
    <div style={{ background: '#fff', fontFamily: F, maxWidth: 800, margin: '0 auto' }}>

      {/* Franja amarilla (identidad CAT) */}
      <div style={{ height: 5, background: YEL }} />

      {/* ── HEADER ── */}
      <div style={{ background: NAVY, padding: '20px 32px 22px' }}>

        {/* Fila superior: logos + número */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 18,
        }}>
          {/* Logos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {catSrc && (
              <img src={catSrc} alt="CAT"
                style={{ height: 44, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            )}
            {baSrc && (
              <img src={baSrc} alt="Buenos Aires Ciudad"
                style={{ height: 28, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
            )}
          </div>

          {/* Número — discreto, sin recuadro */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 3, fontFamily: F }}>
              N.° de presupuesto
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.5px', fontFamily: F }}>
              {p.numero}
            </div>
          </div>
        </div>

        {/* Separador */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', marginBottom: 14 }} />

        {/* Texto institucional */}
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 4, fontFamily: F }}>
            Gobierno de la Ciudad Autónoma de Buenos Aires
          </div>
          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.65)', marginBottom: 10, fontFamily: F }}>
            Dirección General Cuerpo de Agentes de Tránsito
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: F }}>
            Presupuesto de Servicio Adicional
          </div>
        </div>
      </div>

      {/* Acento amarillo bajo el header */}
      <div style={{ height: 3, background: YEL, opacity: 0.7 }} />

      {/* ── CUERPO ── */}
      <div style={{ padding: '22px 32px 28px' }}>

        {/* Info block */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '10px 40px',
          padding: '14px 18px 14px 20px',
          marginBottom: 22,
          borderBottom: '1px solid #e8ecf4',
        }}>
          {[
            { label: 'Beneficiario',         value: p.beneficiario },
            { label: 'Fecha del servicio',   value: fechas },
            { label: 'Evento / Descripción', value: p.evento },
            { label: 'Fecha de emisión',     value: hoy() },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: '#aaa', letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 3, fontFamily: F }}>{label}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: NAVY, fontFamily: F }}>{value || '—'}</div>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th('center', '10%')}>DÍA</th>
              <th style={th('left',   '30%')}>COBERTURA</th>
              <th style={th('center', '10%')}>HORARIO</th>
              <th style={th('center', '7%' )}>PERS.</th>
              <th style={th('center', '7%' )}>MÓD.</th>
              <th style={th('center', '9%' )}>T.MÓD.</th>
              <th style={th('right',  '13%')}>V. MÓD.</th>
              <th style={th('right',  '14%')}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => {
              const tm  = (Number(it.personal) || 0) * (Number(it.modulos) || 0)
              const tot = tm * vm
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f7f9fd' }}>
                  <td style={td('center', { fontWeight: 600, fontSize: 10.5 })}>{fc(it.dia)}</td>
                  <td style={td('left',   { fontSize: 10.5 })}>{it.cobertura}</td>
                  <td style={td('center', { fontSize: 10.5 })}>{it.horario || '—'}</td>
                  <td style={td('center', { fontWeight: 700 })}>{it.personal || 0}</td>
                  <td style={td('center', { fontWeight: 700 })}>{it.modulos || 0}</td>
                  <td style={td('center', { fontWeight: 700, fontSize: 12 })}>{tm}</td>
                  <td style={td('right',  { fontSize: 10.5 })}>{pesos(vm)}</td>
                  <td style={td('right',  { fontWeight: 700 })}>{pesos(tot)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} style={{ border: '1px solid #dde3ee' }} />
              <td style={{
                background: NAVY, color: '#fff', border: `1px solid ${NAVY}`,
                padding: '10px 12px', textAlign: 'center', fontWeight: 800,
                fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: F,
              }}>
                TOTAL A PAGAR
              </td>
              <td style={{
                background: YEL, color: NAVY, border: `1.5px solid #d4ab00`,
                padding: '10px 12px', textAlign: 'right',
                fontWeight: 900, fontSize: 15, fontFamily: F,
              }}>
                {pesos(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Cláusula */}
        <div style={{
          marginTop: 22, padding: '13px 18px',
          borderTop: '1px solid #e8ecf4',
          borderBottom: '1px solid #e8ecf4',
        }}>
          <p style={{ margin: 0, fontSize: 10, color: '#666', lineHeight: 1.65, fontStyle: 'italic', fontFamily: F }}>
            "Queda Ud. notificado que si por problemas operativos, el servicio supera el horario de
            contratación (más de media hora), implicará el pago de 1 módulo más a lo contratado por
            cada agente".– "En caso de suspensión del servicio por razones ajenas a esta organización,
            se deberá comunicar 24hs antes del inicio del mismo, caso contrario no habrá posibilidad
            de reprogramarlo."
          </p>
          {p.observaciones && (
            <p style={{ margin: '8px 0 0', fontSize: 10, color: '#555', fontFamily: F }}>{p.observaciones}</p>
          )}
          <p style={{ margin: '10px 0 0', textAlign: 'center', fontWeight: 800, fontSize: 10.5, color: '#b00', letterSpacing: '0.03em', fontFamily: F }}>
            EL PRESUPUESTO TIENE VALIDEZ HASTA LOS {p.validez_dias || 3} DÍAS POSTERIORES DE HABERLO SOLICITADO
          </p>
        </div>

        {/* Pie */}
        <div style={{
          marginTop: 22, display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 8, color: '#ccc', fontFamily: F }}>
            Generado el {hoy()} · CAT Plataforma
          </div>
          <div style={{ fontSize: 8, color: '#ccc', textAlign: 'right', fontFamily: F }}>
            Validez: {p.validez_dias || 3} días corridos
          </div>
        </div>
      </div>

      {/* Franja cierre */}
      <div style={{ height: 4, background: NAVY }} />
    </div>
  )
}

// ── HTML para la ventana de impresión ─────────────────────────
function buildPrintHTML(p, catSrc, baSrc) {
  const vm    = Number(p.valor_modulo) || 0
  const items = p.items || []
  const total = items.reduce((acc, it) =>
    acc + (Number(it.personal) || 0) * (Number(it.modulos) || 0) * vm, 0)
  const fechas = formatearFechas(items)
  const fecha  = hoy()

  const rows = items.map((it, i) => {
    const tm  = (Number(it.personal) || 0) * (Number(it.modulos) || 0)
    const tot = tm * vm
    return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f7f9fd'}">
      <td class="td tc f6 s10">${fc(it.dia)}</td>
      <td class="td tl s10">${it.cobertura || ''}</td>
      <td class="td tc s10">${it.horario || '—'}</td>
      <td class="td tc f7">${it.personal || 0}</td>
      <td class="td tc f7">${it.modulos || 0}</td>
      <td class="td tc f7 s12">${tm}</td>
      <td class="td tr s10">${pesos(vm)}</td>
      <td class="td tr f7">${pesos(tot)}</td>
    </tr>`
  }).join('')

  const obs = p.observaciones
    ? `<p style="margin:8px 0 0;font-size:10px;color:#555">${p.observaciones}</p>` : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${p.numero} — ${p.evento}</title>
<style>
  @page   { size:A4 portrait; margin:0; }
  *       { box-sizing:border-box; margin:0; padding:0; }
  body    { font-family:Arial,Helvetica,sans-serif; background:#fff; color:#1a2744;
            -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .wrap   { max-width:794px; margin:0 auto; }
  table   { width:100%; border-collapse:collapse; }
  .th     { background:#1a2744; color:#fff; padding:9px 10px; font-size:9.5px;
            font-weight:700; text-transform:uppercase; letter-spacing:0.07em;
            border:1px solid #0d1e3a; }
  .td     { padding:7px 10px; font-size:11px; border:1px solid #dde3ee;
            vertical-align:middle; color:#1a2744; }
  .tc{text-align:center} .tl{text-align:left} .tr{text-align:right}
  .f6{font-weight:600}   .f7{font-weight:700} .f9{font-weight:900}
  .s10{font-size:10.5px} .s12{font-size:12px}
  .lbl{font-size:8.5px;font-weight:700;color:#aaa;letter-spacing:0.7px;text-transform:uppercase;margin-bottom:3px}
  .val{font-size:12.5px;font-weight:700;color:#1a2744}
</style>
</head>
<body><div class="wrap">

<!-- Franja top -->
<div style="height:5px;background:#f5c800"></div>

<!-- Header -->
<div style="background:#1a2744;padding:20px 32px 22px">
  <!-- Logos + número -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
    <div style="display:flex;align-items:center;gap:20px">
      <img src="${catSrc}" alt="CAT" style="height:42px;object-fit:contain;filter:brightness(0) invert(1)" onerror="this.style.display='none'">
      <img src="${baSrc}" alt="BA Ciudad" style="height:26px;object-fit:contain;filter:brightness(0) invert(1);opacity:.85" onerror="this.style.display='none'">
    </div>
    <div style="text-align:right">
      <div style="font-size:8.5px;color:rgba(255,255,255,.4);letter-spacing:.8px;text-transform:uppercase;margin-bottom:3px">N.° de presupuesto</div>
      <div style="font-size:15px;font-weight:700;color:rgba(255,255,255,.85);letter-spacing:.5px">${p.numero}</div>
    </div>
  </div>
  <!-- Separador -->
  <div style="border-top:1px solid rgba(255,255,255,.12);margin-bottom:14px"></div>
  <!-- Texto institucional -->
  <div style="font-size:8.5px;color:rgba(255,255,255,.5);letter-spacing:.7px;text-transform:uppercase;margin-bottom:4px">
    Gobierno de la Ciudad Autónoma de Buenos Aires
  </div>
  <div style="font-size:9px;color:rgba(255,255,255,.6);margin-bottom:10px">
    Dirección General Cuerpo de Agentes de Tránsito
  </div>
  <div style="font-size:18px;font-weight:900;color:#fff;letter-spacing:1px;text-transform:uppercase">
    Presupuesto de Servicio Adicional
  </div>
</div>

<!-- Acento -->
<div style="height:3px;background:#f5c800;opacity:.7"></div>

<!-- Cuerpo -->
<div style="padding:20px 32px 26px">

  <!-- Info block -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 40px;padding:14px 18px 14px 20px;margin-bottom:20px;border-bottom:1px solid #e8ecf4">
    <div><div class="lbl">Beneficiario</div><div class="val">${p.beneficiario}</div></div>
    <div><div class="lbl">Fecha del servicio</div><div class="val">${fechas}</div></div>
    <div><div class="lbl">Evento / Descripción</div><div class="val">${p.evento}</div></div>
    <div><div class="lbl">Fecha de emisión</div><div class="val">${fecha}</div></div>
  </div>

  <!-- Tabla -->
  <table>
    <thead><tr>
      <th class="th tc" style="width:10%">DÍA</th>
      <th class="th tl" style="width:30%">COBERTURA</th>
      <th class="th tc" style="width:10%">HORARIO</th>
      <th class="th tc" style="width:7%">PERS.</th>
      <th class="th tc" style="width:7%">MÓD.</th>
      <th class="th tc" style="width:9%">T.MÓD.</th>
      <th class="th tr" style="width:13%">V.MÓD.</th>
      <th class="th tr" style="width:14%">TOTAL</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td class="td" colspan="6"></td>
      <td class="td tc" style="background:#1a2744;color:#fff;font-weight:800;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;border:1px solid #0d1e3a">TOTAL A PAGAR</td>
      <td class="td tr" style="background:#f5c800;color:#1a2744;font-weight:900;font-size:15px;border:1.5px solid #d4ab00">${pesos(total)}</td>
    </tr></tfoot>
  </table>

  <!-- Cláusula -->
  <div style="margin-top:20px;padding:13px 18px;border-top:1px solid #e8ecf4;border-bottom:1px solid #e8ecf4">
    <p style="font-size:10px;color:#666;line-height:1.65;font-style:italic">
      "Queda Ud. notificado que si por problemas operativos, el servicio supera el horario de contratación (más de media hora), implicará el pago de 1 módulo más a lo contratado por cada agente".– "En caso de suspensión del servicio por razones ajenas a esta organización, se deberá comunicar 24hs antes del inicio del mismo, caso contrario no habrá posibilidad de reprogramarlo."
    </p>
    ${obs}
    <p style="margin-top:10px;text-align:center;font-weight:800;font-size:10.5px;color:#b00;letter-spacing:.03em">
      EL PRESUPUESTO TIENE VALIDEZ HASTA LOS ${p.validez_dias || 3} DÍAS POSTERIORES DE HABERLO SOLICITADO
    </p>
  </div>

  <!-- Pie -->
  <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:8px;color:#ccc">Generado el ${fecha} · CAT Plataforma</div>
    <div style="font-size:8px;color:#ccc;text-align:right">Validez: ${p.validez_dias || 3} días corridos</div>
  </div>

</div>

<!-- Franja cierre -->
<div style="height:4px;background:#1a2744"></div>

</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ── Modal ─────────────────────────────────────────────────────
export default function PresupuestoPDF({ presupuesto, onClose }) {
  const previewRef = useRef()

  function handleImprimir() {
    const base   = window.location.origin
    const catSrc = new URL(logoCat,    base).href
    const baSrc  = new URL(logoBACiud, base).href
    const html   = buildPrintHTML(presupuesto, catSrc, baSrc)
    const win    = window.open('', '_blank', 'width=960,height=820')
    win.document.write(html)
    win.document.close()
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(8,16,36,0.75)', backdropFilter: 'blur(5px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '20px', overflow: 'auto',
      }}
    >
      {/* Toolbar */}
      <div style={{
        width: '100%', maxWidth: 840,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            {presupuesto.numero}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
            {presupuesto.evento}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleImprimir}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 22px', borderRadius: 10,
              background: YEL, border: 'none',
              color: NAVY, fontSize: 13, fontWeight: 800,
              cursor: 'pointer', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir / PDF
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1.5px solid rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Preview */}
      <div
        ref={previewRef}
        style={{ width: '100%', maxWidth: 840, overflow: 'hidden', boxShadow: '0 28px 80px rgba(0,0,0,0.5)' }}
      >
        <DocPresupuesto p={presupuesto} catSrc={logoCat} baSrc={logoBACiud} />
      </div>

      <div style={{ height: 30, flexShrink: 0 }} />
    </div>
  )
}
