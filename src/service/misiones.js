const pool = require('../db/pool');
const { getMisiones, getMisionById, getMisionesMias, crearMision, asignarAgentes, aceptarMision, interrumpirMision, cerrarMision, getMisionBaseTitulo, registrarActividad } = require('../model/misiones');

async function listarMisiones({ user, query }) {
  const { fecha, turno, estado, base_id } = query;
  let scopeBaseId = ['gerencia', 'admin'].includes(user.role) ? (base_id || null) : user.base_id;
  const filtrarTurno = turno && !['gerencia', 'admin', 'jefe_base'].includes(user.role) ? turno : null;
  return await getMisiones({ scopeBaseId, fecha, estado, turno: filtrarTurno });
}

async function obtenerMision(id) {
  return await getMisionById(id);
}

async function misionesMias(agenteId) {
  return await getMisionesMias(agenteId);
}

async function crearNuevaMision({ user, body }) {
  const baseId = body.base_id || user.base_id;
  const mision = await crearMision({ ...body, baseId });
  await registrarActividad(baseId, mision.id, user.id, 'mision_creada', `Misión creada: ${mision.titulo}`);
  return mision;
}

async function asignar({ misionId, agente_ids, encargado_id, user }) {
  const encargadoId = encargado_id || agente_ids[0];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await asignarAgentes(client, misionId, agente_ids, encargadoId);
    await client.query('COMMIT');
    const m = await getMisionBaseTitulo(misionId);
    await registrarActividad(m?.base_id, misionId, user.id, 'mision_asignada', `${agente_ids.length} agente(s) asignado(s) a: ${m?.titulo}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function aceptar({ misionId, user }) {
  const client = await pool.connect();
  try {
    const asignacion = await client.query(`SELECT * FROM mision_agentes WHERE mision_id = $1 AND agente_id = $2`, [misionId, user.id]);
    if (!asignacion.rows[0]) { client.release(); return { error: 'No estás asignado a esta misión', status: 403 }; }
    await client.query('BEGIN');
    await aceptarMision(client, misionId, user.id);
    await client.query('COMMIT');
    const m = await getMisionBaseTitulo(misionId);
    await registrarActividad(m?.base_id, misionId, user.id, 'mision_aceptada', `${user.nombre_completo} aceptó la misión: ${m?.titulo}`);
    return { ok: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function interrumpir({ misionId, user, motivo }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await interrumpirMision(client, misionId, user.id, motivo);
    await client.query('COMMIT');
    const m = await getMisionBaseTitulo(misionId);
    await registrarActividad(m?.base_id, misionId, user.id, 'mision_interrumpida', `${user.nombre_completo} interrumpió: ${m?.titulo}. Motivo: ${motivo}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function cerrar({ misionId, user, observaciones }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await cerrarMision(client, misionId, observaciones);
    await client.query('COMMIT');
    const m = await getMisionBaseTitulo(misionId);
    await registrarActividad(m?.base_id, misionId, user.id, 'mision_cerrada', `Misión cerrada: ${m?.titulo}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { listarMisiones, obtenerMision, misionesMias, crearNuevaMision, asignar, aceptar, interrumpir, cerrar };
