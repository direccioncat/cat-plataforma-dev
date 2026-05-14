const pool = require('../db/pool');

const SELECT_PROFILE = `SELECT p.id, p.email, p.role, p.base_id, p.turno, p.legajo, p.nombre_completo,
  p.activo, p.estado_turno, p.cuit, p.cargo, p.funcion, p.funcion_especifica, p.tipo_contrato,
  p.fecha_nacimiento, p.hora_entrada, p.hora_salida, p.telefono, p.telefono_ht,
  b.nombre as base_nombre
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
    pool.query(`SELECT p.id, p.nombre_completo, p.role, p.turno, p.legajo, p.estado_turno,
      p.email, p.cuit, p.cargo, p.funcion, p.funcion_especifica, p.tipo_contrato,
      p.fecha_nacimiento, p.hora_entrada, p.hora_salida, p.telefono, p.telefono_ht
      FROM profiles p WHERE p.base_id = $1 AND p.activo = true ORDER BY p.role, p.nombre_completo`, [baseId]),
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

async function getBases() {
  const r = await pool.query('SELECT id, nombre FROM bases ORDER BY nombre');
  return r.rows;
}

async function upsertProfileNomina(row) {
  // CUIT es el identificador primario (usado por RRHH).
  // Fallback: legajo → email
  let existing = null
  if (row.cuit) {
    existing = (await pool.query('SELECT id FROM profiles WHERE cuit = $1', [row.cuit])).rows[0]
  }
  if (!existing && row.legajo) {
    existing = (await pool.query('SELECT id FROM profiles WHERE legajo = $1', [row.legajo])).rows[0]
  }
  if (!existing && row.email) {
    existing = (await pool.query('SELECT id FROM profiles WHERE email = $1', [row.email])).rows[0]
  }

  if (existing) {
    const r = await pool.query(`
      UPDATE profiles SET
        nombre_completo    = COALESCE($1, nombre_completo),
        email              = COALESCE($2, email),
        base_id            = COALESCE($3, base_id),
        turno              = COALESCE($4, turno),
        cuit               = COALESCE($5, cuit),
        cargo              = COALESCE($6, cargo),
        funcion            = COALESCE($7, funcion),
        funcion_especifica = COALESCE($8, funcion_especifica),
        tipo_contrato      = COALESCE($9, tipo_contrato),
        fecha_nacimiento   = COALESCE($10, fecha_nacimiento),
        hora_entrada       = COALESCE($11, hora_entrada),
        hora_salida        = COALESCE($12, hora_salida),
        telefono           = COALESCE($13, telefono),
        telefono_ht        = COALESCE($14, telefono_ht),
        updated_at         = NOW()
      WHERE id = $15
      RETURNING id, legajo, nombre_completo, email
    `, [
      row.nombre_completo, row.email, row.base_id, row.turno,
      row.cuit, row.cargo, row.funcion, row.funcion_especifica,
      row.tipo_contrato, row.fecha_nacimiento || null,
      row.hora_entrada || null, row.hora_salida || null,
      row.telefono, row.telefono_ht,
      existing.id,
    ]);
    return { accion: 'actualizado', ...r.rows[0] };
  } else {
    // Crear nuevo: password temporal = cuit sin guiones, o "Cat2026!" si no hay CUIT
    const bcrypt = require('bcryptjs');
    const passwordBase = row.cuit ? row.cuit.replace(/\D/g, '') : 'Cat2026!';
    const hash = await bcrypt.hash(passwordBase, 10);
    const r = await pool.query(`
      INSERT INTO profiles
        (email, password_hash, role, base_id, turno, legajo, nombre_completo,
         cuit, cargo, funcion, funcion_especifica, tipo_contrato,
         fecha_nacimiento, hora_entrada, hora_salida, telefono, telefono_ht)
      VALUES ($1,$2,'agente',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (email) DO UPDATE SET
        legajo = EXCLUDED.legajo, nombre_completo = EXCLUDED.nombre_completo,
        updated_at = NOW()
      RETURNING id, legajo, nombre_completo, email
    `, [
      row.email || `sin-email-${row.legajo}@cat.gcba.gob.ar`,
      hash, row.base_id, row.turno, row.legajo, row.nombre_completo,
      row.cuit, row.cargo, row.funcion, row.funcion_especifica,
      row.tipo_contrato, row.fecha_nacimiento || null,
      row.hora_entrada || null, row.hora_salida || null,
      row.telefono, row.telefono_ht,
    ]);
    return { accion: 'creado', passwordTemporal: passwordBase, ...r.rows[0] };
  }
}

module.exports = { getProfiles, getProfileById, getEquipo, getMisionesDeAgente, crearProfile, actualizarProfile, actualizarTelefono, getBases, upsertProfileNomina };
