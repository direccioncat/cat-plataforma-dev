const pool = require('../db/pool');
const { ROLES_VALIDOS_SA, ROL_LABELS_SA } = require('../config');
const { resolverToken, getTurnosByServicio, validarTurnoIds, getAgentePorLegajo, getPostulacion, crearPostulacion, crearPostulanteTurno } = require('../model/postular');
const { validarUUID, validarTurnoIdsUUID } = require('./validaciones/postular');

async function getInfoConvocatoria(token) {
  if (!validarUUID(token)) return { error: 'Convocatoria no encontrada', status: 404 };

  const conv = await resolverToken(token);
  if (!conv) return { error: 'Convocatoria no encontrada', status: 404 };
  if (!conv.activo) return { error: 'Esta convocatoria ya no está activa', status: 410 };
  if (conv.vence_en && new Date(conv.vence_en) < new Date()) return { error: 'Esta convocatoria ha vencido', status: 410 };

  const turnos = await getTurnosByServicio(conv.servicio_id);

  return {
    data: {
      servicio_nombre: conv.evento_motivo || conv.os_nombre || 'Servicio Adicional',
      base_nombre: conv.base_nombre,
      vence_en: conv.vence_en,
      turnos,
      roles: ROLES_VALIDOS_SA.map(r => ({ value: r, label: ROL_LABELS_SA[r] })),
    }
  };
}

async function registrarPostulacion({ token, legajo, rol_solicitado, turno_ids, todos_los_turnos, ip }) {
  if (!validarUUID(token)) return { error: 'Convocatoria no encontrada', status: 404 };

  const todosFlag = todos_los_turnos === true || todos_los_turnos === 'true';

  if (!todosFlag && turno_ids?.length > 0 && !validarTurnoIdsUUID(turno_ids))
    return { error: 'IDs de turno inválidos', status: 400 };

  const conv = await resolverToken(token);
  if (!conv) return { error: 'Convocatoria no encontrada', status: 404 };
  if (!conv.activo) return { error: 'Convocatoria inactiva', status: 410 };
  if (conv.vence_en && new Date(conv.vence_en) < new Date()) return { error: 'Convocatoria vencida', status: 410 };

  let turnoIdsValidos = [];
  if (!todosFlag && turno_ids?.length > 0) {
    turnoIdsValidos = await validarTurnoIds(turno_ids, conv.servicio_id);
    if (turnoIdsValidos.length === 0)
      return { error: 'Los turnos seleccionados no son válidos para esta convocatoria', status: 400 };
  }

  const agente = await getAgentePorLegajo(String(legajo).trim());
  if (!agente) return { error: 'No se encontró un agente con ese legajo', status: 404 };

  const yaPostulado = await getPostulacion(conv.servicio_id, agente.id);
  if (yaPostulado) return { error: 'Ya estás postulado a este servicio', status: 409 };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const postulante_id = await crearPostulacion(client, { servicioId: conv.servicio_id, agenteId: agente.id, rolSolicitado: rol_solicitado, todosFlag });
    for (const tid of turnoIdsValidos) await crearPostulanteTurno(client, postulante_id, tid);
    await client.query('COMMIT');

    console.log(`[POSTULACION] ip=${ip} legajo=${String(legajo).trim()} servicio=${conv.servicio_id} token=${token} todos=${todosFlag} turnos=${turnoIdsValidos.length}`);
    return { data: { ok: true, nombre_completo: agente.nombre_completo } };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getInfoConvocatoria, registrarPostulacion };
