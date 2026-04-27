const pool = require('../db/pool');

async function getActividad({ baseId, mision_id, limite }) {
  let query = `
    SELECT a.*, p.nombre_completo, p.legajo, m.titulo as mision_titulo
    FROM actividad a
    LEFT JOIN profiles p ON a.agente_id = p.id
    LEFT JOIN misiones m ON a.mision_id = m.id
    WHERE 1=1
  `;
  const params = [];

  if (baseId) { params.push(baseId); query += ` AND a.base_id = $${params.length}`; }
  if (mision_id) { params.push(mision_id); query += ` AND a.mision_id = $${params.length}`; }

  params.push(parseInt(limite));
  query += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;

  const result = await pool.query(query, params);
  return result.rows;
}

async function crearActividad({ base_id, mision_id, agente_id, tipo, descripcion, metadata }) {
  const result = await pool.query(
    `INSERT INTO actividad (base_id, mision_id, agente_id, tipo, descripcion, metadata)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [base_id, mision_id || null, agente_id, tipo, descripcion,
     metadata ? JSON.stringify(metadata) : '{}']
  );
  return result.rows[0];
}

module.exports = { getActividad, crearActividad };
