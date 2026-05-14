const { getActividad, crearActividad } = require('../model/actividad');

async function listarActividad({ user, limite = 50, mision_id, base_id_query }) {
  let baseId = null;
  if (user.role !== 'gerencia' && user.role !== 'admin') {
    baseId = user.base_id;
  } else if (base_id_query) {
    baseId = base_id_query;
  }
  return await getActividad({ baseId, mision_id, limite });
}

async function registrarActividad({ user, tipo, descripcion, mision_id, metadata }) {
  return await crearActividad({
    base_id: user.base_id,
    mision_id,
    agente_id: user.id,
    tipo,
    descripcion,
    metadata,
  });
}

module.exports = { listarActividad, registrarActividad };
