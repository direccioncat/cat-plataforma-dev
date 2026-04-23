const pool = require('../db/pool');

async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT p.*, b.nombre as base_nombre
     FROM profiles p
     LEFT JOIN bases b ON p.base_id = b.id
     WHERE p.email = $1 AND p.activo = true`,
    [email.toLowerCase().trim()]
  );
  return result.rows[0] || null;
}

async function crearRefreshToken(profile_id, token, expiresAt) {
  await pool.query(
    `INSERT INTO refresh_tokens (profile_id, token, expires_at) VALUES ($1, $2, $3)`,
    [profile_id, token, expiresAt]
  );
}

async function findRefreshToken(token) {
  const result = await pool.query(
    `SELECT rt.*, p.id as profile_id, p.email, p.role, p.base_id, p.turno, p.nombre_completo, p.legajo
     FROM refresh_tokens rt
     JOIN profiles p ON rt.profile_id = p.id
     WHERE rt.token = $1 AND rt.expires_at > NOW() AND p.activo = true`,
    [token]
  );
  return result.rows[0] || null;
}

async function eliminarRefreshToken(token) {
  await pool.query(`DELETE FROM refresh_tokens WHERE token = $1`, [token]);
}

// ── Blacklist de access tokens ────────────────────────────────

async function revocarToken(jti, expiresAt) {
  await pool.query(
    `INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [jti, expiresAt]
  );
}

async function isTokenRevoked(jti) {
  const result = await pool.query(
    `SELECT 1 FROM revoked_tokens WHERE jti = $1 AND expires_at > NOW() LIMIT 1`,
    [jti]
  );
  return result.rowCount > 0;
}

module.exports = {
  findUserByEmail,
  crearRefreshToken, findRefreshToken, eliminarRefreshToken,
  revocarToken, isTokenRevoked,
};
