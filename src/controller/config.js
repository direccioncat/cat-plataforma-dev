const m = require('../model/config');

const CLAVES_SMTP = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'];

/** GET /api/config/smtp — devuelve config SMTP sin la contraseña en claro */
async function getSMTP(req, res) {
  try {
    const smtp = await m.getSMTP();
    // Enmascarar la contraseña: solo indicar si está configurada
    const resp = { ...smtp };
    if (resp.smtp_pass) resp.smtp_pass_set = true;
    delete resp.smtp_pass;
    res.json(resp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/** PUT /api/config/smtp — actualiza credenciales SMTP */
async function setSMTP(req, res) {
  try {
    const pares = [];
    for (const clave of CLAVES_SMTP) {
      if (req.body[clave] !== undefined) {
        pares.push({ clave, valor: req.body[clave] });
      }
    }
    if (pares.length === 0) return res.status(400).json({ error: 'Sin campos para actualizar' });

    await m.setMultiple(pares, req.user.id);
    console.log(`[config] SMTP actualizado por ${req.user.id} — campos: ${pares.map(p => p.clave).join(', ')}`);
    res.json({ ok: true, actualizados: pares.map(p => p.clave) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/** POST /api/config/smtp/test — intenta conectarse al SMTP y envía un mail de prueba */
async function testSMTP(req, res) {
  try {
    const { sendMail } = require('../services/mailer');
    const destino = req.user.email || req.body.destino;
    if (!destino) return res.status(400).json({ error: 'No hay email del operador para la prueba. Pasá destino en el body.' });

    await sendMail({
      to: destino,
      subject: 'CAT Plataforma — Test de configuración SMTP',
      html: `<p>✅ El servidor de correo está configurado correctamente.</p><p style="color:#636366;font-size:12px">Enviado desde la plataforma CAT · DGCAT · GCBA</p>`,
      text: 'El servidor de correo está configurado correctamente.',
    });

    res.json({ ok: true, enviado_a: destino });
  } catch (err) {
    console.error('[config] Test SMTP fallido:', err.message);
    res.status(400).json({ error: err.message });
  }
}

module.exports = { getSMTP, setSMTP, testSMTP };
