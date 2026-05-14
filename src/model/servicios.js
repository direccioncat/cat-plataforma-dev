const pool = require('../db/pool');

// Query base que trae el pipeline completo de cada servicio
const SELECT_PIPELINE = `
  SELECT
    s.*,
    p.numero          AS presupuesto_numero,
    p.estado          AS presupuesto_estado,
    p.beneficiario    AS beneficiario_nombre,
    p.evento,
    p.valor_modulo,
    p.items,
    p.bui_numero,
    p.bui_archivo,
    p.bui_comp_numero,
    p.bui_comp_archivo,
    b.razon_social    AS beneficiario_razon_social,
    b.cuit            AS beneficiario_cuit,
    b.email           AS beneficiario_email,
    b.telefono        AS beneficiario_telefono,
    oa.id                   AS os_adicional_id,
    oa.nombre               AS os_nombre,
    oa.estado               AS os_estado,
    oa.evento_motivo        AS os_evento_motivo,
    oa.horario_desde        AS os_horario_desde,
    oa.horario_hasta        AS os_horario_hasta,
    oa.dotacion_agentes     AS os_dotacion_agentes,
    oa.dotacion_supervisores AS os_dotacion_supervisores,
    oa.dotacion_motorizados AS os_dotacion_motorizados,
    oa.observaciones        AS os_observaciones,
    bases.nombre            AS os_base_nombre,
    sa.id                    AS servicio_adicional_id,
    sa.estado                AS sa_estado,
    sa.modalidad_contrato    AS sa_modalidad,
    sa.modulos_calculados    AS sa_modulos,
    sa.created_at            AS sa_ingresado,
    sa.conflictos_revision   AS sa_conflictos_revision,
    pr.nombre_completo AS creado_por_nombre,
    COALESCE(
      json_agg(DISTINCT jsonb_build_object(
        'id', oaf.fecha
      )) FILTER (WHERE oaf.fecha IS NOT NULL),
      '[]'
    ) AS fechas_os,
    -- en_cobro: true si algún registro de presentismo de este servicio ya fue liquidado
    EXISTS (
      SELECT 1
      FROM sa_presentismo pr2
      JOIN sa_turnos t2 ON t2.id = pr2.turno_id
      WHERE t2.servicio_id = sa.id
        AND pr2.liquidacion_id IS NOT NULL
    ) AS en_cobro_real
  FROM servicios s
  LEFT JOIN presupuestos p   ON p.id = s.presupuesto_id
  LEFT JOIN beneficiarios b  ON b.id = p.beneficiario_id
  LEFT JOIN os_adicional oa  ON oa.servicio_id = s.id
  LEFT JOIN bases             ON bases.id = oa.base_id
  LEFT JOIN os_adicional_fechas oaf ON oaf.os_adicional_id = oa.id
  LEFT JOIN servicios_adicionales sa ON (sa.os_adicional_id = oa.id) OR (oa.id IS NULL AND sa.servicio_id = s.id)
  LEFT JOIN profiles pr       ON pr.id = s.creado_por
`;

async function getLista() {
  const { rows } = await pool.query(
    SELECT_PIPELINE +
    ' GROUP BY s.id, p.numero, p.estado, p.beneficiario, p.evento, p.valor_modulo, p.items,' +
    ' p.bui_numero, p.bui_archivo, p.bui_comp_numero, p.bui_comp_archivo,' +
    ' b.razon_social, b.cuit, b.email, b.telefono,' +
    ' oa.id, oa.nombre, oa.estado, oa.evento_motivo, oa.horario_desde, oa.horario_hasta,' +
    ' oa.dotacion_agentes, oa.dotacion_supervisores, oa.dotacion_motorizados, oa.observaciones,' +
    ' bases.nombre, sa.id, sa.estado, sa.modalidad_contrato, sa.modulos_calculados, sa.created_at, sa.servicio_id, pr.nombre_completo' +
    ' ORDER BY s.created_at DESC'
  );
  return rows.map(enriquecerPipeline);
}

async function getById(id) {
  const { rows } = await pool.query(
    SELECT_PIPELINE +
    ' WHERE s.id = $1' +
    ' GROUP BY s.id, p.numero, p.estado, p.beneficiario, p.evento, p.valor_modulo, p.items,' +
    ' p.bui_numero, p.bui_archivo, p.bui_comp_numero, p.bui_comp_archivo,' +
    ' b.razon_social, b.cuit, b.email, b.telefono,' +
    ' oa.id, oa.nombre, oa.estado, oa.evento_motivo, oa.horario_desde, oa.horario_hasta,' +
    ' oa.dotacion_agentes, oa.dotacion_supervisores, oa.dotacion_motorizados, oa.observaciones,' +
    ' bases.nombre, sa.id, sa.estado, sa.modalidad_contrato, sa.modulos_calculados, sa.created_at, sa.servicio_id, pr.nombre_completo',
    [id]
  );
  if (!rows[0]) return null;
  const servicio = enriquecerPipeline(rows[0]);
  // Documentos propios del servicio
  const docs = await pool.query(
    'SELECT * FROM servicio_documentos WHERE servicio_id = $1 ORDER BY created_at',
    [id]
  );
  servicio.documentos = docs.rows;
  return servicio;
}

// Genera numero_servicio: YY-N (ej: 26-1, 26-40)
// Usa advisory lock de transacción para serializar generaciones concurrentes del mismo año
async function generarNumero(client) {
  const yy = String(new Date().getFullYear()).slice(-2);
  await client.query(`SELECT pg_advisory_xact_lock(hashtext('numero_servicio_${yy}'))`);
  const { rows } = await client.query(
    `SELECT COUNT(*) AS total FROM servicios WHERE numero_servicio LIKE $1`,
    [`${yy}-%`]
  );
  return `${yy}-${parseInt(rows[0].total, 10) + 1}`;
}

// Crea el servicio en la misma transacción que el presupuesto
async function crearConPresupuesto(client, { presupuesto_id, creado_por }) {
  const numero = await generarNumero(client);
  const { rows: [s] } = await client.query(
    `INSERT INTO servicios (numero_servicio, presupuesto_id, creado_por)
     VALUES ($1, $2, $3) RETURNING *`,
    [numero, presupuesto_id, creado_por]
  );
  return s;
}

async function actualizarBuiPagada(id, bui_pagada) {
  const { rows: [s] } = await pool.query(
    `UPDATE servicios SET bui_pagada = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [bui_pagada, id]
  );
  return s || null;
}

// Vincula os_adicional al servicio
async function vincularOsAdicional(servicio_id, os_adicional_id) {
  await pool.query(
    `UPDATE os_adicional SET servicio_id = $1, updated_at = NOW() WHERE id = $2`,
    [servicio_id, os_adicional_id]
  );
}

// Documentos del servicio
async function getDocumentos(servicio_id) {
  const { rows } = await pool.query(
    'SELECT * FROM servicio_documentos WHERE servicio_id = $1 ORDER BY created_at',
    [servicio_id]
  );
  return rows;
}

async function crearDocumento({ servicio_id, tipo, nombre, nombre_archivo, tipo_mime, tamanio, subido_por }) {
  const { rows: [d] } = await pool.query(
    `INSERT INTO servicio_documentos (servicio_id, tipo, nombre, nombre_archivo, tipo_mime, tamanio, subido_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [servicio_id, tipo, nombre, nombre_archivo, tipo_mime || null, tamanio || null, subido_por]
  );
  return d;
}

async function eliminarDocumento(servicio_id, doc_id) {
  const { rows: [d] } = await pool.query(
    `DELETE FROM servicio_documentos WHERE id = $1 AND servicio_id = $2 RETURNING nombre_archivo`,
    [doc_id, servicio_id]
  );
  return d || null;
}

// Cancela el servicio y todo lo vinculado en cascada
async function cancelarServicio(id, cancelado_por) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Marcar el servicio
    const { rows: [s] } = await client.query(
      `UPDATE servicios SET estado = 'cancelado', cancelado_at = NOW(), cancelado_por = $2, updated_at = NOW()
       WHERE id = $1 AND estado != 'cancelado' RETURNING *`,
      [id, cancelado_por]
    );
    if (!s) throw new Error('Servicio no encontrado o ya cancelado');

    // 2. Presupuesto
    if (s.presupuesto_id) {
      await client.query(
        `UPDATE presupuestos SET estado = 'cancelado', updated_at = NOW() WHERE id = $1`,
        [s.presupuesto_id]
      );
    }

    // 3. OS Adicional
    const { rows: oaRows } = await client.query(
      `UPDATE os_adicional SET estado = 'cancelada', updated_at = NOW()
       WHERE servicio_id = $1 RETURNING id`,
      [id]
    );

    // 4. Servicios Adicionales — cancelar TODAS las SAs vinculadas (a cualquiera de las OSes del servicio)
    if (oaRows.length > 0) {
      const oaIds = oaRows.map(r => r.id);
      await client.query(
        `UPDATE servicios_adicionales SET estado = 'cancelado', updated_at = NOW()
         WHERE os_adicional_id = ANY($1::uuid[]) AND estado NOT IN ('cerrado', 'cancelado')`,
        [oaIds]
      );
    }
    // También cancelar SAs vinculados directamente al servicio (sin OS adicional)
    await client.query(
      `UPDATE servicios_adicionales SET estado = 'cancelado', updated_at = NOW()
       WHERE servicio_id = $1 AND os_adicional_id IS NULL AND estado NOT IN ('cerrado', 'cancelado')`,
      [id]
    );

    await client.query('COMMIT');
    return s;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Pipeline ─────────────────────────────────────────────────────
// Calcula el estado del pipeline a partir de los datos joinados
function enriquecerPipeline(row) {
  const pasos = {
    presupuesto_creado:    true,
    presupuesto_aprobado:  row.presupuesto_estado === 'aprobado',
    bui_emitida:           !!row.bui_numero,
    bui_pagada:            !!row.bui_pagada,
    os_validada:           !!row.os_adicional_id && ['validada', 'cumplida'].includes(row.os_estado),
    convocatoria:          !!row.servicio_adicional_id && ['convocado', 'en_curso', 'cerrado'].includes(row.sa_estado),
    presentismo_cerrado:   row.sa_estado === 'cerrado',
    en_cobro:              !!row.en_cobro_real,
    pagado:                false, // se implementa en siguiente fase
  };

  // Estado general: el último paso completado
  const orden = ['pagado','en_cobro','presentismo_cerrado','convocatoria',
                 'os_validada','bui_pagada','bui_emitida','presupuesto_aprobado','presupuesto_creado'];
  const estado_pipeline = orden.find(p => pasos[p]) || 'presupuesto_creado';

  return { ...row, pipeline: pasos, estado_pipeline };
}

module.exports = {
  getLista, getById, crearConPresupuesto, actualizarBuiPagada,
  vincularOsAdicional, cancelarServicio,
  getDocumentos, crearDocumento, eliminarDocumento,
};
