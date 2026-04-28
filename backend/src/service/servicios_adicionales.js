const pool = require('../db/pool');
const m    = require('../model/servicios_adicionales');
const { tieneSancionActiva } = require('../model/sanciones');

// ── Helpers ────────────────────────────────────────────────────

function periodoActual() {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
}

async function calcularModulos(hora_inicio, hora_fin) {
  const dur = parseFloat(await m.getConfigValor('modulo_duracion_horas', '4'));
  if (!hora_inicio || !hora_fin) return 0;
  const [hI, mI] = hora_inicio.split(':').map(Number);
  const [hF, mF] = hora_fin.split(':').map(Number);
  const hs = ((hF * 60 + mF) - (hI * 60 + mI)) / 60;
  if (hs <= 0) return 0;
  return Math.round(hs / dur);
}

async function calcularPrioridad(agenteId, periodo) {
  const pesoModulo = parseInt(await m.getConfigValor('peso_modulo', '100'));
  const mods = await m.getModulosAgente(agenteId, periodo);
  const pens = await m.getPenalizacionesAgente(agenteId, periodo);
  return -(mods * pesoModulo) - pens;
}

async function calcularPeriodoFinPenalizacion(periodoInicio) {
  const meses = parseInt(await m.getConfigValor('penalizacion_ausencia_meses', '2'));
  const [anio, mes] = periodoInicio.split('-').map(Number);
  const fin = new Date(anio, mes - 1 + meses, 1);
  return fin.getFullYear() + '-' + String(fin.getMonth() + 1).padStart(2, '0');
}

// ── Config ─────────────────────────────────────────────────────

async function getConfig() {
  return m.getConfig();
}

async function updateConfig(cambios) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await m.updateConfig(client, cambios);
    await client.query('COMMIT');
    return { data: result };
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

// ── Colección ──────────────────────────────────────────────────

async function getLista(estado) {
  return m.getLista(estado);
}

async function crearServicio({ os_adicional_id, observaciones, userId }) {
  const client = await pool.connect();
  try {
    const osRes = await client.query('SELECT * FROM os_adicional WHERE id = $1', [os_adicional_id]);
    if (!osRes.rows[0]) return { error: 'OS adicional no encontrada', status: 404 };
    const existe = await client.query('SELECT id FROM servicios_adicionales WHERE os_adicional_id = $1', [os_adicional_id]);
    if (existe.rows[0]) return { error: 'Ya existe', status: 409, data: { id: existe.rows[0].id } };
    await client.query('BEGIN');
    const sa = await m.crearServicio(client, { os_adicional_id, observaciones, creado_por: userId, os: osRes.rows[0] });
    await client.query('COMMIT');
    const reqs = await pool.query('SELECT * FROM sa_requerimientos WHERE servicio_id = $1', [sa.id]);
    return { data: { ...sa, requerimientos: reqs.rows } };
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

// ── Individual ─────────────────────────────────────────────────

async function getById(id) {
  const data = await m.getById(id);
  if (!data) return { error: 'No encontrado', status: 404 };
  return { data };
}

async function updateServicio(id, body) {
  const row = await m.updateServicio(id, body);
  if (!row) return { error: 'No encontrado', status: 404 };
  return { data: row };
}

async function avanzarEstado(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await m.avanzarEstado(client, id);
    if (result.notFound)             { await client.query('ROLLBACK'); return { error: 'No encontrado', status: 404 }; }
    if (result.badState)             { await client.query('ROLLBACK'); return { error: 'No se puede avanzar desde este estado', status: 400 }; }
    if (result.presentismoIncompleto){ await client.query('ROLLBACK'); return { error: `Hay ${result.faltantes} agente${result.faltantes !== 1 ? 's' : ''} sin presentismo registrado. Completá el presentismo de todos los turnos antes de cerrar.`, status: 409 }; }
    await client.query('COMMIT');
    return { data: result.row };
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

async function updateRequerimientos(servicioId, requerimientos) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rows = await m.updateRequerimientos(client, servicioId, requerimientos);
    await client.query('COMMIT');
    return { data: rows };
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

// ── Turnos ─────────────────────────────────────────────────────

async function getTurnos(servicioId) {
  return { data: await m.getTurnos(servicioId) };
}

async function crearTurno(servicioId, body) {
  const mods = await calcularModulos(body.hora_inicio, body.hora_fin);
  return { data: await m.crearTurno(servicioId, { ...body, modulos: mods }) };
}

async function updateTurno(tid, servicioId, body) {
  let modulos;
  if ((body.hora_inicio || body.hora_fin) && body.modulos === undefined) {
    const cur = await m.getTurnoHoras(tid);
    if (cur) {
      const hI = body.hora_inicio || String(cur.hora_inicio).slice(0, 5);
      const hF = body.hora_fin    || String(cur.hora_fin).slice(0, 5);
      modulos = await calcularModulos(hI, hF);
    }
  }
  const row = await m.updateTurno(tid, servicioId, body, modulos);
  if (!row) return { error: 'Turno no encontrado', status: 404 };
  return { data: row };
}

async function deleteTurno(tid, servicioId) {
  await m.deleteTurno(tid, servicioId);
  return { data: { ok: true } };
}

// ── Estructura ─────────────────────────────────────────────────

async function getEstructura(servicioId, turnoId) {
  return { data: await m.getEstructura(servicioId, turnoId) };
}

async function upsertEstructura(servicioId, turnoId, body) {
  const { agente_id, rol, jefe_id, origen, tipo_convocatoria } = body;
  const tipo = tipo_convocatoria || 'adicional';
  if (await tieneSancionActiva(agente_id))
    return { error: 'El agente se encuentra vetado y no puede ser asignado a ningún servicio adicional.', status: 409, vetado: true };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await m.upsertEstructura(client, { servicioId, turnoId, agente_id, rol, jefe_id, origen, tipo });
    await client.query('COMMIT');
    return { data: row };
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

async function patchEstructura(nid, body) {
  const row = await m.patchEstructura(nid, body);
  if (!row) return { error: 'No encontrado', status: 404 };
  return { data: row };
}

async function deleteEstructura(nid) {
  await m.deleteEstructura(nid);
  return { data: { ok: true } };
}

// ── Postulantes ────────────────────────────────────────────────

async function getPostulantes(servicioId, rol) {
  const rows = await m.getPostulantes(servicioId, rol);
  const periodo = periodoActual();
  const conPrioridad = await Promise.all(rows.map(async (p) => {
    const prioridad           = await calcularPrioridad(p.agente_id, periodo);
    const modulos_mes         = await m.getModulosAgente(p.agente_id, periodo);
    const penalizaciones_activas = await m.getPenalizacionCount(p.agente_id, periodo);
    const turnos_ids          = p.todos_los_turnos ? [] : await m.getPostulanteTurnos(p.id);
    return { ...p, modulos_mes, penalizaciones_activas, prioridad, turnos_ids };
  }));
  conPrioridad.sort((a, b) => b.prioridad - a.prioridad);
  return { data: conPrioridad };
}

async function importCsvPostulantes(servicioId, buffer) {
  const { parse } = require('csv-parse/sync');
  const ROLES_VALIDOS = ['infante', 'supervisor', 'chofer', 'motorizado', 'chofer_grua', 'coordinador'];
  const filas = parse(buffer.toString('utf-8'), { columns: true, skip_empty_lines: true, trim: true });
  const resultado = { importados: 0, errores: [] };
  const client = await pool.connect();
  const turnosServicio = (await client.query('SELECT id, nombre FROM sa_turnos WHERE servicio_id = $1', [servicioId])).rows;
  function matchTurno(nombre) {
    const n = (nombre || '').trim().toLowerCase();
    return turnosServicio.find(t => (t.nombre || '').toLowerCase() === n);
  }
  try {
    await client.query('BEGIN');
    for (let i = 0; i < filas.length; i++) {
      const f        = filas[i];
      const legajo   = (f.legajo || f.Legajo || '').trim();
      const rol      = (f.rol_solicitado || f.rol || f.Rol || '').trim().toLowerCase();
      const turnosRaw = (f.turnos || f.Turnos || '').trim();
      if (!legajo) { resultado.errores.push({ fila: i + 2, mensaje: 'Legajo vacio' }); continue; }
      if (!ROLES_VALIDOS.includes(rol)) { resultado.errores.push({ fila: i + 2, legajo, mensaje: 'Rol invalido: ' + rol }); continue; }
      const ag = await m.getAgentePorLegajo(legajo);
      if (!ag) { resultado.errores.push({ fila: i + 2, legajo, mensaje: 'Agente no encontrado' }); continue; }
      if (await tieneSancionActiva(ag.id)) { resultado.errores.push({ fila: i + 2, legajo, mensaje: 'Agente vetado (sanción activa)' }); continue; }
      const rawLower = turnosRaw.toLowerCase();
      const esTodos  = !turnosRaw || rawLower === 'todos los turnos' || rawLower === 'todos';
      let turnosIds = [];
      if (!esTodos) {
        for (const nb of turnosRaw.split(',').map(s => s.trim()).filter(Boolean)) {
          const t = matchTurno(nb);
          if (t) turnosIds.push(t.id);
          else resultado.errores.push({ fila: i + 2, legajo, mensaje: 'Turno no encontrado: ' + nb });
        }
      }
      const post = await m.upsertPostulante(client, { servicioId, agente_id: ag.id, rol_solicitado: rol, origen: 'csv', todosLos: esTodos });
      if (!esTodos) await m.setPostulanteTurnos(client, post.id, turnosIds);
      resultado.importados++;
    }
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  return { data: resultado };
}

async function crearPostulante(servicioId, body) {
  const { agente_id, rol_solicitado, todos_los_turnos, turnos_ids } = body;
  const todosLos = todos_los_turnos !== false;
  if (await tieneSancionActiva(agente_id))
    return { error: 'El agente se encuentra vetado y no puede postularse a ningún servicio adicional.', status: 409, vetado: true };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const post = await m.upsertPostulante(client, { servicioId, agente_id, rol_solicitado, origen: 'manual', todosLos });
    if (!todosLos && Array.isArray(turnos_ids) && turnos_ids.length)
      await m.setPostulanteTurnos(client, post.id, turnos_ids);
    await client.query('COMMIT');
    return { data: post };
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

async function updatePostulanteRol(servicioId, pid, rol_solicitado) {
  const row = await m.updatePostulanteRol(servicioId, pid, rol_solicitado);
  if (!row) return { error: 'No encontrado', status: 404 };
  return { data: row };
}

async function updatePostulanteTurnos(servicioId, pid, body) {
  const { todos_los_turnos, turnos_ids } = body;
  const esTodos = todos_los_turnos !== false;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE sa_postulantes SET todos_los_turnos = $1 WHERE id = $2 AND servicio_id = $3', [esTodos, pid, servicioId]);
    await client.query('DELETE FROM sa_postulante_turnos WHERE postulante_id = $1', [pid]);
    if (!esTodos && Array.isArray(turnos_ids) && turnos_ids.length) {
      for (const tid of turnos_ids)
        await client.query('INSERT INTO sa_postulante_turnos (postulante_id,turno_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [pid, tid]);
    }
    await client.query('COMMIT');
    return { data: { ok: true } };
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

async function updatePostulanteTelefono(servicioId, pid, telefono) {
  const row = await m.updatePostulanteTelefono(servicioId, pid, telefono.trim());
  if (!row) return { error: 'No encontrado', status: 404 };
  return { data: row };
}

async function deletePostulante(servicioId, pid) {
  await m.deletePostulante(servicioId, pid);
  return { data: { ok: true } };
}

// ── Convocatoria ───────────────────────────────────────────────

async function getConvocatoria(servicioId) {
  return { data: await m.getConvocatoria(servicioId) };
}

async function updateConvocatoria(servicioId, cid, body, userId) {
  const { estado, observaciones } = body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await m.updateConvocatoria(client, { cid, estado, userId, observaciones, servicioId });
    if (!row) { await client.query('ROLLBACK'); return { error: 'No encontrado', status: 404 }; }
    await client.query('COMMIT');
    return { data: row };
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

// ── Presentismo ────────────────────────────────────────────────

async function getPresentismo(servicioId, turnoId) {
  return { data: await m.getPresentismo(servicioId, turnoId) };
}

// Roles que pueden modificar presentismo incluso con servicio cerrado
const ROLES_PUEDE_EDITAR_CERRADO = ['admin', 'gerencia', 'director'];

async function registrarPresentismo(servicioId, turnoId, registros, userId, userRole) {
  const client = await pool.connect();
  try {
    // Verificar si el servicio está cerrado
    const saR = await client.query('SELECT estado FROM servicios_adicionales WHERE id = $1', [servicioId]);
    if (!saR.rows[0]) return { error: 'Servicio no encontrado', status: 404 };
    if (saR.rows[0].estado === 'cerrado' && !ROLES_PUEDE_EDITAR_CERRADO.includes(userRole)) {
      return { error: 'El presentismo de este servicio está cerrado. Solo un administrador puede modificarlo.', status: 403 };
    }

    const turnoR = await client.query('SELECT fecha, modulos FROM sa_turnos WHERE id = $1', [turnoId]);
    if (!turnoR.rows[0]) return { error: 'Turno no encontrado', status: 404 };
    const turno      = turnoR.rows[0];
    const modsDef    = turno.modulos || 0;
    const periodo    = periodoActual();
    const periodoFin = await calcularPeriodoFinPenalizacion(periodo);
    const penPts          = parseInt(await m.getConfigValor('penalizacion_ausencia_puntos', '20'));
    const penPtsJust      = parseInt(await m.getConfigValor('penalizacion_ausencia_justificada_puntos', '0'));
    const maxModsDia      = parseInt(await m.getConfigValor('max_modulos_dia', '3'));
    const fechaTurno = new Date(turno.fecha).toISOString().slice(0, 10);
    await client.query('BEGIN');
    const alertas = [];
    for (const r of registros) {
      const estrR       = await m.getTipoConvocatoria(r.agente_id, turnoId);
      const esAdicional = !estrR || estrR.tipo_convocatoria !== 'ordinario';
      const justificado = r.ausencia_justificada === true;
      const mods        = (r.presente && esAdicional) ? (r.modulos_acreditados !== undefined ? r.modulos_acreditados : modsDef) : 0;
      if (r.presente && esAdicional && mods > 0) {
        const acumulado = await m.getModulosDiaAgente(r.agente_id, fechaTurno);
        if (acumulado + mods > maxModsDia)
          alertas.push({ agente_id: r.agente_id, mensaje: `Supera el maximo de ${maxModsDia} modulos/dia (acumulado: ${acumulado})` });
      }
      await m.upsertPresentismo(client, { servicioId, turnoId, agente_id: r.agente_id, presente: r.presente, ausenciaJustificada: justificado, mods, userId });
      if (r.presente && esAdicional && mods > 0) {
        await m.upsertModulosAgente(client, { agente_id: r.agente_id, servicioId, periodo, mods });
      } else if (!r.presente && esAdicional) {
        if (justificado && penPtsJust > 0) {
          // Ausencia justificada con puntaje parcial configurado
          await m.insertPenalizacion(client, { agente_id: r.agente_id, servicioId, penPts: penPtsJust, periodo, periodoFin, userId });
        } else if (!justificado) {
          // Ausencia injustificada — penalización completa
          await m.insertPenalizacion(client, { agente_id: r.agente_id, servicioId, penPts, periodo, periodoFin, userId });
        }
        // Si justificado y penPtsJust === 0, no se genera ninguna penalización
      }
    }
    await client.query('COMMIT');
    return { data: { ok: true, registros_procesados: registros.length, alertas } };
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

// ── Flyer ──────────────────────────────────────────────────────

async function updateFlyer(id, body) {
  const row = await m.updateFlyer(id, body);
  if (!row) return { error: 'No encontrado', status: 404 };
  return { data: row };
}

async function getFlyerData(id) {
  const data = await m.getFlyerData(id);
  if (!data) return { error: 'No encontrado', status: 404 };
  return { data };
}

// ── Módulos día ────────────────────────────────────────────────

async function getModulosDia(fecha) {
  return { data: await m.getModulosDia(fecha) };
}

// ── Token convocatoria ─────────────────────────────────────────

async function getToken(servicioId) {
  return { data: await m.getToken(servicioId) };
}

async function upsertToken(servicioId, vigencia_hs) {
  const vence_en = vigencia_hs ? new Date(Date.now() + vigencia_hs * 3600000).toISOString() : null;
  return { data: await m.upsertToken(servicioId, vence_en) };
}

async function patchToken(servicioId, activo) {
  return { data: await m.patchToken(servicioId, activo) };
}

// ── Scoring ────────────────────────────────────────────────────

async function getScoringAgente(agenteId, periodo) {
  const p = periodo || periodoActual();
  const { modulos, penalizaciones } = await m.getScoringAgente(agenteId);
  const prioridad = await calcularPrioridad(agenteId, p);
  return { data: { agente_id: agenteId, periodo: p, prioridad, modulos_por_periodo: modulos, penalizaciones_activas: penalizaciones } };
}

async function getRecursos(servicioId) { return await m.getRecursosServicio(servicioId); }
async function patchRecursoEstado(servicioId, recursoId, body, userId) { return await m.updateRecursoEstado(servicioId, recursoId, body, userId); }

async function getNomina(periodo) {
  const p           = periodo || periodoActual();
  const pesoModulo  = parseInt(await m.getConfigValor('peso_modulo', '100'));
  const ptsAusencia = parseInt(await m.getConfigValor('penalizacion_ausencia_puntos', '25'));
  const agentes     = await m.getNomina(p);

  const conScore = agentes.map(a => {
    const ptsModulos  = a.modulos_periodo * pesoModulo;
    const score       = ptsModulos + a.puntos_penalizacion;

    // Factores que componen el score — extensible a futuro
    const factores = [
      {
        tipo:    'modulos',
        label:   'Módulos trabajados',
        detalle: `${a.modulos_periodo} mód. × ${pesoModulo} pts`,
        puntos:  ptsModulos,
      },
      ...(a.ausencias_periodo > 0 ? [{
        tipo:    'ausencia',
        label:   'Ausencias injustificadas',
        detalle: `${a.ausencias_periodo} aus. × ${ptsAusencia} pts`,
        puntos:  a.ausencias_periodo * ptsAusencia,
      }] : []),
    ];

    return { ...a, score, factores, periodo: p };
  });

  // Ordenar por score ascendente y asignar posición
  conScore.sort((a, b) => a.score - b.score);
  return conScore.map((a, i) => ({ ...a, posicion: i + 1, total_nomina: conScore.length }));
}

module.exports = {
  getConfig, updateConfig,
  getLista, crearServicio,
  getById, updateServicio, avanzarEstado, updateRequerimientos,
  getTurnos, crearTurno, updateTurno, deleteTurno,
  getEstructura, upsertEstructura, patchEstructura, deleteEstructura,
  getPostulantes, importCsvPostulantes, crearPostulante,
  updatePostulanteRol, updatePostulanteTurnos, updatePostulanteTelefono, deletePostulante,
  getConvocatoria, updateConvocatoria,
  getPresentismo, registrarPresentismo,
  updateFlyer, getFlyerData,
  getModulosDia, getToken, upsertToken, patchToken,
  getScoringAgente,
  getRecursos, patchRecursoEstado,
  getNomina,
};
