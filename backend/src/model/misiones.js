const pool = require('../db/pool');

async function getMisiones({ scopeBaseId, fecha, estado, turno }) {
  let query = `
    SELECT m.*, b.nombre as base_nombre,
      json_agg(
        json_build_object(
          'id', p.id, 'nombre_completo', p.nombre_completo, 'legajo', p.legajo,
          'turno', p.turno, 'es_encargado', ma.es_encargado,
          'estado', ma.estado, 'aceptado_at', ma.aceptado_at
        )
      ) FILTER (WHERE p.id IS NOT NULL) as agentes
    FROM misiones m
    LEFT JOIN bases b ON m.base_id = b.id
    LEFT JOIN mision_agentes ma ON ma.mision_id = m.id
    LEFT JOIN profiles p ON ma.agente_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (scopeBaseId) { params.push(scopeBaseId); query += ` AND m.base_id = $${params.length}`; }
  if (fecha)       { params.push(fecha);        query += ` AND m.fecha = $${params.length}`; }
  if (estado)      { params.push(estado);       query += ` AND m.estado = $${params.length}`; }
  if (turno)       { params.push(turno);        query += ` AND m.turno = $${params.length}`; }

  query += ` GROUP BY m.id, b.nombre ORDER BY m.created_at DESC`;
  return (await pool.query(query, params)).rows;
}

async function getMisionById(id) {
  const mision = await pool.query(
    `SELECT m.*, b.nombre as base_nombre FROM misiones m LEFT JOIN bases b ON m.base_id = b.id WHERE m.id = $1`,
    [id]
  );
  if (!mision.rows[0]) return null;

  const [agentes, interrupciones] = await Promise.all([
    pool.query(
      `SELECT p.id, p.nombre_completo, p.legajo, p.turno, ma.es_encargado, ma.estado, ma.asignado_at, ma.aceptado_at
       FROM mision_agentes ma JOIN profiles p ON ma.agente_id = p.id WHERE ma.mision_id = $1`, [id]
    ),
    pool.query(
      `SELECT i.*, p.nombre_completo FROM interrupciones i JOIN profiles p ON i.agente_id = p.id
       WHERE i.mision_id = $1 ORDER BY i.inicio DESC`, [id]
    ),
  ]);

  return { ...mision.rows[0], agentes: agentes.rows, interrupciones: interrupciones.rows };
}

async function getMisionesMias(agenteId) {
  return (await pool.query(
    `SELECT m.*, b.nombre as base_nombre, ma.es_encargado, ma.estado as estado_agente
     FROM misiones m JOIN mision_agentes ma ON ma.mision_id = m.id LEFT JOIN bases b ON m.base_id = b.id
     WHERE ma.agente_id = $1 ORDER BY m.fecha DESC, m.created_at DESC`,
    [agenteId]
  )).rows;
}

async function crearMision(data) {
  const { baseId, titulo, descripcion, turno, fecha, tipo, modo_ubicacion,
          calle, altura, calle2, desde, hasta, poligono_desc, eje_psv, lat, lng, os_item_id } = data;

  const result = await pool.query(
    `INSERT INTO misiones (base_id, titulo, descripcion, turno, fecha, tipo, modo_ubicacion,
      calle, altura, calle2, desde, hasta, poligono_desc, eje_psv, lat, lng, os_item_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [baseId, titulo, descripcion || null, turno,
     fecha || new Date().toISOString().split('T')[0],
     tipo || 'servicio', modo_ubicacion || 'altura',
     calle || null, altura || null, calle2 || null,
     desde || null, hasta || null, poligono_desc || null,
     eje_psv || null, lat || null, lng || null, os_item_id || null]
  );
  return result.rows[0];
}

async function asignarAgentes(client, misionId, agenteIds, encargadoId) {
  for (const agenteId of agenteIds) {
    await client.query(
      `INSERT INTO mision_agentes (mision_id, agente_id, estado, es_encargado)
       VALUES ($1, $2, 'asignado', $3) ON CONFLICT (mision_id, agente_id) DO UPDATE SET es_encargado = $3`,
      [misionId, agenteId, agenteId === encargadoId]
    );
  }
  await client.query(
    `UPDATE misiones SET estado = 'asignada', encargado_id = $1, updated_at = NOW()
     WHERE id = $2 AND estado = 'sin_asignar'`,
    [encargadoId, misionId]
  );
}

async function aceptarMision(client, misionId, agenteId) {
  await client.query(
    `UPDATE mision_agentes SET estado = 'en_mision', aceptado_at = NOW() WHERE mision_id = $1 AND agente_id = $2`,
    [misionId, agenteId]
  );
  const hayEncargado = await client.query(
    `SELECT id FROM mision_agentes WHERE mision_id = $1 AND es_encargado = true`, [misionId]
  );
  if (!hayEncargado.rows.length) {
    await client.query(`UPDATE mision_agentes SET es_encargado = true WHERE mision_id = $1 AND agente_id = $2`, [misionId, agenteId]);
    await client.query(`UPDATE misiones SET encargado_id = $1, updated_at = NOW() WHERE id = $2`, [agenteId, misionId]);
  }
  await client.query(`UPDATE misiones SET estado = 'en_mision', updated_at = NOW() WHERE id = $1`, [misionId]);
  await client.query(`UPDATE profiles SET estado_turno = 'en_mision' WHERE id = $1`, [agenteId]);
}

async function interrumpirMision(client, misionId, agenteId, motivo) {
  await client.query(`INSERT INTO interrupciones (mision_id, agente_id, motivo) VALUES ($1, $2, $3)`, [misionId, agenteId, motivo]);
  await client.query(`UPDATE misiones SET estado = 'interrumpida', updated_at = NOW() WHERE id = $1`, [misionId]);
  await client.query(`UPDATE mision_agentes SET estado = 'libre' WHERE mision_id = $1 AND agente_id = $2`, [misionId, agenteId]);
  await client.query(`UPDATE profiles SET estado_turno = 'libre' WHERE id = $1`, [agenteId]);
}

async function cerrarMision(client, misionId, observaciones) {
  await client.query(`UPDATE misiones SET estado = 'cerrada', observaciones = $1, updated_at = NOW() WHERE id = $2`, [observaciones || null, misionId]);
  await client.query(`UPDATE mision_agentes SET estado = 'libre' WHERE mision_id = $1`, [misionId]);
  await client.query(`UPDATE interrupciones SET fin = NOW(), activa = false WHERE mision_id = $1 AND activa = true`, [misionId]);
  await client.query(`UPDATE profiles SET estado_turno = 'libre' WHERE id IN (SELECT agente_id FROM mision_agentes WHERE mision_id = $1)`, [misionId]);
}

async function getMisionBaseTitulo(id) {
  return (await pool.query(`SELECT base_id, titulo FROM misiones WHERE id = $1`, [id])).rows[0];
}

async function registrarActividad(base_id, mision_id, agente_id, tipo, descripcion) {
  await pool.query(
    `INSERT INTO actividad (base_id, mision_id, agente_id, tipo, descripcion) VALUES ($1, $2, $3, $4, $5)`,
    [base_id, mision_id, agente_id, tipo, descripcion]
  );
}

module.exports = { getMisiones, getMisionById, getMisionesMias, crearMision, asignarAgentes, aceptarMision, interrumpirMision, cerrarMision, getMisionBaseTitulo, registrarActividad };
