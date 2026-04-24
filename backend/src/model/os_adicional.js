const pool = require('../db/pool');

// ── OS Adicional ──────────────────────────────────────────────
async function getLista({ esGlobal, base_id }) {
  const { rows } = await pool.query(
    'SELECT oa.*, b.nombre AS base_nombre, p.nombre_completo AS creado_por_nombre,' +
    " COALESCE(json_agg(DISTINCT oaf.fecha ORDER BY oaf.fecha) FILTER (WHERE oaf.fecha IS NOT NULL),'[]') AS fechas," +
    ' COUNT(DISTINCT t.id) AS total_turnos, COUNT(DISTINCT fases.id) AS total_fases, COUNT(DISTINCT el.id) AS total_elementos' +
    ' FROM os_adicional oa LEFT JOIN bases b ON b.id = oa.base_id LEFT JOIN profiles p ON p.id = oa.creado_por' +
    ' LEFT JOIN os_adicional_fechas oaf ON oaf.os_adicional_id = oa.id' +
    ' LEFT JOIN os_adicional_turnos t ON t.os_adicional_id = oa.id' +
    ' LEFT JOIN os_adicional_fases fases ON fases.os_adicional_id = oa.id' +
    ' LEFT JOIN os_adicional_elementos el ON el.fase_id = fases.id' +
    (!esGlobal ? ' WHERE oa.base_id = $1' : '') +
    ' GROUP BY oa.id, b.nombre, p.nombre_completo ORDER BY oa.created_at DESC',
    !esGlobal ? [base_id] : []
  );
  return rows;
}

async function getById(id) {
  const { rows: [oa] } = await pool.query(
    'SELECT oa.*, b.nombre AS base_nombre, p.nombre_completo AS creado_por_nombre' +
    ' FROM os_adicional oa LEFT JOIN bases b ON b.id = oa.base_id LEFT JOIN profiles p ON p.id = oa.creado_por WHERE oa.id = $1', [id]
  );
  if (!oa) return null;
  const [fechas, recursos, turnos, fases] = await Promise.all([
    pool.query('SELECT * FROM os_adicional_fechas WHERE os_adicional_id = $1 ORDER BY fecha', [id]),
    pool.query('SELECT * FROM os_adicional_recursos WHERE os_adicional_id = $1 ORDER BY tipo', [id]),
    pool.query('SELECT * FROM os_adicional_turnos WHERE os_adicional_id = $1 ORDER BY fecha NULLS LAST, hora_inicio, orden', [id]),
    pool.query('SELECT * FROM os_adicional_fases WHERE os_adicional_id = $1 ORDER BY orden, created_at', [id]),
  ]);
  const fasesConElementos = await Promise.all(fases.rows.map(async (fase) => {
    const { rows: elementos } = await pool.query('SELECT * FROM os_adicional_elementos WHERE fase_id = $1 ORDER BY created_at', [fase.id]);
    return { ...fase, elementos };
  }));
  return {
    ...oa,
    fechas: fechas.rows,
    recursos: recursos.rows,
    turnos: turnos.rows.map(t => ({ ...t, fases: fasesConElementos.filter(f => f.turno_id === t.id) })),
    fases: fasesConElementos,
    fases_sin_turno: fasesConElementos.filter(f => !f.turno_id),
  };
}

async function crear(client, { nombre, evento_motivo, base, creado_por, horario_desde, horario_hasta, dotacion_agentes, dotacion_supervisores, dotacion_motorizados, observaciones, fechas, recursos }) {
  const { rows: [oa] } = await client.query(
    'INSERT INTO os_adicional (nombre, evento_motivo, base_id, creado_por, horario_desde, horario_hasta, dotacion_agentes, dotacion_supervisores, dotacion_motorizados, observaciones) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
    [nombre, evento_motivo, base, creado_por, horario_desde, horario_hasta, dotacion_agentes || 0, dotacion_supervisores || 0, dotacion_motorizados || 0, observaciones]
  );
  for (const f of fechas) await client.query('INSERT INTO os_adicional_fechas (os_adicional_id, fecha) VALUES ($1,$2)', [oa.id, f]);
  for (const r of recursos) await client.query('INSERT INTO os_adicional_recursos (os_adicional_id, tipo, cantidad, descripcion) VALUES ($1,$2,$3,$4)', [oa.id, r.tipo, r.cantidad, r.descripcion || null]);
  return oa;
}

async function actualizar(id, data) {
  const { nombre, evento_motivo, horario_desde, horario_hasta, dotacion_agentes, dotacion_supervisores, dotacion_motorizados, observaciones } = data;
  const { rows: [oa] } = await pool.query(
    'UPDATE os_adicional SET nombre=COALESCE($1,nombre), evento_motivo=COALESCE($2,evento_motivo), horario_desde=COALESCE($3,horario_desde), horario_hasta=COALESCE($4,horario_hasta), dotacion_agentes=COALESCE($5,dotacion_agentes), dotacion_supervisores=COALESCE($6,dotacion_supervisores), dotacion_motorizados=COALESCE($7,dotacion_motorizados), observaciones=COALESCE($8,observaciones), updated_at=NOW() WHERE id=$9 RETURNING *',
    [nombre, evento_motivo, horario_desde, horario_hasta, dotacion_agentes, dotacion_supervisores, dotacion_motorizados, observaciones, id]
  );
  return oa || null;
}

async function cambiarEstado(id, estado) {
  const { rows: [oa] } = await pool.query('UPDATE os_adicional SET estado=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [estado, id]);
  return oa || null;
}

async function enviarValidacion(client, id) {
  const { rows: [oa] } = await client.query("UPDATE os_adicional SET estado='validacion', updated_at=NOW() WHERE id=$1 AND estado='borrador' RETURNING *", [id]);
  return oa || null;
}

async function validar(client, id, userId) {
  const { rows: [oa] } = await client.query("UPDATE os_adicional SET estado='validada', validado_por=$1, validado_at=NOW(), updated_at=NOW() WHERE id=$2 AND estado='validacion' RETURNING *", [userId, id]);
  return oa || null;
}

async function rechazar(client, id, userId, obs_rechazo) {
  const { rows: [oa] } = await client.query("UPDATE os_adicional SET estado='rechazada', validado_por=$1, validado_at=NOW(), obs_rechazo=$2, updated_at=NOW() WHERE id=$3 AND estado='validacion' RETURNING *", [userId, obs_rechazo || null, id]);
  return oa || null;
}

async function eliminar(id) {
  const check = await pool.query('SELECT id, estado FROM os_adicional WHERE id = $1', [id]);
  if (!check.rows[0]) return { notFound: true };
  if (check.rows[0].estado !== 'borrador') return { badState: true };
  await pool.query('DELETE FROM os_adicional WHERE id = $1', [id]);
  return { ok: true };
}

// ── Servicio adicional (validación) ──────────────────────────
async function crearServicioAdicional(client, { os_adicional_id, userId, oa, calcularModulosSync }) {
  const existe = await client.query('SELECT id FROM servicios_adicionales WHERE os_adicional_id = $1', [os_adicional_id]);
  if (existe.rows[0]) return existe.rows[0];
  const { rows: [sa] } = await client.query('INSERT INTO servicios_adicionales (os_adicional_id, creado_por) VALUES ($1,$2) RETURNING *', [os_adicional_id, userId]);
  const turnosOS = await client.query('SELECT * FROM os_adicional_turnos WHERE os_adicional_id = $1 ORDER BY fecha NULLS LAST, hora_inicio, orden', [os_adicional_id]);
  for (const t of turnosOS.rows) {
    // Conduccion = supervisores + coordinadores + jefes_operativo
    // Choferes   = choferes + choferes_gruas
    const conduccion = (t.dotacion_supervisores || 0) + (t.dotacion_coordinadores || 0) + (t.dotacion_jefes_operativo || 0);
    const choferes   = (t.dotacion_choferes || 0) + (t.dotacion_choferes_gruas || 0);
    await client.query(
      'INSERT INTO sa_turnos (servicio_id, nombre, fecha, hora_inicio, hora_fin, modulos, dotacion_agentes, dotacion_supervisores, dotacion_choferes, dotacion_motorizados, orden) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      [sa.id, t.nombre || null, t.fecha, t.hora_inicio, t.hora_fin, calcularModulosSync(t.hora_inicio, t.hora_fin), t.dotacion_agentes || 0, conduccion, choferes, t.dotacion_motorizados || 0, t.orden]
    );
  }
  if (turnosOS.rows.length === 0) {
    for (const r of [{ rol: 'agente', cantidad: oa.dotacion_agentes || 0 }, { rol: 'supervisor', cantidad: oa.dotacion_supervisores || 0 }, { rol: 'chofer', cantidad: oa.dotacion_motorizados || 0 }].filter(x => x.cantidad > 0)) {
      await client.query('INSERT INTO sa_requerimientos (servicio_id, rol, cantidad) VALUES ($1,$2,$3)', [sa.id, r.rol, r.cantidad]);
    }
  }
  return sa;
}

// ── Actividad ─────────────────────────────────────────────────
async function registrarActividad(client, { base_id, agente_id, tipo, descripcion, metadata }) {
  try {
    await client.query('INSERT INTO actividad (base_id, agente_id, tipo, descripcion, metadata) VALUES ($1,$2,$3,$4,$5)', [base_id, agente_id, tipo, descripcion, JSON.stringify(metadata || {})]);
  } catch (e) { console.warn('Error registrando actividad:', e.message); }
}

// ── Turnos OS ─────────────────────────────────────────────────
async function getTurnos(osId) {
  const { rows } = await pool.query('SELECT t.*, (SELECT COUNT(*) FROM os_adicional_fases f WHERE f.turno_id = t.id) AS total_fases FROM os_adicional_turnos t WHERE t.os_adicional_id = $1 ORDER BY t.fecha NULLS LAST, t.hora_inicio, t.orden', [osId]);
  return rows;
}

async function crearTurno(osId, data) {
  const { nombre, fecha, hora_inicio, hora_fin, dotacion_agentes, dotacion_supervisores, dotacion_optes, dotacion_choferes, dotacion_motorizados, dotacion_choferes_gruas, dotacion_coordinadores } = data;
  const ord = await pool.query('SELECT COUNT(*) AS n FROM os_adicional_turnos WHERE os_adicional_id = $1', [osId]);
  const { rows: [t] } = await pool.query(
    'INSERT INTO os_adicional_turnos (os_adicional_id, nombre, fecha, hora_inicio, hora_fin, dotacion_agentes, dotacion_supervisores, dotacion_choferes, dotacion_motorizados, dotacion_choferes_gruas, dotacion_coordinadores, orden) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
    [osId, nombre || null, fecha || null, hora_inicio || null, hora_fin || null, dotacion_agentes || 0, dotacion_supervisores || 0, dotacion_choferes || 0, dotacion_motorizados || 0, dotacion_choferes_gruas || 0, dotacion_coordinadores || 0, parseInt(ord.rows[0].n)]
  );
  return t;
}

async function actualizarTurno(turnoId, body) {
  const CAMPOS = ['nombre','fecha','hora_inicio','hora_fin','dotacion_agentes','dotacion_supervisores','dotacion_choferes','dotacion_motorizados','dotacion_choferes_gruas','dotacion_coordinadores','orden'];
  const fields = [], params = [];
  for (const c of CAMPOS) { if (body[c] !== undefined) { params.push(body[c]); fields.push(c + ' = $' + params.length); } }
  if (!fields.length) return null;
  params.push(new Date()); fields.push('updated_at = $' + params.length);
  params.push(turnoId);
  const { rows: [t] } = await pool.query('UPDATE os_adicional_turnos SET ' + fields.join(', ') + ' WHERE id = $' + params.length + ' RETURNING *', params);
  return t || null;
}

async function eliminarTurno(turnoId) {
  await pool.query('UPDATE os_adicional_fases SET turno_id = NULL WHERE turno_id = $1', [turnoId]);
  await pool.query('DELETE FROM os_adicional_turnos WHERE id = $1', [turnoId]);
}

// ── Fases ─────────────────────────────────────────────────────
const COLORES_FASE = ['#e24b4a','#f5c800','#4ecdc4','#8b5cf6','#f97316','#22c55e'];

async function crearFase(osId, data) {
  const { nombre, horario_desde, horario_hasta, color, orden, fecha, turno_id } = data;
  const { rows: [count] } = await pool.query('SELECT COUNT(*) FROM os_adicional_fases WHERE os_adicional_id = $1', [osId]);
  const colorAuto = COLORES_FASE[parseInt(count.count) % COLORES_FASE.length];
  const { rows: [fase] } = await pool.query(
    'INSERT INTO os_adicional_fases (os_adicional_id, nombre, horario_desde, horario_hasta, color, orden, fecha, turno_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [osId, nombre, horario_desde || null, horario_hasta || null, color || colorAuto, orden || parseInt(count.count), fecha || null, turno_id || null]
  );
  return fase;
}

async function duplicarFase(client, faseId) {
  const { rows: [original] } = await client.query('SELECT * FROM os_adicional_fases WHERE id = $1', [faseId]);
  if (!original) return null;
  const { rows: elementos } = await client.query('SELECT * FROM os_adicional_elementos WHERE fase_id = $1', [faseId]);
  const { rows: [countRow] } = await client.query('SELECT COUNT(*) FROM os_adicional_fases WHERE os_adicional_id = $1', [original.os_adicional_id]);
  const colorSiguiente = COLORES_FASE[parseInt(countRow.count) % COLORES_FASE.length];
  const { rows: [nuevaFase] } = await client.query(
    'INSERT INTO os_adicional_fases (os_adicional_id, turno_id, nombre, horario_desde, horario_hasta, color, orden, fecha) VALUES ($1,$2,$3,NULL,NULL,$4,$5,$6) RETURNING *',
    [original.os_adicional_id, original.turno_id, original.nombre + ' (copia)', colorSiguiente, parseInt(countRow.count), null]
  );
  for (const el of elementos) {
    let geometria = el.geometria;
    try { const geo = typeof geometria === 'string' ? JSON.parse(geometria) : geometria; if (geo?.style) geo.style.color = colorSiguiente; if (geo?.options) geo.options.color = colorSiguiente; geometria = JSON.stringify(geo); } catch (e) {}
    await client.query('INSERT INTO os_adicional_elementos (fase_id, tipo, nombre, instruccion, geometria) VALUES ($1,$2,$3,$4,$5)', [nuevaFase.id, el.tipo, el.nombre, el.instruccion, geometria]);
  }
  const { rows: elsNuevos } = await pool.query('SELECT * FROM os_adicional_elementos WHERE fase_id = $1', [nuevaFase.id]);
  return { ...nuevaFase, elementos: elsNuevos };
}

async function moverFase(faseId, turno_id) {
  const { rows: [fase] } = await pool.query('UPDATE os_adicional_fases SET turno_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [turno_id || null, faseId]);
  return fase || null;
}

async function actualizarFase(faseId, body) {
  const CAMPOS = ['nombre','horario_desde','horario_hasta','color','orden','fecha','turno_id'];
  const NULABLES = ['fecha','horario_desde','horario_hasta','turno_id'];
  const fields = [], params = [];
  for (const campo of CAMPOS) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      const val = NULABLES.includes(campo) && body[campo] === '' ? null : (body[campo] ?? null);
      params.push(val); fields.push(campo + ' = $' + params.length);
    }
  }
  if (!fields.length) return null;
  params.push(new Date()); fields.push('updated_at = $' + params.length);
  params.push(faseId);
  const { rows: [fase] } = await pool.query('UPDATE os_adicional_fases SET ' + fields.join(', ') + ' WHERE id = $' + params.length + ' RETURNING *', params);
  return fase || null;
}

async function eliminarFase(faseId) { await pool.query('DELETE FROM os_adicional_fases WHERE id = $1', [faseId]); }

// ── Elementos ─────────────────────────────────────────────────
async function crearElemento(faseId, data) {
  const { tipo, nombre, instruccion, geometria } = data;
  const { rows: [el] } = await pool.query('INSERT INTO os_adicional_elementos (fase_id, tipo, nombre, instruccion, geometria) VALUES ($1,$2,$3,$4,$5) RETURNING *', [faseId, tipo, nombre || null, instruccion || null, JSON.stringify(geometria)]);
  return el;
}

async function actualizarElemento(elId, { nombre, instruccion, geometria }) {
  const { rows: [el] } = await pool.query('UPDATE os_adicional_elementos SET nombre=COALESCE($1,nombre), instruccion=COALESCE($2,instruccion), geometria=COALESCE($3,geometria), updated_at=NOW() WHERE id=$4 RETURNING *', [nombre, instruccion, geometria ? JSON.stringify(geometria) : null, elId]);
  return el || null;
}

async function eliminarElemento(elId) { await pool.query('DELETE FROM os_adicional_elementos WHERE id = $1', [elId]); }

// ── Recursos ──────────────────────────────────────────────────
async function sincronizarRecursos(osId, recursos) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM os_adicional_recursos WHERE os_adicional_id = $1', [osId]);
    for (const r of recursos) {
      await client.query(
        'INSERT INTO os_adicional_recursos (os_adicional_id, tipo, cantidad, descripcion, categoria) VALUES ($1,$2,$3,$4,$5)',
        [osId, r.tipo, r.cantidad || 0, r.descripcion || null, r.categoria || 'elemento']
      );
    }
    await client.query('COMMIT');
    const { rows } = await pool.query('SELECT * FROM os_adicional_recursos WHERE os_adicional_id = $1 ORDER BY categoria, tipo', [osId]);
    return rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getLista, getById, crear, actualizar, cambiarEstado, enviarValidacion, validar, rechazar, eliminar, crearServicioAdicional, registrarActividad, getTurnos, crearTurno, actualizarTurno, eliminarTurno, crearFase, duplicarFase, moverFase, actualizarFase, eliminarFase, crearElemento, actualizarElemento, eliminarElemento, sincronizarRecursos };
