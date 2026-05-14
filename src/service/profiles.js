const bcrypt = require('bcryptjs');
const { getProfiles, getProfileById, getEquipo, getMisionesDeAgente, crearProfile, actualizarProfile, actualizarTelefono } = require('../model/profiles');

async function listarProfiles({ user, query }) {
  const esRestringido = ['coordinador', 'supervisor', 'coordinador_cgm'].includes(user.role);
  const baseId = esRestringido ? user.base_id : (query.base_id || null);
  return await getProfiles({ baseId, turno: query.turno, role: query.role, busq: query.busq, limit: query.limit });
}

async function obtenerProfile(id) {
  return await getProfileById(id);
}

async function obtenerEquipo({ user, base_id_query }) {
  const baseId = ['gerencia', 'admin', 'director'].includes(user.role)
    ? (base_id_query || user.base_id)
    : user.base_id;
  return await getEquipo(baseId);
}

async function misionesDeAgente(agenteId) {
  return await getMisionesDeAgente(agenteId);
}

async function crearNuevoProfile({ email, password, role, base_id, turno, legajo, nombre_completo }) {
  const hash = await bcrypt.hash(password, 10);
  return await crearProfile({ email: email.toLowerCase().trim(), hash, role, base_id, turno, legajo, nombre_completo });
}

async function actualizarDatosProfile({ id, body, esAdmin }) {
  const { nombre_completo, turno, base_id, role, activo } = body;
  const fields = [], params = [];

  if (nombre_completo !== undefined)    { params.push(nombre_completo); fields.push('nombre_completo = $' + params.length); }
  if (turno !== undefined)              { params.push(turno);           fields.push('turno = $' + params.length); }
  if (esAdmin && base_id !== undefined) { params.push(base_id);         fields.push('base_id = $' + params.length); }
  if (esAdmin && role)                  { params.push(role);            fields.push('role = $' + params.length); }
  if (esAdmin && activo !== undefined)  { params.push(activo);          fields.push('activo = $' + params.length); }

  if (!fields.length) return null;

  params.push(new Date()); fields.push('updated_at = $' + params.length);
  params.push(id);

  return await actualizarProfile(id, fields, params);
}

async function actualizarTelefonoProfile(id, telefono) {
  return await actualizarTelefono(id, telefono.trim());
}

module.exports = { listarProfiles, obtenerProfile, obtenerEquipo, misionesDeAgente, crearNuevoProfile, actualizarDatosProfile, actualizarTelefonoProfile };
