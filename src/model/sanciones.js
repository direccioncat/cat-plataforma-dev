const pool = require('../db/pool');

async function getSanciones({ hoy, activas, busq }) {
  const params = [hoy];
  let filtroEstado = '';
  let filtroBusq = '';

  if (activas === 'true')       filtroEstado = 'AND s.fecha_inicio <= $1 AND s.fecha_fin >= $1';
  else if (activas === 'false') filtroEstado = 'AND s.fecha_fin < $1';

  if (busq) {
    params.push(`%${busq}%`);
    filtroBusq = `AND (a.nombre_completo ILIKE $${params.length} OR a.legajo ILIKE $${params.length})`;
  }

  const r = await pool.query(`
    SELECT s.*, a.nombre_completo AS agente_nombre, a.legajo AS agente_legajo,
      b.nombre AS agente_base, p.nombre_completo AS propuesto_por_nombre,
      c.nombre_completo AS creado_por_nombre,
      (s.fecha_inicio <= $1 AND s.fecha_fin >= $1) AS activa
    FROM sa_sanciones s
    JOIN profiles a ON s.agente_id = a.id
    LEFT JOIN bases b ON a.base_id = b.id
    LEFT JOIN profiles p ON s.propuesto_por = p.id
    LEFT JOIN profiles c ON s.creado_por = c.id
    WHERE 1=1 ${filtroEstado} ${filtroBusq}
    ORDER BY s.created_at DESC
  `, params);

  return r.rows;
}

async function crearSancion({ agente_id, motivo, propuesto_por, fecha_inicio, fecha_fin, creado_por }) {
  const r = await pool.query(
    `INSERT INTO sa_sanciones (agente_id, motivo, propuesto_por, fecha_inicio, fecha_fin, creado_por)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [agente_id, motivo, propuesto_por || null, fecha_inicio, fecha_fin, creado_por]
  );
  return r.rows[0];
}

async function actualizarSancion({ id, motivo, propuesto_por, fecha_inicio, fecha_fin }) {
  const r = await pool.query(
    `UPDATE sa_sanciones SET motivo=$1, propuesto_por=$2, fecha_inicio=$3, fecha_fin=$4, updated_at=NOW()
     WHERE id=$5 RETURNING *`,
    [motivo, propuesto_por || null, fecha_inicio, fecha_fin, id]
  );
  return r.rows[0] || null;
}

async function eliminarSancion(id) {
  await pool.query('DELETE FROM sa_sanciones WHERE id = $1', [id]);
}

async function tieneSancionActiva(agenteId) {
  const hoy = new Date().toISOString().slice(0, 10);
  const r = await pool.query(
    'SELECT id FROM sa_sanciones WHERE agente_id = $1 AND fecha_inicio <= $2 AND fecha_fin >= $2',
    [agenteId, hoy]
  );
  return r.rows.length > 0;
}

module.exports = { getSanciones, crearSancion, actualizarSancion, eliminarSancion, tieneSancionActiva };
