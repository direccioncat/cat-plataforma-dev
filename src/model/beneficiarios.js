const pool = require('../db/pool');

async function getBeneficiarios({ activo = true } = {}) {
  const r = await pool.query(
    `SELECT * FROM beneficiarios WHERE activo = $1 ORDER BY razon_social`,
    [activo]
  );
  return r.rows;
}

async function getBeneficiarioById(id) {
  const r = await pool.query('SELECT * FROM beneficiarios WHERE id = $1', [id]);
  return r.rows[0] || null;
}

async function crearBeneficiario({ razon_social, nombre, email, telefono, cuit }) {
  const r = await pool.query(
    `INSERT INTO beneficiarios (razon_social, nombre, email, telefono, cuit)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [razon_social.trim(), nombre?.trim() || null, email?.trim().toLowerCase() || null, telefono?.trim() || null, cuit?.trim() || null]
  );
  return r.rows[0];
}

async function actualizarBeneficiario(id, { razon_social, nombre, email, telefono, cuit, activo }) {
  const r = await pool.query(
    `UPDATE beneficiarios SET
       razon_social = COALESCE($1, razon_social),
       nombre       = COALESCE($2, nombre),
       email        = COALESCE($3, email),
       telefono     = COALESCE($4, telefono),
       cuit         = COALESCE($5, cuit),
       activo       = COALESCE($6, activo),
       updated_at   = NOW()
     WHERE id = $7
     RETURNING *`,
    [razon_social?.trim() || null, nombre?.trim() || null, email?.trim().toLowerCase() || null,
     telefono?.trim() || null, cuit?.trim() || null, activo ?? null, id]
  );
  return r.rows[0] || null;
}

async function eliminarBeneficiario(id) {
  // Soft delete — no borrar si tiene presupuestos asociados
  const r = await pool.query(
    `UPDATE beneficiarios SET activo = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
    [id]
  );
  return r.rows[0] || null;
}

module.exports = { getBeneficiarios, getBeneficiarioById, crearBeneficiario, actualizarBeneficiario, eliminarBeneficiario };
