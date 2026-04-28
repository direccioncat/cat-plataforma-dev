const pool = require('../db/pool');

// ── Helpers internos ──────────────────────────────────────────
function buildUpdate(body, permitidos) {
  const fields = [], params = [];
  for (const c of permitidos) {
    if (body[c] !== undefined) { params.push(body[c]); fields.push(c + ' = $' + params.length); }
  }
  return { fields, params };
}

// ── Config ────────────────────────────────────────────────────
async function getConfig() {
  return (await pool.query('SELECT * FROM sa_scoring_config ORDER BY clave')).rows;
}
async function updateConfig(client, cambios) {
  for (const c of cambios)
    await client.query('UPDATE sa_scoring_config SET valor = $1, updated_at = NOW() WHERE clave = $2', [String(c.valor), c.clave]);
  return (await pool.query('SELECT * FROM sa_scoring_config ORDER BY clave')).rows;
}

// ── Colección ─────────────────────────────────────────────────
async function getLista(estado) {
  const params = [];
  let filtro = '';
  if (estado) { params.push(estado); filtro = ' AND sa.estado = $' + params.length; }
  const sql = "SELECT sa.*, oa.nombre AS os_nombre, oa.evento_motivo AS os_evento_motivo, oa.horario_desde, oa.horario_hasta, oa.dotacion_agentes, oa.dotacion_supervisores, oa.dotacion_motorizados, b.nombre AS base_nombre, p.nombre_completo AS creado_por_nombre, (SELECT COUNT(*) FROM sa_estructura e WHERE e.servicio_id = sa.id) AS total_asignados, (SELECT COUNT(*) FROM sa_convocatoria c JOIN sa_estructura e ON c.estructura_id = e.id WHERE e.servicio_id = sa.id AND c.estado = 'confirmado') AS total_confirmados FROM servicios_adicionales sa LEFT JOIN os_adicional oa ON sa.os_adicional_id = oa.id LEFT JOIN bases b ON oa.base_id = b.id LEFT JOIN profiles p ON sa.creado_por = p.id WHERE 1=1" + filtro + ' ORDER BY sa.created_at DESC';
  return (await pool.query(sql, params)).rows;
}

async function crearServicio(client, { os_adicional_id, observaciones, creado_por, os }) {
  const saRes = await client.query(
    "INSERT INTO servicios_adicionales (os_adicional_id, observaciones, creado_por, estado) VALUES ($1,$2,$3,'pendiente') RETURNING *",
    [os_adicional_id, observaciones || null, creado_por]
  );
  const sa = saRes.rows[0];
  for (const r of [{ rol: 'agente', cantidad: os.dotacion_agentes || 0 }, { rol: 'supervisor', cantidad: os.dotacion_supervisores || 0 }, { rol: 'chofer', cantidad: os.dotacion_motorizados || 0 }].filter(x => x.cantidad > 0))
    await client.query('INSERT INTO sa_requerimientos (servicio_id,rol,cantidad) VALUES ($1,$2,$3)', [sa.id, r.rol, r.cantidad]);
  return sa;
}

// ── Individual ────────────────────────────────────────────────
async function getById(id) {
  const r = await pool.query(`
    SELECT sa.*,
      oa.nombre AS os_nombre, oa.evento_motivo AS os_evento_motivo,
      oa.horario_desde, oa.horario_hasta,
      oa.dotacion_agentes, oa.dotacion_supervisores, oa.dotacion_motorizados,
      b.nombre AS base_nombre,
      p.nombre_completo AS creado_por_nombre,
      COALESCE(json_agg(DISTINCT oaf.fecha ORDER BY oaf.fecha) FILTER (WHERE oaf.fecha IS NOT NULL), '[]') AS fechas_os
    FROM servicios_adicionales sa
    LEFT JOIN os_adicional oa ON sa.os_adicional_id = oa.id
    LEFT JOIN bases b ON oa.base_id = b.id
    LEFT JOIN profiles p ON sa.creado_por = p.id
    LEFT JOIN os_adicional_fechas oaf ON oaf.os_adicional_id = oa.id
    WHERE sa.id = $1
    GROUP BY sa.id, oa.nombre, oa.evento_motivo, oa.horario_desde, oa.horario_hasta,
             oa.dotacion_agentes, oa.dotacion_supervisores, oa.dotacion_motorizados,
             b.nombre, p.nombre_completo
  `, [id]);
  if (!r.rows[0]) return null;
  const reqs = await pool.query('SELECT * FROM sa_requerimientos WHERE servicio_id = $1 ORDER BY rol', [id]);
  return { ...r.rows[0], requerimientos: reqs.rows };
}

async function updateServicio(id, body) {
  const { fields, params } = buildUpdate(body, ['observaciones']);
  if (!fields.length) return null;
  params.push(new Date()); fields.push('updated_at = $' + params.length);
  params.push(id);
  const r = await pool.query('UPDATE servicios_adicionales SET ' + fields.join(', ') + ' WHERE id = $' + params.length + ' RETURNING *', params);
  return r.rows[0] || null;
}

async function avanzarEstado(client, id) {
  const map = { pendiente: 'en_gestion', convocado: 'cerrado', en_curso: 'cerrado' };
  const cur = await client.query('SELECT estado, os_adicional_id FROM servicios_adicionales WHERE id = $1', [id]);
  if (!cur.rows[0]) return { notFound: true };
  const estadoActual = cur.rows[0].estado;
  const sig = map[estadoActual];
  if (!sig) return { badState: true };

  // Bloquear cierre si hay agentes sin presentismo registrado
  if (sig === 'cerrado') {
    const sinPresent = await client.query(`
      SELECT COUNT(*) AS n
      FROM sa_estructura e
      JOIN sa_turnos t ON t.id = e.turno_id
      LEFT JOIN sa_convocatoria c ON c.estructura_id = e.id
      LEFT JOIN sa_presentismo pr ON pr.agente_id = e.agente_id AND pr.turno_id = e.turno_id
      WHERE e.servicio_id = $1
        AND (e.tipo_convocatoria = 'ordinario' OR (e.tipo_convocatoria = 'adicional' AND c.estado = 'confirmado'))
        AND pr.id IS NULL
    `, [id]);
    if (parseInt(sinPresent.rows[0].n) > 0)
      return { presentismoIncompleto: true, faltantes: parseInt(sinPresent.rows[0].n) };
  }

  const r = await client.query(
    'UPDATE servicios_adicionales SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [sig, id]
  );
  if (sig === 'cerrado' && cur.rows[0].os_adicional_id)
    await client.query("UPDATE os_adicional SET estado = 'cumplida', updated_at = NOW() WHERE id = $1", [cur.rows[0].os_adicional_id]);
  return { row: r.rows[0] };
}

async function updateRequerimientos(client, servicioId, requerimientos) {
  await client.query('DELETE FROM sa_requerimientos WHERE servicio_id = $1', [servicioId]);
  for (const r of requerimientos)
    if (r.cantidad > 0) await client.query('INSERT INTO sa_requerimientos (servicio_id,rol,cantidad) VALUES ($1,$2,$3) ON CONFLICT (servicio_id,rol) DO UPDATE SET cantidad = $3', [servicioId, r.rol, r.cantidad]);
  return (await pool.query('SELECT * FROM sa_requerimientos WHERE servicio_id = $1', [servicioId])).rows;
}

// ── Turnos ────────────────────────────────────────────────────
async function getTurnos(servicioId) {
  return (await pool.query("SELECT t.*, (SELECT COUNT(*) FROM sa_estructura e WHERE e.turno_id = t.id) AS total_asignados, (SELECT COUNT(*) FROM sa_convocatoria c JOIN sa_estructura e ON c.estructura_id = e.id WHERE e.turno_id = t.id AND c.estado = 'confirmado') AS total_confirmados FROM sa_turnos t WHERE t.servicio_id = $1 ORDER BY t.fecha, t.hora_inicio", [servicioId])).rows;
}

async function crearTurno(servicioId, data) {
  const { nombre, fecha, hora_inicio, hora_fin, dotacion_agentes, dotacion_supervisores, dotacion_choferes, modulos } = data;
  const ord = await pool.query('SELECT COUNT(*) AS n FROM sa_turnos WHERE servicio_id = $1', [servicioId]);
  return (await pool.query('INSERT INTO sa_turnos (servicio_id,nombre,fecha,hora_inicio,hora_fin,modulos,dotacion_agentes,dotacion_supervisores,dotacion_choferes,orden) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
    [servicioId, nombre || null, fecha, hora_inicio, hora_fin, modulos, dotacion_agentes || 0, dotacion_supervisores || 0, dotacion_choferes || 0, parseInt(ord.rows[0].n)])).rows[0];
}

async function updateTurno(tid, servicioId, body, modulos) {
  const { fields, params } = buildUpdate(body, ['nombre','fecha','hora_inicio','hora_fin','dotacion_agentes','dotacion_supervisores','dotacion_choferes','modulos']);
  if (!fields.length) return null;
  if (modulos !== undefined) { params.push(modulos); fields.push('modulos = $' + params.length); }
  params.push(new Date()); fields.push('updated_at = $' + params.length);
  params.push(tid); params.push(servicioId);
  const r = await pool.query('UPDATE sa_turnos SET ' + fields.join(', ') + ' WHERE id = $' + (params.length - 1) + ' AND servicio_id = $' + params.length + ' RETURNING *', params);
  return r.rows[0] || null;
}

async function deleteTurno(tid, servicioId) {
  await pool.query('DELETE FROM sa_turnos WHERE id = $1 AND servicio_id = $2', [tid, servicioId]);
}

async function getTurnoHoras(tid) {
  return (await pool.query('SELECT hora_inicio, hora_fin FROM sa_turnos WHERE id = $1', [tid])).rows[0] || null;
}

// ── Estructura ────────────────────────────────────────────────
async function getEstructura(servicioId, turnoId) {
  return (await pool.query('SELECT e.*, p.nombre_completo, p.legajo, p.role AS rol_ordinario, b.nombre AS base_nombre, c.estado AS convocatoria_estado, c.id AS convocatoria_id FROM sa_estructura e JOIN profiles p ON e.agente_id = p.id LEFT JOIN bases b ON p.base_id = b.id LEFT JOIN sa_convocatoria c ON c.estructura_id = e.id WHERE e.servicio_id = $1 AND e.turno_id = $2 ORDER BY e.created_at', [servicioId, turnoId])).rows;
}

async function upsertEstructura(client, { servicioId, turnoId, agente_id, rol, jefe_id, origen, tipo }) {
  const e = await client.query(
    'INSERT INTO sa_estructura (servicio_id,turno_id,agente_id,rol,jefe_id,origen,tipo_convocatoria) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (servicio_id,agente_id,turno_id) DO UPDATE SET rol=$4, jefe_id=$5, tipo_convocatoria=$7 RETURNING *',
    [servicioId, turnoId, agente_id, rol, jefe_id || null, origen || 'scoring', tipo]
  );
  if (tipo === 'adicional') await client.query('INSERT INTO sa_convocatoria (estructura_id) VALUES ($1) ON CONFLICT (estructura_id) DO NOTHING', [e.rows[0].id]);
  else await client.query('DELETE FROM sa_convocatoria WHERE estructura_id = $1', [e.rows[0].id]);
  return e.rows[0];
}

async function patchEstructura(nid, body) {
  const { fields, params } = buildUpdate(body, ['jefe_id','rol','tipo_convocatoria']);
  if (!fields.length) return null;
  params.push(nid);
  const r = await pool.query('UPDATE sa_estructura SET ' + fields.join(', ') + ' WHERE id = $' + params.length + ' RETURNING *', params);
  if (!r.rows[0]) return null;
  if (body.tipo_convocatoria === 'ordinario') await pool.query('DELETE FROM sa_convocatoria WHERE estructura_id = $1', [nid]);
  else if (body.tipo_convocatoria === 'adicional') await pool.query('INSERT INTO sa_convocatoria (estructura_id) VALUES ($1) ON CONFLICT (estructura_id) DO NOTHING', [nid]);
  return r.rows[0];
}

async function deleteEstructura(nid) {
  const n = await pool.query('SELECT jefe_id FROM sa_estructura WHERE id = $1', [nid]);
  if (n.rows[0]) await pool.query('UPDATE sa_estructura SET jefe_id = $1 WHERE jefe_id = $2', [n.rows[0].jefe_id, nid]);
  await pool.query('DELETE FROM sa_estructura WHERE id = $1', [nid]);
}

// ── Postulantes ───────────────────────────────────────────────
async function getPostulantes(servicioId, rol) {
  const params = [servicioId];
  let filtroRol = '';
  if (rol) { params.push(rol); filtroRol = ' AND sp.rol_solicitado = $' + params.length; }
  return (await pool.query(`
    SELECT sp.id, sp.agente_id, sp.rol_solicitado, sp.origen, sp.todos_los_turnos, sp.created_at,
      p.nombre_completo, p.legajo, p.role AS rol_ordinario, b.nombre AS base_nombre,
      EXISTS (
        SELECT 1 FROM sa_sanciones
        WHERE agente_id = p.id AND fecha_inicio <= CURRENT_DATE AND fecha_fin >= CURRENT_DATE
      ) AS vetado
    FROM sa_postulantes sp
    JOIN profiles p ON sp.agente_id = p.id
    LEFT JOIN bases b ON p.base_id = b.id
    WHERE sp.servicio_id = $1${filtroRol}
    ORDER BY sp.todos_los_turnos DESC, sp.created_at
  `, params)).rows;
}

async function getPostulanteTurnos(postulante_id) {
  return (await pool.query('SELECT turno_id FROM sa_postulante_turnos WHERE postulante_id = $1', [postulante_id])).rows.map(x => x.turno_id);
}

async function upsertPostulante(client, { servicioId, agente_id, rol_solicitado, origen, todosLos }) {
  return (await client.query("INSERT INTO sa_postulantes (servicio_id,agente_id,rol_solicitado,origen,todos_los_turnos) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (servicio_id,agente_id) DO UPDATE SET rol_solicitado=$3, todos_los_turnos=$5 RETURNING *", [servicioId, agente_id, rol_solicitado, origen, todosLos])).rows[0];
}

async function setPostulanteTurnos(client, postId, turnos_ids) {
  await client.query('DELETE FROM sa_postulante_turnos WHERE postulante_id = $1', [postId]);
  for (const tid of turnos_ids) await client.query('INSERT INTO sa_postulante_turnos (postulante_id,turno_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [postId, tid]);
}

async function updatePostulanteRol(servicioId, pid, rol_solicitado) {
  return (await pool.query('UPDATE sa_postulantes SET rol_solicitado = $1 WHERE id = $2 AND servicio_id = $3 RETURNING *', [rol_solicitado, pid, servicioId])).rows[0] || null;
}

async function updatePostulanteTelefono(servicioId, pid, telefono) {
  return (await pool.query('UPDATE sa_postulantes SET telefono = $1 WHERE id = $2 AND servicio_id = $3 RETURNING id, telefono', [telefono, pid, servicioId])).rows[0] || null;
}

async function deletePostulante(servicioId, pid) {
  await pool.query('DELETE FROM sa_postulantes WHERE id = $1 AND servicio_id = $2', [pid, servicioId]);
}

async function getAgentePorLegajo(legajo) {
  return (await pool.query('SELECT id FROM profiles WHERE legajo = $1 AND activo = true', [legajo])).rows[0] || null;
}

// ── Convocatoria ──────────────────────────────────────────────
async function getConvocatoria(servicioId) {
  return (await pool.query('SELECT c.*, e.rol, e.agente_id, e.jefe_id, e.turno_id, e.tipo_convocatoria, p.nombre_completo, p.legajo, p.email, p.telefono, sp.id AS postulante_id, sp.telefono AS telefono_convocatoria, op.nombre_completo AS confirmado_por_nombre, t.fecha AS turno_fecha, t.hora_inicio AS turno_hora_inicio, t.hora_fin AS turno_hora_fin FROM sa_convocatoria c JOIN sa_estructura e ON c.estructura_id = e.id JOIN profiles p ON e.agente_id = p.id LEFT JOIN sa_postulantes sp ON sp.agente_id = e.agente_id AND sp.servicio_id = e.servicio_id LEFT JOIN sa_turnos t ON e.turno_id = t.id LEFT JOIN profiles op ON c.confirmado_por = op.id WHERE e.servicio_id = $1 ORDER BY t.fecha, t.hora_inicio, e.rol, p.nombre_completo', [servicioId])).rows;
}

async function updateConvocatoria(client, { cid, estado, userId, observaciones, servicioId }) {
  const r = await client.query('UPDATE sa_convocatoria SET estado=$1, confirmado_por=$2, confirmado_at=NOW(), observaciones=$3, updated_at=NOW() WHERE id=$4 RETURNING *', [estado, userId, observaciones || null, cid]);
  if (!r.rows[0]) return null;
  if (estado === 'confirmado') {
    const pendientes = await client.query("SELECT COUNT(*) FROM sa_convocatoria c JOIN sa_estructura e ON c.estructura_id = e.id WHERE e.servicio_id = $1 AND c.estado = 'pendiente'", [servicioId]);
    if (parseInt(pendientes.rows[0].count) === 0)
      await client.query("UPDATE servicios_adicionales SET estado = 'convocado', updated_at = NOW() WHERE id = $1 AND estado = 'en_gestion'", [servicioId]);
  }
  return r.rows[0];
}

// ── Presentismo ───────────────────────────────────────────────
async function getPresentismo(servicioId, turnoId) {
  return (await pool.query("SELECT e.agente_id, e.rol, e.tipo_convocatoria, p.nombre_completo, p.legajo, pr.id AS presentismo_id, pr.presente, pr.ausencia_justificada, pr.modulos_acreditados, t.modulos AS modulos_default FROM sa_estructura e JOIN profiles p ON e.agente_id = p.id JOIN sa_turnos t ON t.id = e.turno_id LEFT JOIN sa_convocatoria c ON c.estructura_id = e.id LEFT JOIN sa_presentismo pr ON pr.agente_id = e.agente_id AND pr.turno_id = e.turno_id WHERE e.servicio_id = $1 AND e.turno_id = $2 AND (e.tipo_convocatoria = 'ordinario' OR (e.tipo_convocatoria = 'adicional' AND c.estado = 'confirmado')) ORDER BY e.tipo_convocatoria DESC, e.rol, p.nombre_completo", [servicioId, turnoId])).rows;
}

// ── Flyer ─────────────────────────────────────────────────────
async function updateFlyer(id, body) {
  const { fields, params } = buildUpdate(body, ['ubicacion','turnos_habilitados','modalidad_contrato','link_postulacion','vigencia_link_hs']);
  if (!fields.length) return null;
  params.push(new Date()); fields.push('updated_at = $' + params.length);
  params.push(id);
  return (await pool.query('UPDATE servicios_adicionales SET ' + fields.join(', ') + ' WHERE id = $' + params.length + ' RETURNING *', params)).rows[0] || null;
}

async function getFlyerData(id) {
  const r = await pool.query("SELECT sa.id, sa.observaciones, sa.ubicacion, sa.turnos_habilitados, sa.modalidad_contrato, sa.link_postulacion, sa.vigencia_link_hs, oa.nombre AS os_nombre, oa.evento_motivo, oa.horario_desde, oa.horario_hasta, oa.dotacion_agentes, oa.dotacion_supervisores, oa.dotacion_motorizados, b.nombre AS base_nombre, COALESCE(json_agg(DISTINCT oaf.fecha ORDER BY oaf.fecha) FILTER (WHERE oaf.fecha IS NOT NULL), '[]') AS fechas FROM servicios_adicionales sa LEFT JOIN os_adicional oa ON sa.os_adicional_id = oa.id LEFT JOIN bases b ON oa.base_id = b.id LEFT JOIN os_adicional_fechas oaf ON oaf.os_adicional_id = oa.id WHERE sa.id = $1 GROUP BY sa.id, oa.nombre, oa.evento_motivo, oa.horario_desde, oa.horario_hasta, oa.dotacion_agentes, oa.dotacion_supervisores, oa.dotacion_motorizados, b.nombre", [id]);
  if (!r.rows[0]) return null;
  const turnos = await pool.query('SELECT id, nombre, fecha, hora_inicio, hora_fin, modulos, dotacion_agentes, dotacion_supervisores, dotacion_choferes FROM sa_turnos WHERE servicio_id = $1 ORDER BY fecha, hora_inicio', [id]);
  return { ...r.rows[0], turnos: turnos.rows };
}

// ── Módulos dia ───────────────────────────────────────────────
async function getModulosDia(fecha) {
  return (await pool.query('SELECT e.agente_id, SUM(t.modulos)::int AS modulos FROM sa_estructura e JOIN sa_turnos t ON e.turno_id = t.id WHERE t.fecha = $1 GROUP BY e.agente_id', [fecha])).rows;
}

// ── Token convocatoria ────────────────────────────────────────
async function getToken(servicioId) {
  return (await pool.query('SELECT * FROM sa_convocatoria_tokens WHERE servicio_id = $1', [servicioId])).rows[0] || null;
}

async function upsertToken(servicioId, vence_en) {
  return (await pool.query("INSERT INTO sa_convocatoria_tokens (servicio_id, token, activo, vence_en) VALUES ($1, gen_random_uuid(), true, $2) ON CONFLICT (servicio_id) DO UPDATE SET token = gen_random_uuid(), activo = true, vence_en = $2, created_at = NOW() RETURNING *", [servicioId, vence_en])).rows[0];
}

async function patchToken(servicioId, activo) {
  return (await pool.query('UPDATE sa_convocatoria_tokens SET activo = $1 WHERE servicio_id = $2 RETURNING *', [activo, servicioId])).rows[0];
}

// ── Scoring ───────────────────────────────────────────────────
async function getScoringAgente(agenteId) {
  const mods = await pool.query('SELECT ma.periodo, SUM(ma.modulos) AS modulos, COUNT(*) AS servicios FROM sa_modulos_agente ma WHERE ma.agente_id = $1 GROUP BY ma.periodo ORDER BY ma.periodo DESC LIMIT 6', [agenteId]);
  const pens = await pool.query('SELECT * FROM sa_penalizaciones WHERE agente_id = $1 AND activa = true ORDER BY created_at DESC', [agenteId]);
  return { modulos: mods.rows, penalizaciones: pens.rows };
}

async function getModulosAgente(agenteId, periodo) {
  return parseInt((await pool.query('SELECT COALESCE(SUM(modulos),0) AS total FROM sa_modulos_agente WHERE agente_id = $1 AND periodo = $2', [agenteId, periodo])).rows[0].total);
}

async function getPenalizacionesAgente(agenteId, periodo) {
  return parseInt((await pool.query('SELECT COALESCE(SUM(puntos),0) AS total FROM sa_penalizaciones WHERE agente_id = $1 AND activa = true AND periodo_inicio <= $2 AND periodo_fin >= $2', [agenteId, periodo])).rows[0].total);
}

async function getPenalizacionCount(agenteId, periodo) {
  return parseInt((await pool.query('SELECT COUNT(*) AS total FROM sa_penalizaciones WHERE agente_id = $1 AND activa = true AND periodo_inicio <= $2 AND periodo_fin >= $2', [agenteId, periodo])).rows[0].total);
}

// Presentismo helpers
async function getConfigValor(clave, defecto) {
  const r = await pool.query("SELECT valor FROM sa_scoring_config WHERE clave = $1", [clave]);
  return r.rows[0] ? r.rows[0].valor : defecto;
}

async function getModulosDiaAgente(agenteId, fecha) {
  return parseInt((await pool.query('SELECT COALESCE(SUM(pr.modulos_acreditados),0) AS total FROM sa_presentismo pr JOIN sa_turnos t ON t.id = pr.turno_id WHERE pr.agente_id = $1 AND t.fecha = $2 AND pr.presente = true', [agenteId, fecha])).rows[0].total);
}

async function upsertPresentismo(client, { servicioId, turnoId, agente_id, presente, ausenciaJustificada, mods, userId }) {
  await client.query('INSERT INTO sa_presentismo (servicio_id,turno_id,agente_id,presente,ausencia_justificada,modulos_acreditados,registrado_por) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (servicio_id,agente_id,turno_id) DO UPDATE SET presente=$4, ausencia_justificada=$5, modulos_acreditados=$6, registrado_por=$7, registrado_at=NOW()', [servicioId, turnoId, agente_id, presente, ausenciaJustificada ?? false, mods, userId]);
}

async function upsertModulosAgente(client, { agente_id, servicioId, periodo, mods }) {
  await client.query('INSERT INTO sa_modulos_agente (agente_id,servicio_id,periodo,modulos) VALUES ($1,$2,$3,$4) ON CONFLICT (agente_id,servicio_id) DO UPDATE SET modulos=$4', [agente_id, servicioId, periodo, mods]);
}

async function insertPenalizacion(client, { agente_id, servicioId, penPts, periodo, periodoFin, userId }) {
  const penEx = await client.query("SELECT id FROM sa_penalizaciones WHERE agente_id=$1 AND servicio_id=$2 AND tipo='ausencia'", [agente_id, servicioId]);
  if (!penEx.rows[0])
    await client.query("INSERT INTO sa_penalizaciones (agente_id,servicio_id,tipo,puntos,periodo_inicio,periodo_fin,creado_por) VALUES ($1,$2,'ausencia',$3,$4,$5,$6)", [agente_id, servicioId, penPts, periodo, periodoFin, userId]);
}

async function getTipoConvocatoria(agente_id, turnoId) {
  return (await pool.query('SELECT tipo_convocatoria FROM sa_estructura WHERE agente_id = $1 AND turno_id = $2', [agente_id, turnoId])).rows[0] || null;
}

// ── Recursos del servicio ─────────────────────────────────────
async function getRecursosServicio(servicioId) {
  // Trae los recursos de la OS adicional vinculada, cruzados con el estado SA
  const { rows } = await pool.query(`
    SELECT r.id, r.tipo, r.cantidad, r.descripcion, r.categoria,
           COALESCE(e.estado, 'pendiente') AS estado,
           e.observacion,
           e.updated_at AS estado_updated_at
    FROM servicios_adicionales sa
    JOIN os_adicional_recursos r ON r.os_adicional_id = sa.os_adicional_id
    LEFT JOIN sa_recursos_estado e ON e.servicio_id = sa.id AND e.recurso_id = r.id
    WHERE sa.id = $1
    ORDER BY r.categoria, r.tipo
  `, [servicioId]);
  return rows;
}

async function updateRecursoEstado(servicioId, recursoId, { estado, observacion }, userId) {
  const { rows: [row] } = await pool.query(`
    INSERT INTO sa_recursos_estado (servicio_id, recurso_id, estado, observacion, updated_by, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (servicio_id, recurso_id)
    DO UPDATE SET estado = $3, observacion = $4, updated_by = $5, updated_at = NOW()
    RETURNING *
  `, [servicioId, recursoId, estado, observacion ?? null, userId ?? null]);
  return row;
}

async function getNomina(periodo) {
  const rows = await pool.query(`
    SELECT
      p.id,
      p.nombre_completo,
      p.legajo,
      p.role,
      b.nombre AS base_nombre,
      COALESCE((
        SELECT SUM(modulos) FROM sa_modulos_agente
        WHERE agente_id = p.id AND periodo = $1
      ), 0)::int AS modulos_periodo,
      COALESCE((
        SELECT SUM(puntos) FROM sa_penalizaciones
        WHERE agente_id = p.id AND activa = true
          AND periodo_inicio <= $1 AND periodo_fin >= $1
      ), 0)::int AS puntos_penalizacion,
      (
        SELECT COUNT(*) FROM sa_penalizaciones
        WHERE agente_id = p.id AND tipo = 'ausencia' AND activa = true
          AND periodo_inicio <= $1 AND periodo_fin >= $1
      )::int AS ausencias_periodo,
      (
        SELECT COUNT(DISTINCT servicio_id) FROM sa_estructura WHERE agente_id = p.id
      )::int AS servicios_total,
      EXISTS (
        SELECT 1 FROM sa_sanciones
        WHERE agente_id = p.id
          AND fecha_inicio <= CURRENT_DATE AND fecha_fin >= CURRENT_DATE
      ) AS vetado
    FROM profiles p
    LEFT JOIN bases b ON p.base_id = b.id
    WHERE p.activo = true
      AND p.role IN ('agente', 'supervisor', 'chofer', 'coordinador', 'jefe_base')
    ORDER BY p.nombre_completo
  `, [periodo]);
  return rows.rows;
}

module.exports = {
  getConfig, updateConfig, getLista, crearServicio, getById, updateServicio, avanzarEstado, updateRequerimientos,
  getTurnos, crearTurno, updateTurno, deleteTurno, getTurnoHoras,
  getEstructura, upsertEstructura, patchEstructura, deleteEstructura,
  getPostulantes, getPostulanteTurnos, upsertPostulante, setPostulanteTurnos, updatePostulanteRol, updatePostulanteTelefono, deletePostulante, getAgentePorLegajo,
  getConvocatoria, updateConvocatoria,
  getPresentismo, updateFlyer, getFlyerData, getModulosDia, getToken, upsertToken, patchToken,
  getScoringAgente, getModulosAgente, getPenalizacionesAgente, getPenalizacionCount,
  getConfigValor, getModulosDiaAgente, upsertPresentismo, upsertModulosAgente, insertPenalizacion, getTipoConvocatoria,
  getRecursosServicio, updateRecursoEstado,
  getNomina,
};
