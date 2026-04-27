const { getSanciones, crearSancion, actualizarSancion, eliminarSancion, tieneSancionActiva } = require('../model/sanciones');

async function listarSanciones({ activas, busq }) {
  const hoy = new Date().toISOString().slice(0, 10);
  return await getSanciones({ hoy, activas, busq });
}

async function crearNuevaSancion({ body, userId }) {
  const { agente_id, motivo, propuesto_por, fecha_inicio, fecha_fin } = body;
  if (new Date(fecha_fin) <= new Date(fecha_inicio))
    throw { status: 400, message: 'fecha_fin debe ser posterior a fecha_inicio' };
  return await crearSancion({ agente_id, motivo, propuesto_por, fecha_inicio, fecha_fin, creado_por: userId });
}

async function actualizarDatosSancion({ id, body }) {
  return await actualizarSancion({ id, ...body });
}

async function borrarSancion(id) {
  await eliminarSancion(id);
}

async function checkSancionActiva(agenteId) {
  return await tieneSancionActiva(agenteId);
}

module.exports = { listarSanciones, crearNuevaSancion, actualizarDatosSancion, borrarSancion, checkSancionActiva };
