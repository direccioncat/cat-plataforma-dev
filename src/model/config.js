const pool = require('../db/pool');

/** Lee todas las claves de config (sin filtrar — el controller decide qué exponer) */
async function getAll() {
  const { rows } = await pool.query(`
    SELECT clave, valor, descripcion, actualizado_at, actualizado_por
    FROM sistema_config ORDER BY clave
  `);
  return rows;
}

/** Lee el valor de una clave específica */
async function get(clave) {
  const { rows: [r] } = await pool.query(
    'SELECT valor FROM sistema_config WHERE clave = $1', [clave]
  );
  return r?.valor ?? null;
}

/** Obtiene el bloque SMTP completo */
async function getSMTP() {
  const { rows } = await pool.query(`
    SELECT clave, valor FROM sistema_config
    WHERE clave IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from')
  `);
  const map = {};
  for (const r of rows) map[r.clave] = r.valor;
  return map;
}

/** Actualiza múltiples claves en una sola transacción */
async function setMultiple(pares, usuario_id) {
  // pares: [{ clave, valor }]
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { clave, valor } of pares) {
      await client.query(`
        INSERT INTO sistema_config (clave, valor, actualizado_por, actualizado_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (clave) DO UPDATE
          SET valor           = EXCLUDED.valor,
              actualizado_por = EXCLUDED.actualizado_por,
              actualizado_at  = NOW()
      `, [clave, valor ?? '', usuario_id]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getAll, get, getSMTP, setMultiple };
