/**
 * mailer.js
 * Servicio de envío de email — Nodemailer + Office 365 (smtp.office365.com)
 *
 * Las credenciales se leen de la tabla `sistema_config` en cada envío,
 * con fallback a variables de entorno. Esto permite rotarlas desde la UI
 * sin reiniciar el servidor.
 */
const nodemailer = require('nodemailer');
const configModel = require('../model/config');

/**
 * Construye un transporter fresco usando config de DB (con fallback a .env).
 * Se crea uno nuevo por envío para que los cambios de credenciales
 * sean inmediatos sin necesidad de reiniciar.
 */
async function buildTransporter() {
  let smtp = {};
  try {
    smtp = await configModel.getSMTP();
  } catch {
    // Si la tabla todavía no existe (primer arranque antes de migrar), usar .env
  }

  const host = smtp.smtp_host || process.env.SMTP_HOST || 'smtp.office365.com';
  const port = parseInt(smtp.smtp_port || process.env.SMTP_PORT || '587', 10);
  const user = smtp.smtp_user || process.env.SMTP_USER || '';
  const pass = smtp.smtp_pass || process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host,
    port,
    secure: false,        // STARTTLS en 587
    auth: { user, pass },
    tls: { ciphers: 'SSLv3' },
  });
}

/**
 * Envía un mail.
 * @param {Object} opts
 * @param {string}   opts.to      - destinatario
 * @param {string}   opts.subject - asunto
 * @param {string}   opts.html    - cuerpo HTML
 * @param {string}   [opts.text]  - cuerpo texto plano (fallback)
 */
async function sendMail({ to, subject, html, text }) {
  let smtp = {};
  try { smtp = await configModel.getSMTP(); } catch {}
  const from = smtp.smtp_from || process.env.SMTP_FROM || smtp.smtp_user || process.env.SMTP_USER;

  const transporter = await buildTransporter();
  const info = await transporter.sendMail({ from, to, subject, html, text });
  console.log(`[mailer] Enviado a ${to} — messageId: ${info.messageId}`);
  return info;
}

// ── Templates ─────────────────────────────────────────────────

/**
 * Template LOYS: datos para generar factura tipo C
 */
function templateLOYS({ agente, solicitud, formUrl }) {
  const fmtFecha = (f) => f ? new Date(f + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const fmtMonto = (n) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  const subject = `CAT DGCAT — Solicitud de factura: ${solicitud.concepto}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a2744,#243561);border-radius:16px 16px 0 0;padding:28px 32px 24px;">
      <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">
        Dirección General · CAT · GCBA
      </div>
      <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px;">
        Solicitud de factura
      </div>
      <div style="font-size:13px;color:rgba(255,255,255,0.6);">
        ${solicitud.concepto}
      </div>
    </div>

    <!-- Cuerpo -->
    <div style="background:#fff;padding:32px;border:1px solid #e0e4ed;border-top:none;">

      <p style="font-size:15px;color:#1d1d1f;margin:0 0 20px;">
        Hola, <strong>${agente.nombre_completo}</strong>.<br>
        Te informamos que debés remitir tu factura por los servicios prestados. A continuación encontrás los datos necesarios para emitirla en AFIP como <strong>Comprobante Tipo C</strong>.
      </p>

      <!-- Datos del receptor -->
      <div style="background:#f5f5f7;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:14px;">
          Datos del receptor (a quién facturás)
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:12px;color:#636366;padding:5px 0;width:45%;">Razón social</td>
            <td style="font-size:13px;font-weight:600;color:#1a2744;padding:5px 0;">${solicitud.razon_social_receptor}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#636366;padding:5px 0;">CUIT receptor</td>
            <td style="font-size:13px;font-weight:600;color:#1a2744;padding:5px 0;">${solicitud.cuit_receptor}</td>
          </tr>
        </table>
      </div>

      <!-- Datos de la factura -->
      <div style="background:#f5f5f7;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:14px;">
          Datos de tu factura
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:12px;color:#636366;padding:5px 0;width:45%;">Tipo de comprobante</td>
            <td style="font-size:13px;font-weight:600;color:#1a2744;padding:5px 0;">C</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#636366;padding:5px 0;">Concepto</td>
            <td style="font-size:13px;font-weight:600;color:#1a2744;padding:5px 0;">${solicitud.concepto}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#636366;padding:5px 0;">Período</td>
            <td style="font-size:13px;font-weight:600;color:#1a2744;padding:5px 0;">${fmtFecha(solicitud.periodo_desde)} al ${fmtFecha(solicitud.periodo_hasta)}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#636366;padding:5px 0;">Módulos acreditados</td>
            <td style="font-size:13px;font-weight:600;color:#1a2744;padding:5px 0;">${agente.modulos}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#636366;padding:5px 0;">Monto a facturar</td>
            <td style="font-size:15px;font-weight:800;color:#1a2744;padding:5px 0;">${fmtMonto(agente.monto)}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#636366;padding:5px 0;">Fecha de vencimiento</td>
            <td style="font-size:13px;font-weight:600;color:#b45309;padding:5px 0;">${fmtFecha(solicitud.fecha_vencimiento)}</td>
          </tr>
        </table>
      </div>

      <!-- Tu CUIL -->
      <div style="background:#eef6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:12px;color:#185fa5;font-weight:700;margin-bottom:4px;">Tu CUIL emisor</div>
        <div style="font-size:18px;font-weight:800;color:#1a2744;letter-spacing:0.05em;">${agente.cuil}</div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:13px;color:#636366;margin-bottom:16px;line-height:1.6;">
          Una vez emitida la factura en AFIP, remitíla a través del siguiente formulario:
        </div>
        <a href="${formUrl}"
          style="display:inline-block;background:#1a2744;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;letter-spacing:-0.2px;">
          Remitir factura →
        </a>
        <div style="font-size:11px;color:#aeaeb2;margin-top:10px;">
          Este link es personal e intransferible
        </div>
      </div>

      <!-- Aviso -->
      <div style="border-top:1px solid #e0e4ed;padding-top:16px;">
        <p style="font-size:12px;color:#8e8e93;line-height:1.7;margin:0;">
          Si tenés dudas sobre el proceso de facturación, contactá al área de RRHH de la DGCAT.<br>
          <strong>No respondas este mail</strong> — es un envío automático de la plataforma CAT.
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;text-align:center;">
      <div style="font-size:10px;color:#aeaeb2;letter-spacing:0.06em;text-transform:uppercase;">
        Plataforma CAT · Dirección General de CAT · GCBA
      </div>
    </div>

  </div>
</body>
</html>
  `.trim();

  const text = `
Solicitud de factura — CAT DGCAT

Hola ${agente.nombre_completo},

Debés remitir tu factura (Tipo C) con los siguientes datos:

RECEPTOR
  Razón social : ${solicitud.razon_social_receptor}
  CUIT         : ${solicitud.cuit_receptor}

TU FACTURA
  Tipo         : C
  Concepto     : ${solicitud.concepto}
  Período      : ${solicitud.periodo_desde} al ${solicitud.periodo_hasta}
  Módulos      : ${agente.modulos}
  Monto        : ${agente.monto}
  Vencimiento  : ${solicitud.fecha_vencimiento}

TU CUIL EMISOR: ${agente.cuil}

Una vez emitida en AFIP, remití la factura en: ${formUrl}

No respondas este mail — es un envío automático de la plataforma CAT.
  `.trim();

  return { subject, html, text };
}

module.exports = { sendMail, templateLOYS };
