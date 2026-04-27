const pool = require('../db/pool');

const SELECT_PROFILE = `SELECT p.id, p.email, p.role, p.base_id, p.turno, p.legajo, p.nombre_completo, p.activo, p.estado_turno, b.nombre as base_nombre
  FROM profiles p LEFT JOIN bases b ON p.base_id = b.id`;

async function getProfiles({ baseId, turno, role, busq, limit }) {
  const params = [];
  let where = 'WHERE p.activo = true';

  if (baseId) { params.push(baseId); where += ' AND p.base_id = $' + params.length; }
  if (turno)  { params.push(turno);  where += ' AND p.turno = $' + params.length; }
  if (role)   { params.push(role);   where += ' AND p.role = $' + params.length; }
  if (busq)   {
    params.push('%' + busq.toLowerCase() + '%');
    where += ' AND (LOWER(p.nombre_completo) LIKE $' + params.length + ' OR p.legajo LIKE $' + params.length + ')';
  }

  let q = SELECT_PROFILE + ' ' + where + ' ORDER BY p.nombre_completo';
  if (limit) { params.push(parseInt(limit) || 20); q += ' LIMIT $' + params.length; }

  return (await pool.query(q, params)).rows;
}

async function getProfileById(id) {
  const r = await pool.query(SELECT_PROFILE + ' WHERE p.id = $1', [id]);
  return r.rows[0] || null;
}

async function getEquipo(baseId) {
  const [baseRes, perfilesRes] = await Promise.all([
    pool.query('SELECT id, nombre, direccion FROM bases WHERE id = $1', [baseId]),
    pool.query('SELECT p.id, p.nombre_completo, p.role, p.turno, p.legajo, p.estado_turno FROM profiles p WHERE p.base_id = $1 AND p.activo = true ORDER BY p.role, p.nombre_completo', [baseId]),
  ]);
  return { base: baseRes.rows[0] || null, miembros: perfilesRes.rows };
}

async function getMisionesDeAgente(agenteId) {
  const r = await pool.query('SELECT m.*, b.nombre as base_nombre FROM misiones m LEFT JOIN bases b ON m.base_id = b.id WHERE m.agente_id = $1 ORDER BY m.created_at DESC', [agenteId]);
  return r.rows;
}

async function crearProfile({ email, hash, role, base_id, turno, legajo, nombre_completo }) {
  const r = await pool.query(
    'INSERT INTO profiles (email, password_hash, role, base_id, turno, legajo, nombre_completo) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, email, role, base_id, turno, legajo, nombre_completo',
    [email, hash, role, base_id || null, turno || null, legajo || null, nombre_completo]
  );
  return r.rows[0];
}

async function actualizarProfile(id, fields, params) {
  const r = await pool.query(
    'UPDATE profiles SET ' + fields.join(', ') + ' WHERE id = $' + params.length + ' RETURNING id, email, role, base_id, turno, nombre_completo, legajo, estado_turno',
    params
  );
  return r.rows[0] || null;
}

async function actualizarTelefono(id, telefono) {
  const r = await pool.query(
    'UPDATE profiles SET telefono = $1, updated_at = NOW() WHERE id = $2 RETURNING id, telefono',
    [telefono, id]
  );
  return r.rows[0] || null;
}

module.exports = { getProfiles, getProfileById, getEquipo, getMisionesDeAgente, crearProfile, actualizarProfile, actualizarTelefono };
