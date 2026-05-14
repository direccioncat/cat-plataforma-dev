const pool = require('../db/pool');

// ── Agentes con presentismo confirmado para un servicio ───────

async function getAgentesParaFacturar(servicio_id) {
  const { rows } = await pool.query(`
    SELECT DISTINCT
      p.id              AS profile_id,
      p.nombre_completo,
      p.cuit            AS cuil,
      p.email,
      p.loys,
      COALESCE(SUM(COALESCE(pr.modulos_acreditados, t.modulos, 0)), 0)::NUMERIC AS modulos,
      COALESCE(SUM(COALESCE(pr.modulos_acreditados, t.modulos, 0)), 0)::NUMERIC * COALESCE(
        (SELECT valor FROM valor_uf_historico
         WHERE vigente_desde <= CURRENT_DATE
         ORDER BY vigente_desde DESC LIMIT 1), 0
      ) AS monto
    FROM sa_presentismo pr
    JOIN sa_turnos  t  ON t.id  = pr.turno_id
    JOIN profiles   p  ON p.id  = pr.agente_id
    WHERE t.servicio_id  = $1
      AND pr.presente    = true
      AND pr.ausencia_justificada = false
    GROUP BY p.id, p.nombre_completo, p.cuit, p.email, p.loys
    ORDER BY p.nombre_completo
  `, [servicio_id]);
  return rows;
}

// ── Crear solicitud + items + envío ──────────────────────────

async function crearSolicitud({
  servicio_id,
  concepto,
  periodo_desde,
  periodo_hasta,
  fecha_vencimiento,
  cuit_receptor,
  razon_social_receptor,
  valor_uf,
  generado_por,
  observaciones,
  agentes, // array: [{ profile_id, nombre_completo, cuil, email, modulos, monto, tipo }]
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [sol] } = await client.query(`
      INSERT INTO facturacion_solicitudes
        (servicio_id, concepto, periodo_desde, periodo_hasta, fecha_vencimiento,
         cuit_receptor, razon_social_receptor, valor_uf, generado_por, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [servicio_id, concepto, periodo_desde, periodo_hasta, fecha_vencimiento,
        cuit_receptor, razon_social_receptor, valor_uf || null,
        generado_por, observaciones || null]);

    const items = [];
    for (const ag of agentes) {
      const datos_enviados = {
        nombre_completo:    ag.nombre_completo,
        cuil:               ag.cuil,
        modulos:            ag.modulos,
        monto:              ag.monto,
        tipo:               ag.tipo || 'loys',
        concepto,
        periodo_desde,
        periodo_hasta,
        fecha_vencimiento,
        cuit_receptor,
        razon_social_receptor,
      };
      const { rows: [item] } = await client.query(`
        INSERT INTO facturacion_items
          (solicitud_id, profile_id, tipo, nombre_completo, cuil, email, datos_enviados)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
      `, [sol.id, ag.profile_id, ag.tipo || 'loys',
          ag.nombre_completo, ag.cuil, ag.email || null,
          JSON.stringify(datos_enviados)]);
      items.push(item);
    }

    await client.query('COMMIT');
    return { solicitud: sol, items };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Marcar item como mail enviado */
async function marcarMailEnviado(item_id) {
  await pool.query(`
    UPDATE facturacion_items SET mail_enviado_at = NOW() WHERE id = $1
  `, [item_id]);
}

// ── Listar ────────────────────────────────────────────────────

async function getLista() {
  const { rows } = await pool.query(`
    SELECT
      fs.*,
      p.nombre_completo AS generado_por_nombre,
      s.nombre          AS servicio_nombre,
      COUNT(fi.id)                                          AS total_items,
      COUNT(fi.id) FILTER (WHERE fi.estado = 'pendiente')  AS pendientes,
      COUNT(fi.id) FILTER (WHERE fi.estado = 'presentada') AS presentadas,
      COUNT(fi.id) FILTER (WHERE fi.estado = 'aprobada')   AS aprobadas,
      COUNT(fi.id) FILTER (WHERE fi.estado = 'rechazada')  AS rechazadas,
      COUNT(fi.id) FILTER (WHERE fi.estado = 'subsanacion') AS subsanacion
    FROM facturacion_solicitudes fs
    LEFT JOIN profiles             p  ON p.id  = fs.generado_por
    LEFT JOIN servicios_adicionales s  ON s.id  = fs.servicio_id
    LEFT JOIN facturacion_items    fi ON fi.solicitud_id = fs.id
    GROUP BY fs.id, p.nombre_completo, s.nombre
    ORDER BY fs.generado_at DESC
  `);
  return rows;
}

async function getById(id) {
  const { rows: [sol] } = await pool.query(`
    SELECT fs.*, p.nombre_completo AS generado_por_nombre, s.nombre AS servicio_nombre
    FROM facturacion_solicitudes fs
    LEFT JOIN profiles             p ON p.id = fs.generado_por
    LEFT JOIN servicios_adicionales s ON s.id = fs.servicio_id
    WHERE fs.id = $1
  `, [id]);
  if (!sol) return null;

  const { rows: items } = await pool.query(`
    SELECT fi.*, pr.nombre_completo AS revisado_por_nombre
    FROM facturacion_items fi
    LEFT JOIN profiles pr ON pr.id = fi.revisada_por
    WHERE fi.solicitud_id = $1
    ORDER BY fi.nombre_completo
  `, [id]);

  return { ...sol, items };
}

// ── Item por token (público) ──────────────────────────────────

async function getItemByToken(token) {
  const { rows: [item] } = await pool.query(`
    SELECT fi.*, fs.concepto, fs.periodo_desde, fs.periodo_hasta,
           fs.fecha_vencimiento, fs.cuit_receptor, fs.razon_social_receptor,
           fs.valor_uf, fs.servicio_id,
           s.nombre AS servicio_nombre
    FROM facturacion_items fi
    JOIN facturacion_solicitudes fs ON fs.id = fi.solicitud_id
    LEFT JOIN servicios_adicionales s ON s.id = fs.servicio_id
    WHERE fi.token = $1
  `, [token]);
  return item || null;
}

/** El agente remite su factura */
async function presentarFactura(token, { factura_numero, factura_fecha, factura_archivo, factura_datos }) {
  const { rows: [item] } = await pool.query(`
    UPDATE facturacion_items
    SET estado          = 'presentada',
        factura_numero  = $2,
        factura_fecha   = $3,
        factura_archivo = $4,
        factura_datos   = $5,
        presentada_at   = NOW()
    WHERE token = $1 AND estado IN ('pendiente','subsanacion')
    RETURNING *
  `, [token, factura_numero || null, factura_fecha || null,
      factura_archivo || null, factura_datos ? JSON.stringify(factura_datos) : null]);
  return item || null;
}

// ── Acciones RRHH ─────────────────────────────────────────────

async function accionRRHH(item_id, { estado, observaciones_rrhh, revisada_por }) {
  const estados_validos = ['aprobada', 'rechazada', 'subsanacion'];
  if (!estados_validos.includes(estado)) {
    throw new Error(`Estado inválido: ${estado}`);
  }
  const { rows: [item] } = await pool.query(`
    UPDATE facturacion_items
    SET estado             = $2,
        observaciones_rrhh = $3,
        revisada_at        = NOW(),
        revisada_por       = $4
    WHERE id = $1
    RETURNING *
  `, [item_id, estado, observaciones_rrhh || null, revisada_por]);
  return item || null;
}

module.exports = {
  getAgentesParaFacturar,
  crearSolicitud,
  marcarMailEnviado,
  getLista,
  getById,
  getItemByToken,
  presentarFactura,
  accionRRHH,
};
