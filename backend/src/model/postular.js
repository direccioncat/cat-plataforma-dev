const pool = require('../db/pool');

async function resolverToken(token) {
  const r = await pool.query(
    `SELECT t.*, sa.id AS servicio_id, oa.nombre AS os_nombre, oa.evento_motivo, b.nombre AS base_nombre
     FROM sa_convocatoria_tokens t
     JOIN servicios_adicionales sa ON sa.id = t.servicio_id
     LEFT JOIN os_adicional oa ON sa.os_adicional_id = oa.id
     LEFT JOIN bases b ON oa.base_id = b.id
     WHERE t.token = $1`,
    [token]
  );
  return r.rows[0] || null;
}

async function getTurnosByServicio(servicioId) {
  const r = await pool.query(
    'SELECT id, nombre, fecha, hora_inicio, hora_fin, modulos FROM sa_turnos WHERE servicio_id = $1 ORDER BY fecha, hora_inicio',
    [servicioId]
  );
  return r.rows;
}

async function validarTurnoIds(turnoIds, servicioId) {
  const r = await pool.query(
    `SELECT id FROM sa_turnos WHERE id = ANY($1::uuid[]) AND servicio_id = $2`,
    [turnoIds, servicioId]
  );
  return r.rows.map(r => r.id);
}

async function getAgentePorLegajo(legajo) {
  const r = await pool.query(
    'SELECT id, nombre_completo FROM profiles WHERE legajo = $1',
    [legajo]
  );
  return r.rows[0] || null;
}

async function getPostulacion(servicioId, agenteId) {
  const r = await pool.query(
    'SELECT id FROM sa_postulantes WHERE servicio_id = $1 AND agente_id = $2',
    [servicioId, agenteId]
  );
  return r.rows[0] || null;
}

async function crearPostulacion(client, { servicioId, agenteId, rolSolicitado, todosFlag }) {
  const r = await client.query(
    `INSERT INTO sa_postulantes (servicio_id, agente_id, rol_solicitado, origen, todos_los_turnos)
     VALUES ($1, $2, $3, 'formulario', $4) RETURNING id`,
    [servicioId, agenteId, rolSolicitado, todosFlag]
  );
  return r.rows[0].id;
}

async function crearPostulanteTurno(client, postulante_id, turno_id) {
  await client.query(
    'INSERT INTO sa_postulante_turnos (postulante_id, turno_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [postulante_id, turno_id]
  );
}

module.exports = { resolverToken, getTurnosByServicio, validarTurnoIds, getAgentePorLegajo, getPostulacion, crearPostulacion, crearPostulanteTurno };
