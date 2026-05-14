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
async function getLista(estado, base_id) {
  const params = [];
  const filtros = [];
  if (estado)   { params.push(estado);   filtros.push('sa.estado = $' + params.length); }
  if (base_id)  { params.push(base_id);  filtros.push('COALESCE(oa.base_id, sa.sa_base_id) = $' + params.length); }
  const where = filtros.length ? ' WHERE ' + filtros.join(' AND ') : '';
  const sql = `
    SELECT sa.*,
      COALESCE(oa.nombre, sa.sa_nombre) AS os_nombre,
      COALESCE(oa.evento_motivo, sa.sa_evento) AS os_evento_motivo,
      COALESCE(oa.horario_desde, sa.sa_horario_desde) AS horario_desde,
      COALESCE(oa.horario_hasta, sa.sa_horario_hasta) AS horario_hasta,
      COALESCE(oa.dotacion_agentes, sa.sa_dotacion_agentes) AS dotacion_agentes,
      COALESCE(oa.dotacion_supervisores, sa.sa_dotacion_supervisores) AS dotacion_supervisores,
      COALESCE(oa.dotacion_motorizados, sa.sa_dotacion_motorizados) AS dotacion_motorizados,
      b.nombre AS base_nombre,
      p.nombre_completo AS creado_por_nombre,
      srv.numero_servicio,
      pr.numero AS presupuesto_numero,
      pr.beneficiario AS presupuesto_beneficiario,
      (SELECT COUNT(*) FROM sa_estructura e WHERE e.servicio_id = sa.id) AS total_asignados,
      (SELECT COUNT(*) FROM sa_convocatoria c JOIN sa_estructura e ON c.estructura_id = e.id WHERE e.servicio_id = sa.id AND c.estado = 'confirmado') AS total_confirmados
    FROM servicios_adicionales sa
    LEFT JOIN os_adicional oa ON sa.os_adicional_id = oa.id
    LEFT JOIN servicios srv ON srv.id = COALESCE(oa.servicio_id, sa.servicio_id)
    LEFT JOIN presupuestos pr ON pr.id = srv.presupuesto_id
    LEFT JOIN bases b ON COALESCE(oa.base_id, sa.sa_base_id) = b.id
    LEFT JOIN profiles p ON sa.creado_por = p.id` + where + ' ORDER BY sa.created_at DESC';
  return (await pool.query(sql, params)).rows;
}

async function crearServicio(client, { os_adicional_id, observaciones, creado_por, os, directo }) {
  let sa;
  if (directo) {
    const r = await client.query(
      `INSERT INTO servicios_adicionales
        (os_adicional_id, sa_nombre, sa_evento, sa_horario_desde, sa_horario_hasta,
         sa_fechas,
         sa_dotacion_agentes, sa_dotacion_supervisores, sa_dotacion_motorizados,
         sa_dotacion_choferes, sa_dotacion_choferes_grua, sa_dotacion_coordinadores,
         numero_externo, creado_por, estado)
       VALUES (NULL,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pendiente') RETURNING *`,
      [directo.nombre, directo.evento || null,
       directo.horario_desde || null, directo.horario_hasta || null,
       directo.fechas?.length ? directo.fechas : null,
       directo.dotacion_agentes || 0, directo.dotacion_supervisores || 0, directo.dotacion_motorizados || 0,
       directo.dotacion_choferes || 0, directo.dotacion_choferes_grua || 0, directo.dotacion_coordinadores || 0,
       directo.numero_externo || null, creado_por]
    );
    sa = r.rows[0];
  } else {
    const r = await client.query(
      "INSERT INTO servicios_adicionales (os_adicional_id, observaciones, creado_por, estado) VALUES ($1,$2,$3,'pendiente') RETURNING *",
      [os_adicional_id, observaciones || null, creado_por]
    );
    sa = r.rows[0];
  }
  const dot = directo || os || {};
  for (const r of [
    { rol: 'infante',       cantidad: dot.dotacion_agentes        || 0 },
    { rol: 'supervisor',    cantidad: dot.dotacion_supervisores   || 0 },
    { rol: 'motorizado',    cantidad: dot.dotacion_motorizados    || 0 },
    { rol: 'chofer',        cantidad: dot.dotacion_choferes       || 0 },
    { rol: 'chofer_grua',   cantidad: dot.dotacion_choferes_grua  || 0 },
    { rol: 'coordinador',   cantidad: dot.dotacion_coordinadores  || 0 },
  ].filter(x => x.cantidad > 0))
    await client.query('INSERT INTO sa_requerimientos (servicio_id,rol,cantidad) VALUES ($1,$2,$3)', [sa.id, r.rol, r.cantidad]);
  return sa;
}

// ── Individual ────────────────────────────────────────────────
async function getById(id) {
  const r = await pool.query(`
    SELECT sa.*,
      COALESCE(oa.nombre, sa.sa_nombre) AS os_nombre,
      COALESCE(oa.evento_motivo, sa.sa_evento) AS os_evento_motivo,
      COALESCE(oa.horario_desde, sa.sa_horario_desde) AS horario_desde,
      COALESCE(oa.horario_hasta, sa.sa_horario_hasta) AS horario_hasta,
      COALESCE(oa.dotacion_agentes, sa.sa_dotacion_agentes) AS dotacion_agentes,
      COALESCE(oa.dotacion_supervisores, sa.sa_dotacion_supervisores) AS dotacion_supervisores,
      COALESCE(oa.dotacion_motorizados, sa.sa_dotacion_motorizados) AS dotacion_motorizados,
      b.nombre AS base_nombre,
      p.nombre_completo AS creado_por_nombre,
      COALESCE(json_agg(DISTINCT oaf.fecha ORDER BY oaf.fecha) FILTER (WHERE oaf.fecha IS NOT NULL), '[]') AS fechas_os,
      srv.id AS servicio_pipeline_id,
      srv.numero_servicio,
      pr.numero AS presupuesto_numero,
      pr.beneficiario AS presupuesto_beneficiario,
      pr.estado AS presupuesto_estado
    FROM servicios_adicionales sa
    LEFT JOIN os_adicional oa ON sa.os_adicional_id = oa.id
    LEFT JOIN servicios srv ON srv.id = COALESCE(oa.servicio_id, sa.servicio_id)
    LEFT JOIN presupuestos pr ON pr.id = srv.presupuesto_id
    LEFT JOIN bases b ON COALESCE(oa.base_id, sa.sa_base_id) = b.id
    LEFT JOIN profiles p ON sa.creado_por = p.id
    LEFT JOIN os_adicional_fechas oaf ON oaf.os_adicional_id = oa.id
    WHERE sa.id = $1
    GROUP BY sa.id, oa.nombre, oa.evento_motivo, oa.horario_desde, oa.horario_hasta,
             oa.dotacion_agentes, oa.dotacion_supervisores, oa.dotacion_motorizados,
             b.nombre, p.nombre_completo,
             srv.id, srv.numero_servicio,
             pr.numero, pr.beneficiario, pr.estado
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
  const map = { pendiente: 'en_gestion', en_gestion: 'convocado', convocado: 'cerrado', en_curso: 'cerrado' };
  const cur = await client.query('SELECT estado, os_adicional_id FROM servicios_adicionales WHERE id = $1', [id]);
  if (!cur.rows[0]) return { notFound: true };
  const estadoActual = cur.rows[0].estado;
  if (estadoActual === 'cancelado') return { badState: true }; // SA cancelado no puede reactivarse
  const sig = map[estadoActual];
  if (!sig) return { badState: true };

  // Para pasar de en_gestion → convocado debe haber al menos un agente confirmado
  if (estadoActual === 'en_gestion') {
    const conf = await client.query(`
      SELECT COUNT(*) AS n FROM sa_convocatoria c
      JOIN sa_estructura e ON c.estructura_id = e.id
      WHERE e.servicio_id = $1 AND c.estado = 'confirmado'
    `, [id]);
    if (parseInt(conf.rows[0].n) === 0) return { sinConfirmados: true };
  }

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

  // Al avanzar a convocado o cerrado, limpiar conflictos_revision (ya fueron revisados)
  const limpiarConflictos = ['convocado', 'cerrado'].includes(sig);
  const r = await client.query(
    `UPDATE servicios_adicionales SET estado = $1, updated_at = NOW()${limpiarConflictos ? ', conflictos_revision = NULL' : ''} WHERE id = $2 RETURNING *`,
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
  const { nombre, fecha, hora_inicio, hora_fin, modulos,
    dotacion_agentes, dotacion_supervisores, dotacion_motorizados,
    dotacion_choferes, dotacion_choferes_grua, dotacion_coordinadores } = data;
  const ord = await pool.query('SELECT COUNT(*) AS n FROM sa_turnos WHERE servicio_id = $1', [servicioId]);
  return (await pool.query(
    `INSERT INTO sa_turnos
      (servicio_id,nombre,fecha,hora_inicio,hora_fin,modulos,orden,
       dotacion_agentes,dotacion_supervisores,dotacion_motorizados,
       dotacion_choferes,dotacion_choferes_grua,dotacion_coordinadores)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [servicioId, nombre || null, fecha, hora_inicio, hora_fin, modulos, parseInt(ord.rows[0].n),
     dotacion_agentes || 0, dotacion_supervisores || 0, dotacion_motorizados || 0,
     dotacion_choferes || 0, dotacion_choferes_grua || 0, dotacion_coordinadores || 0]
  )).rows[0];
}

async function updateTurno(tid, servicioId, body, modulos) {
  const { fields, params } = buildUpdate(body, [
    'nombre','fecha','hora_inicio','hora_fin','modulos',
    'dotacion_agentes','dotacion_supervisores','dotacion_motorizados',
    'dotacion_choferes','dotacion_choferes_grua','dotacion_coordinadores',
  ]);
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

async function getAgentePorCuit(cuit) {
  // Normaliza el CUIT quitando guiones y espacios antes de comparar
  const cuil_norm = String(cuit).replace(/[-\s]/g, '');
  return (await pool.query("SELECT id FROM profiles WHERE replace(replace(cuil, '-', ''), ' ', '') = $1 AND activo = true", [cuil_norm])).rows[0] || null;
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
  const r = await pool.query(`
    SELECT sa.id, sa.observaciones, sa.ubicacion, sa.turnos_habilitados, sa.modalidad_contrato, sa.link_postulacion, sa.vigencia_link_hs, sa.numero_externo,
      COALESCE(oa.nombre, sa.sa_nombre) AS os_nombre,
      COALESCE(oa.evento_motivo, sa.sa_evento) AS evento_motivo,
      COALESCE(oa.horario_desde, sa.sa_horario_desde) AS horario_desde,
      COALESCE(oa.horario_hasta, sa.sa_horario_hasta) AS horario_hasta,
      COALESCE(oa.dotacion_agentes, sa.sa_dotacion_agentes) AS dotacion_agentes,
      COALESCE(oa.dotacion_supervisores, sa.sa_dotacion_supervisores) AS dotacion_supervisores,
      COALESCE(oa.dotacion_motorizados, sa.sa_dotacion_motorizados) AS dotacion_motorizados,
      b.nombre AS base_nombre,
      COALESCE(json_agg(DISTINCT oaf.fecha ORDER BY oaf.fecha) FILTER (WHERE oaf.fecha IS NOT NULL), '[]') AS fechas
    FROM servicios_adicionales sa
    LEFT JOIN os_adicional oa ON sa.os_adicional_id = oa.id
    LEFT JOIN bases b ON COALESCE(oa.base_id, sa.sa_base_id) = b.id
    LEFT JOIN os_adicional_fechas oaf ON oaf.os_adicional_id = oa.id
    WHERE sa.id = $1
    GROUP BY sa.id, oa.nombre, oa.evento_motivo, oa.horario_desde, oa.horario_hasta,
             oa.dotacion_agentes, oa.dotacion_supervisores, oa.dotacion_motorizados, b.nombre
  `, [id]);
  if (!r.rows[0]) return null;
  const turnos = await pool.query('SELECT id, nombre, fecha, hora_inicio, hora_fin, modulos, dotacion_agentes, dotacion_supervisores, dotacion_choferes FROM sa_turnos WHERE servicio_id = $1 ORDER BY fecha, hora_inicio', [id]);
  return { ...r.rows[0], turnos: turnos.rows };
}

// ── Módulos dia ───────────────────────────────────────────────
async function getModulosDia(fecha) {
  return (await pool.query(`
    SELECT e.agente_id, SUM(t.modulos)::int AS modulos
      FROM sa_estructura e
      JOIN sa_turnos t ON e.turno_id = t.id
      JOIN servicios_adicionales sa ON sa.id = t.servicio_id
     WHERE t.fecha = $1
       AND sa.estado != 'cancelado'
     GROUP BY e.agente_id
  `, [fecha])).rows;
}

// ── Token convocatoria ────────────────────────────────────────
async function getToken(servicioId) {
  return (await pool.query('SELECT * FROM sa_convocatoria_tokens WHERE servicio_id = $1', [servicioId])).rows[0] || null;
}

async function tieneRequerimientos(servicioId) {
  const r = await pool.query('SELECT 1 FROM sa_requerimientos WHERE servicio_id = $1 AND cantidad > 0 LIMIT 1', [servicioId]);
  return r.rowCount > 0;
}

async function syncRequerimientosDesdeOrigen(servicioId) {
  // La dotación real del servicio vive en los turnos (sa_turnos), no en
  // columnas summary del padre. Sumamos por rol todos los turnos del servicio.
  const r = await pool.query(`
    SELECT
      COALESCE(SUM(dotacion_agentes),        0)::int AS infante,
      COALESCE(SUM(dotacion_supervisores),   0)::int AS supervisor,
      COALESCE(SUM(dotacion_motorizados),    0)::int AS motorizado,
      COALESCE(SUM(dotacion_choferes),       0)::int AS chofer,
      COALESCE(SUM(dotacion_choferes_grua),  0)::int AS chofer_grua,
      COALESCE(SUM(dotacion_coordinadores),  0)::int AS coordinador
    FROM sa_turnos
    WHERE servicio_id = $1
  `, [servicioId]);
  const fila = r.rows[0] || {};
  const reqs = [
    { rol: 'infante',     cantidad: fila.infante     || 0 },
    { rol: 'supervisor',  cantidad: fila.supervisor  || 0 },
    { rol: 'motorizado',  cantidad: fila.motorizado  || 0 },
    { rol: 'chofer',      cantidad: fila.chofer      || 0 },
    { rol: 'chofer_grua', cantidad: fila.chofer_grua || 0 },
    { rol: 'coordinador', cantidad: fila.coordinador || 0 },
  ].filter(x => x.cantidad > 0);

  await pool.query('DELETE FROM sa_requerimientos WHERE servicio_id = $1', [servicioId]);
  for (const req of reqs)
    await pool.query(
      'INSERT INTO sa_requerimientos (servicio_id, rol, cantidad) VALUES ($1, $2, $3)',
      [servicioId, req.rol, req.cantidad]
    );
  return reqs.length;
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

async function getModulosComprometidos(agenteId, periodo) {
  const r = await pool.query(`
    SELECT COALESCE(SUM(t.modulos), 0) AS total
      FROM sa_estructura e
      JOIN sa_convocatoria c ON c.estructura_id = e.id
      JOIN sa_turnos t       ON t.id = e.turno_id
      JOIN servicios_adicionales sa ON sa.id = e.servicio_id
     WHERE e.agente_id = $1
       AND c.estado IN ('pendiente','confirmado')
       AND sa.estado NOT IN ('cerrado','cancelado')
       AND to_char(t.fecha, 'YYYY-MM') = $2
       AND NOT EXISTS (
         SELECT 1 FROM sa_presentismo pr
         WHERE pr.agente_id = e.agente_id
           AND pr.turno_id  = e.turno_id
       )
  `, [agenteId, periodo]);
  return parseInt(r.rows[0].total);
}

async function getPeriodoDeServicio(servicioId) {
  const r = await pool.query(
    "SELECT to_char(MIN(fecha), 'YYYY-MM') AS periodo FROM sa_turnos WHERE servicio_id = $1",
    [servicioId]
  );
  return r.rows[0]?.periodo || null;
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

async function upsertModulosAgente(client, { agente_id, servicioId, periodo }) {
  // Recalcula el total desde sa_presentismo para ser idempotente ante correcciones de presentismo
  await client.query(`
    INSERT INTO sa_modulos_agente (agente_id, servicio_id, periodo, modulos)
    SELECT $1, $2, $3, COALESCE(SUM(pr.modulos_acreditados), 0)
      FROM sa_presentismo pr
      JOIN sa_turnos t ON t.id = pr.turno_id
     WHERE pr.agente_id = $1
       AND t.servicio_id = $2
       AND pr.presente = true
    ON CONFLICT (agente_id, servicio_id) DO UPDATE SET modulos = EXCLUDED.modulos
  `, [agente_id, servicioId, periodo]);
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

async function getConvocados(servicioId) {
  return (await pool.query(`
    SELECT DISTINCT
      sa.id AS servicio_id,
      COALESCE(oa.nombre, sa.sa_nombre) AS nombre_servicio,
      sa.numero_externo,
      p.nombre_completo,
      p.cuit,
      p.legajo
    FROM sa_estructura e
    JOIN servicios_adicionales sa ON sa.id = e.servicio_id
    LEFT JOIN os_adicional oa ON sa.os_adicional_id = oa.id
    JOIN profiles p ON e.agente_id = p.id
    LEFT JOIN sa_convocatoria c ON c.estructura_id = e.id
    WHERE e.servicio_id = $1
      AND (e.tipo_convocatoria = 'ordinario' OR (e.tipo_convocatoria = 'adicional' AND c.estado = 'confirmado'))
    ORDER BY p.nombre_completo
  `, [servicioId])).rows;
}

// ── Cambios pendientes ────────────────────────────────────────

// Activa el flag si el servicio ya está en un estado avanzado (pasó de pendiente)
async function activarFlagCambios(id) {
  await pool.query(`
    UPDATE servicios_adicionales
    SET tiene_cambios_pendientes = true, updated_at = NOW()
    WHERE id = $1 AND estado NOT IN ('pendiente', 'cerrado')
  `, [id]);
}

// Detecta conflictos entre la dotación definida en turnos y los agentes asignados
async function getConflictos(id) {
  // Conflictos por turno: asignados vs dotación definida
  const { rows: turnos } = await pool.query(`
    SELECT
      t.id, t.nombre, t.fecha, t.hora_inicio, t.hora_fin,
      COALESCE(t.dotacion_agentes,0) + COALESCE(t.dotacion_supervisores,0) +
      COALESCE(t.dotacion_motorizados,0) + COALESCE(t.dotacion_choferes,0) +
      COALESCE(t.dotacion_choferes_grua,0) + COALESCE(t.dotacion_coordinadores,0) AS dotacion_total,
      COUNT(e.id) AS asignados
    FROM sa_turnos t
    LEFT JOIN sa_estructura e ON e.turno_id = t.id
    WHERE t.servicio_id = $1
    GROUP BY t.id
    ORDER BY t.fecha, t.hora_inicio
  `, [id]);

  // Requerimientos vs asignados totales por rol en toda la estructura
  const { rows: reqs } = await pool.query(`
    SELECT r.rol, r.cantidad AS requerido,
           COUNT(e.id) AS asignado
    FROM sa_requerimientos r
    LEFT JOIN sa_estructura e ON e.servicio_id = r.servicio_id AND e.rol = r.rol
    WHERE r.servicio_id = $1
    GROUP BY r.rol, r.cantidad
    ORDER BY r.rol
  `, [id]);

  const conflictos = [];

  for (const t of turnos) {
    const dot = parseInt(t.dotacion_total);
    const asi = parseInt(t.asignados);
    if (asi > dot)
      conflictos.push({ tipo: 'exceso', turno_id: t.id, turno_nombre: t.nombre || t.fecha, detalle: `${asi} asignados, dotación es ${dot}` });
    else if (dot > 0 && asi < dot)
      conflictos.push({ tipo: 'deficit', turno_id: t.id, turno_nombre: t.nombre || t.fecha, detalle: `${asi} de ${dot} cubiertos` });
  }

  for (const r of reqs) {
    const req = parseInt(r.requerido);
    const asi = parseInt(r.asignado);
    if (asi > req)
      conflictos.push({ tipo: 'exceso_rol', rol: r.rol, detalle: `${r.rol}: ${asi} asignados, requerimiento es ${req}` });
  }

  return {
    tiene_conflictos: conflictos.length > 0,
    conflictos,
    turnos: turnos.map(t => ({
      id: t.id,
      nombre: t.nombre,
      fecha: t.fecha,
      hora_inicio: t.hora_inicio,
      hora_fin: t.hora_fin,
      dotacion_total: parseInt(t.dotacion_total),
      asignados: parseInt(t.asignados),
    })),
    requerimientos: reqs.map(r => ({ rol: r.rol, requerido: parseInt(r.requerido), asignado: parseInt(r.asignado) })),
  };
}

async function marcarRevisado(id) {
  const r = await pool.query(
    'UPDATE servicios_adicionales SET conflictos_revision = NULL, updated_at = NOW() WHERE id = $1 RETURNING id',
    [id]
  );
  return r.rows[0] || null;
}

// Vincula un SA huérfano (sin OS ni servicio) a un servicio del pipeline
async function vincularServicio(sa_id, servicio_id) {
  // Verificar que el SA existe y no tiene OS vinculada (evita romper un pipeline existente)
  const saCheck = await pool.query('SELECT id, os_adicional_id FROM servicios_adicionales WHERE id = $1', [sa_id]);
  if (!saCheck.rows[0]) throw Object.assign(new Error('SS.AA. no encontrado'), { status: 404 });
  if (saCheck.rows[0].os_adicional_id) throw Object.assign(new Error('El SS.AA. ya tiene una OS vinculada y no puede re-vincularse'), { status: 409 });

  // Verificar que el servicio existe
  const srvR = await pool.query('SELECT id FROM servicios WHERE id = $1', [servicio_id]);
  if (!srvR.rows[0]) throw Object.assign(new Error('Servicio no encontrado'), { status: 404 });

  // Verificar que no haya ya un SA vinculado a ese servicio (por vínculo directo)
  const dupR = await pool.query(
    'SELECT id FROM servicios_adicionales WHERE servicio_id = $1 AND id != $2 LIMIT 1',
    [servicio_id, sa_id]
  );
  if (dupR.rows[0]) throw Object.assign(new Error('Ya existe otro SS.AA. vinculado a ese servicio'), { status: 409 });

  const { rows: [sa] } = await pool.query(
    'UPDATE servicios_adicionales SET servicio_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [servicio_id, sa_id]
  );
  if (!sa) throw Object.assign(new Error('SS.AA. no encontrado'), { status: 404 });
  return sa;
}

module.exports = {
  getConfig, updateConfig, getLista, crearServicio, getById, updateServicio, avanzarEstado, updateRequerimientos,
  getTurnos, crearTurno, updateTurno, deleteTurno, getTurnoHoras,
  getEstructura, upsertEstructura, patchEstructura, deleteEstructura,
  getPostulantes, getPostulanteTurnos, upsertPostulante, setPostulanteTurnos, updatePostulanteRol, updatePostulanteTelefono, deletePostulante, getAgentePorLegajo, getAgentePorCuit,
  getConvocatoria, updateConvocatoria,
  getPresentismo, updateFlyer, getFlyerData, getModulosDia, getToken, upsertToken, patchToken, tieneRequerimientos, syncRequerimientosDesdeOrigen,
  getScoringAgente, getModulosAgente, getModulosComprometidos, getPeriodoDeServicio, getPenalizacionesAgente, getPenalizacionCount,
  getConfigValor, getModulosDiaAgente, upsertPresentismo, upsertModulosAgente, insertPenalizacion, getTipoConvocatoria,
  getRecursosServicio, updateRecursoEstado,
  getNomina,
  getConvocados,
  activarFlagCambios, getConflictos, marcarRevisado,
  vincularServicio,
};
