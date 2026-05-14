const m = require('../model/facturacion');
const { sendMail, templateLOYS } = require('../services/mailer');

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Agentes preview ───────────────────────────────────────────

async function getAgentes(req, res) {
  try {
    const { servicio_id } = req.query;
    if (!servicio_id) return res.status(400).json({ error: 'servicio_id requerido' });
    const agentes = await m.getAgentesParaFacturar(servicio_id);
    res.json(agentes);
  } catch (err) {
    console.error('[facturacion] getAgentes:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ── Crear solicitud y enviar mails ────────────────────────────

async function crear(req, res) {
  try {
    const {
      servicio_id, concepto, periodo_desde, periodo_hasta,
      fecha_vencimiento, cuit_receptor, razon_social_receptor,
      valor_uf, observaciones, agentes,
    } = req.body;

    if (!concepto || !periodo_desde || !periodo_hasta || !fecha_vencimiento)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    if (!cuit_receptor || !razon_social_receptor)
      return res.status(400).json({ error: 'CUIT y razón social del receptor son obligatorios' });
    if (!Array.isArray(agentes) || agentes.length === 0)
      return res.status(400).json({ error: 'Debe haber al menos un agente' });

    // Crear en DB
    const { solicitud, items } = await m.crearSolicitud({
      servicio_id: servicio_id || null,
      concepto, periodo_desde, periodo_hasta, fecha_vencimiento,
      cuit_receptor, razon_social_receptor, valor_uf: valor_uf || null,
      generado_por: req.user.id,
      observaciones,
      agentes,
    });

    // Enviar mails (en background, no bloqueamos la respuesta)
    const solicitudData = {
      concepto, periodo_desde, periodo_hasta, fecha_vencimiento,
      cuit_receptor, razon_social_receptor,
    };

    const mailPromises = items.map(async (item) => {
      const agente = agentes.find(a => a.profile_id === item.profile_id) || {};
      const formUrl = `${FRONTEND_URL()}/facturar/${item.token}`;

      try {
        if (item.tipo === 'loys') {
          const { subject, html, text } = templateLOYS({
            agente: {
              nombre_completo: item.nombre_completo,
              cuil:    item.cuil,
              modulos: agente.modulos || item.datos_enviados?.modulos,
              monto:   agente.monto   || item.datos_enviados?.monto,
            },
            solicitud: solicitudData,
            formUrl,
          });

          if (item.email) {
            await sendMail({ to: item.email, subject, html, text });
            await m.marcarMailEnviado(item.id);
          } else {
            console.warn(`[facturacion] Item ${item.id} sin email — no se envió mail`);
          }
        }
        // Planta: pendiente de implementación
      } catch (mailErr) {
        console.error(`[facturacion] Error enviando mail a ${item.email}:`, mailErr.message);
      }
    });

    // Lanzar envíos en background
    Promise.allSettled(mailPromises).then(results => {
      const errores = results.filter(r => r.status === 'rejected');
      if (errores.length > 0) {
        console.error(`[facturacion] ${errores.length} mails fallidos en solicitud ${solicitud.id}`);
      }
    });

    res.status(201).json({ solicitud, items, total: items.length });
  } catch (err) {
    console.error('[facturacion] crear:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ── Listar / detalle ──────────────────────────────────────────

async function getLista(req, res) {
  try {
    const lista = await m.getLista();
    res.json(lista);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getById(req, res) {
  try {
    const sol = await m.getById(req.params.id);
    if (!sol) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(sol);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Endpoint público: form del agente ────────────────────────

async function getForm(req, res) {
  try {
    const item = await m.getItemByToken(req.params.token);
    if (!item) return res.status(404).json({ error: 'Link no válido o expirado' });
    if (item.estado === 'aprobada') return res.status(410).json({ error: 'Esta factura ya fue aprobada. No podés modificarla.' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function postForm(req, res) {
  try {
    const { factura_numero, factura_fecha, factura_archivo, factura_datos } = req.body;
    if (!factura_numero) return res.status(400).json({ error: 'El número de factura es obligatorio' });

    const item = await m.getItemByToken(req.params.token);
    if (!item) return res.status(404).json({ error: 'Link no válido' });
    if (item.estado === 'aprobada') return res.status(410).json({ error: 'Esta factura ya fue aprobada' });

    const updated = await m.presentarFactura(req.params.token, {
      factura_numero, factura_fecha: factura_fecha || null,
      factura_archivo: factura_archivo || null,
      factura_datos:   factura_datos   || null,
    });
    if (!updated) return res.status(400).json({ error: 'No se pudo registrar la factura' });

    res.json({ ok: true, item: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Acciones RRHH ─────────────────────────────────────────────

async function accionRRHH(req, res) {
  try {
    const { estado, observaciones_rrhh } = req.body;
    const item = await m.accionRRHH(req.params.item_id, {
      estado,
      observaciones_rrhh,
      revisada_por: req.user.id,
    });
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });
    res.json(item);
  } catch (err) {
    if (err.message.startsWith('Estado inválido')) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAgentes, crear, getLista, getById, getForm, postForm, accionRRHH };
