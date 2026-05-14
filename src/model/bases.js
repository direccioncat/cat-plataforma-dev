const pool = require('../db/pool');

async function getBasesActivas() {
  const result = await pool.query(
    `SELECT id, nombre, direccion FROM bases WHERE activa = true ORDER BY nombre`
  );
  return result.rows;
}

module.exports = { getBasesActivas };
