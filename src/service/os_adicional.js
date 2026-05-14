const pool = require('../db/pool');
const m = require('../model/os_adicional');
const saModel = require('../model/servicios_adicionales');

function calcularModulosSync(horaInicio, horaFin, duracionHoras = 4) {
  if (!horaInicio || !horaFin) return 0;
  const hI = String(horaInicio).slice(0, 5).split(':').map(Number);
  const hF = String(horaFin).slice(0, 5).split(':').map(Number);
  let hs = ((hF[0] * 60 + hF[1]) - (hI[0] * 60 + hI[1])) / 60;
  if (hs < 0) hs += 24; // turno nocturno que cruza medianoche
  return hs <= 0 ? 0 : Math.round(hs / duracionHoras);
}

async function listarOs(user) {
  const esGlobal = ['admin','director','gerencia','planeamiento'].includes(user.role);
  return await m.getLista({ esGlobal, base_id: user.base_id });
}

async function obtenerOs(id) { return await m.getById(id); }

async function crearOs({ user, body }) {
  const { nombre, evento_motivo, base_id, horario_desde, horario_hasta, dotacion_agentes, dotacion_supervisores, dotacion_motorizados, observaciones, fechas = [], recursos = [], servicio_id } = body;
  const base = base_id || user.base_id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const oa = await m.crear(client, { nombre, evento_motivo, base, creado_por: user.id, horario_desde, horario_hasta, dotacion_agentes, dotacion_supervisores, dotacion_motorizados, observaciones, fechas, recursos, servicio_id: servicio_id || null });
    await m.registrarActividad(client, { base_id: base, agente_id: user.id, tipo: 'os_adicional_creada', descripcion: `Nueva OS adicional: ${nombre || 'Sin nombre'}`, metadata: { os_adicional_id: oa.id } });
    await client.query('COMMIT');
    return { ...oa, fechas, recursos, turnos: [], fases: [] };
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

async function actualizarOs(id, body, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const oa = await m.actualizar(id, body);
    if (oa && user) {
      await m.registrarActividad(client, {
        base_id: oa.base_id, agente_id: user.id,
        tipo: 'os_adicional_actualizada',
        descripcion: `OS adicional actualizada: ${oa.nombre}`,
        metadata: { os_adicional_id: oa.id },
      });
    }
    await client.query('COMMIT');
    return oa;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

async function enviarAValidacion(id, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const oa = await m.enviarValidacion(client, id);
    if (!oa) { await client.query('ROLLBACK'); return null; }
    await m.registrarActividad(client, { base_id: oa.base_id, agente_id: user.id, tipo: 'os_adicional_validacion', descripcion: `OS adicional enviada a validación: ${oa.nombre}`, metadata: { os_adicional_id: oa.id } });
    await client.query('COMMIT');
    return oa;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

async function validarOs(id, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const oa = await m.validar(client, id, user.id);
    if (!oa) { await client.query('ROLLBACK'); return null; }
    const duracionHoras = parseFloat(await saModel.getConfigValor('modulo_duracion_horas', '4'));
    const calcFn = (hi, hf) => calcularModulosSync(hi, hf, duracionHoras);
    const servicio = await m.crearServicioAdicional(client, { os_adicional_id: id, userId: user.id, oa, calcularModulosSync: calcFn });
    await m.registrarActividad(client, { base_id: oa.base_id, agente_id: user.id, tipo: 'servicio_generado', descripcion: `Nuevo servicio adicional generado: ${oa.nombre}`, metadata: { os_adicional_id: oa.id, servicio_adicional_id: servicio.id } });
    await m.registrarActividad(client, { base_id: oa.base_id, agente_id: user.id, tipo: 'os_adicional_validada', descripcion: `OS adicional validada: ${oa.nombre}`, metadata: { os_adicional_id: oa.id } });
    await client.query('COMMIT');
    return { os: oa, servicio_adicional_id: servicio.id };
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

async function rechazarOs(id, user, obs_rechazo) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const oa = await m.rechazar(client, id, user.id, obs_rechazo);
    if (!oa) { await client.query('ROLLBACK'); return null; }

    // Cancelar el SA vinculado (si existe y no está ya cerrado/cancelado)
    await client.query(`
      UPDATE servicios_adicionales
         SET estado = 'cancelado', updated_at = NOW()
       WHERE os_adicional_id = $1
         AND estado NOT IN ('cerrado', 'cancelado')
    `, [id]);

    await m.registrarActividad(client, { base_id: oa.base_id, agente_id: user.id, tipo: 'os_adicional_rechazada', descripcion: `OS adicional rechazada: ${oa.nombre}`, metadata: { os_adicional_id: oa.id, motivo: obs_rechazo || null } });
    await client.query('COMMIT');
    return oa;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

const ESTADOS_OS_VALIDOS = ['borrador', 'validacion', 'requiere_revision', 'validada', 'cumplida', 'rechazada', 'cancelada'];
async function cambiarEstado(id, estado) {
  if (!ESTADOS_OS_VALIDOS.includes(estado))
    throw Object.assign(new Error(`Estado inválido: ${estado}`), { status: 400 });
  return await m.cambiarEstado(id, estado);
}
async function eliminarOs(id) { return await m.eliminar(id); }

// Turnos
async function getTurnos(osId) { return await m.getTurnos(osId); }
async function crearTurno(osId, body) { return await m.crearTurno(osId, body); }
async function actualizarTurno(turnoId, body) { return await m.actualizarTurno(turnoId, body); }
async function eliminarTurno(turnoId) { await m.eliminarTurno(turnoId); }

// Fases
async function crearFase(osId, body) { return await m.crearFase(osId, body); }
async function duplicarFase(faseId) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const r = await m.duplicarFase(client, faseId); await client.query('COMMIT'); return r; }
  catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}
async function moverFase(faseId, turno_id) { return await m.moverFase(faseId, turno_id); }
async function actualizarFase(faseId, body) { return await m.actualizarFase(faseId, body); }
async function eliminarFase(faseId) { await m.eliminarFase(faseId); }

// Elementos
async function crearElemento(faseId, body) { return await m.crearElemento(faseId, body); }
async function actualizarElemento(elId, body) { return await m.actualizarElemento(elId, body); }
async function eliminarElemento(elId) { await m.eliminarElemento(elId); }

async function guardarRecursos(osId, recursos) { return await m.sincronizarRecursos(osId, recursos); }

module.exports = { listarOs, obtenerOs, crearOs, actualizarOs, enviarAValidacion, validarOs, rechazarOs, cambiarEstado, eliminarOs, getTurnos, crearTurno, actualizarTurno, eliminarTurno, crearFase, duplicarFase, moverFase, actualizarFase, eliminarFase, crearElemento, actualizarElemento, eliminarElemento, guardarRecursos };
