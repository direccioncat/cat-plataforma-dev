const pool = require('../db/pool');

// ── OS colección ──────────────────────────────────────────────
async function getOsLista({ baseId, estado }) {
  const params = [];
  let bf1 = '', bf2 = '', ef1 = '', ef2 = '';
  if (baseId)  { params.push(baseId);  const n = params.length; bf1 = ' AND os.base_id = $' + n; bf2 = ' AND oa.base_id = $' + n; }
  if (estado)  { params.push(estado);  const n = params.length; ef1 = ' AND os.estado = $' + n;  ef2 = ' AND oa.estado = $' + n; }

  const query =
    'SELECT os.id, os.titulo, os.tipo, os.estado, os.base_id,' +
    ' os.numero, os.semana_inicio, os.semana_fin, os.creado_por, os.created_at, os.updated_at,' +
    ' b.nombre as base_nombre, p.nombre_completo as creado_por_nombre' +
    ' FROM ordenes_servicio os LEFT JOIN bases b ON os.base_id = b.id LEFT JOIN profiles p ON os.creado_por = p.id' +
    ' WHERE 1=1' + bf1 + ef1 +
    ' UNION ALL' +
    " SELECT oa.id, oa.nombre as titulo, 'adicional' as tipo, oa.estado, oa.base_id," +
    ' NULL::integer as numero, NULL::date as semana_inicio, NULL::date as semana_fin,' +
    ' oa.creado_por, oa.created_at, oa.updated_at,' +
    ' b.nombre as base_nombre, p.nombre_completo as creado_por_nombre' +
    ' FROM os_adicional oa LEFT JOIN bases b ON oa.base_id = b.id LEFT JOIN profiles p ON oa.creado_por = p.id' +
    ' WHERE 1=1' + bf2 + ef2 +
    ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  const rows = result.rows;

  const idsOrdinarias  = rows.filter(r => r.tipo !== 'adicional').map(r => r.id);
  const idsAdicionales = rows.filter(r => r.tipo === 'adicional').map(r => r.id);
  const fechasMap = {};

  if (idsOrdinarias.length > 0) {
    const fRes = await pool.query('SELECT os_id, fecha FROM os_fechas WHERE os_id = ANY($1) ORDER BY fecha', [idsOrdinarias]);
    fRes.rows.forEach(f => {
      if (!fechasMap[f.os_id]) fechasMap[f.os_id] = [];
      fechasMap[f.os_id].push(f.fecha.toISOString().slice(0, 10));
    });
  }
  if (idsAdicionales.length > 0) {
    const fRes = await pool.query('SELECT os_adicional_id, fecha FROM os_adicional_fechas WHERE os_adicional_id = ANY($1) ORDER BY fecha', [idsAdicionales]);
    fRes.rows.forEach(f => {
      if (!fechasMap[f.os_adicional_id]) fechasMap[f.os_adicional_id] = [];
      fechasMap[f.os_adicional_id].push(f.fecha.toISOString().slice(0, 10));
    });
  }

  return rows.map(os => ({ ...os, fechas: fechasMap[os.id] || [] }));
}

async function crearOs({ base_id, titulo, tipo, semana_inicio, semana_fin, creado_por }) {
  const result = await pool.query(
    `INSERT INTO ordenes_servicio (base_id, titulo, tipo, semana_inicio, semana_fin, creado_por) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [base_id, titulo, tipo, semana_inicio || null, semana_fin || null, creado_por]
  );
  return result.rows[0];
}

// ── OS individual ─────────────────────────────────────────────
async function getOsById(id) {
  const os = await pool.query(
    `SELECT os.*, b.nombre as base_nombre, p.nombre_completo as creado_por_nombre
     FROM ordenes_servicio os LEFT JOIN bases b ON os.base_id = b.id LEFT JOIN profiles p ON os.creado_por = p.id
     WHERE os.id = $1`, [id]
  );
  if (!os.rows[0]) return null;

  const [items, fechas] = await Promise.all([
    pool.query(`SELECT oi.*, b.nombre as relevo_base_nombre FROM os_items oi LEFT JOIN bases b ON oi.relevo_base_id = b.id WHERE oi.os_id = $1 ORDER BY oi.orden, oi.created_at`, [id]),
    pool.query(`SELECT fecha FROM os_fechas WHERE os_id = $1 ORDER BY fecha`, [id]),
  ]);

  const itemIds = items.rows.map(i => i.id);
  let turnosMap = {}, relevosMap = {}, fechasItemMap = {};
  if (itemIds.length > 0) {
    const [tRes, rRes, fRes] = await Promise.all([
      pool.query(`SELECT t.*, b.nombre as base_nombre FROM os_item_turnos t LEFT JOIN bases b ON t.base_id = b.id WHERE t.os_item_id = ANY($1) ORDER BY t.orden`, [itemIds]),
      pool.query(`SELECT * FROM os_item_relevos WHERE os_item_id = ANY($1) ORDER BY orden`, [itemIds]),
      pool.query(`SELECT os_item_id, fecha FROM os_item_fechas WHERE os_item_id = ANY($1) ORDER BY fecha`, [itemIds]),
    ]);
    tRes.rows.forEach(t => { if (!turnosMap[t.os_item_id]) turnosMap[t.os_item_id] = []; turnosMap[t.os_item_id].push(t); });
    rRes.rows.forEach(r => { if (!relevosMap[r.os_item_id]) relevosMap[r.os_item_id] = []; relevosMap[r.os_item_id].push(r); });
    fRes.rows.forEach(f => { if (!fechasItemMap[f.os_item_id]) fechasItemMap[f.os_item_id] = []; fechasItemMap[f.os_item_id].push(f.fecha.toISOString().slice(0, 10)); });
  }

  return {
    ...os.rows[0],
    items: items.rows.map(i => ({
      ...i,
      turnos:  turnosMap[i.id]     || [],
      relevos: relevosMap[i.id]    || [],
      fechas:  fechasItemMap[i.id] || [],
    })),
    fechas: fechas.rows.map(f => f.fecha.toISOString().slice(0, 10)),
  };
}

async function getOsResumenItems(osId) {
  const [osRes, itemsRes] = await Promise.all([
    pool.query(`SELECT os.*, b.nombre as base_nombre FROM ordenes_servicio os LEFT JOIN bases b ON os.base_id = b.id WHERE os.id = $1`, [osId]),
    pool.query(`SELECT oi.* FROM os_items oi WHERE oi.os_id = $1 ORDER BY oi.orden, oi.created_at`, [osId]),
  ]);
  if (!osRes.rows[0]) return null;

  const itemIds = itemsRes.rows.map(i => i.id);
  let turnosMap = {};
  if (itemIds.length > 0) {
    const tRes = await pool.query(`SELECT t.*, b.nombre as base_nombre FROM os_item_turnos t LEFT JOIN bases b ON t.base_id = b.id WHERE t.os_item_id = ANY($1) ORDER BY t.orden`, [itemIds]);
    tRes.rows.forEach(t => { if (!turnosMap[t.os_item_id]) turnosMap[t.os_item_id] = []; turnosMap[t.os_item_id].push(t); });
  }

  return {
    os: osRes.rows[0],
    items: itemsRes.rows.map(it => ({ ...it, turnos: turnosMap[it.id] || [], turno: (turnosMap[it.id]?.[0]?.turno) || it.turno })),
  };
}

async function updateOsCamunda(id, updates) {
  const result = await pool.query(
    `UPDATE ordenes_servicio SET titulo = COALESCE($1, titulo), semana_inicio = COALESCE($2, semana_inicio), semana_fin = COALESCE($3, semana_fin), updated_at = NOW() WHERE id = $4 AND estado = 'borrador' RETURNING *`,
    [updates.titulo || null, updates.semana_inicio || null, updates.semana_fin || null, id]
  );
  return result.rows[0] || null;
}

async function updateOsEstado(id, estadoActual, estadoNuevo) {
  const result = await pool.query(
    `UPDATE ordenes_servicio SET estado = $1, updated_at = NOW() WHERE id = $2 AND estado = $3 RETURNING *`,
    [estadoNuevo, id, estadoActual]
  );
  return result.rows[0] || null;
}

async function deleteOs(id) {
  const result = await pool.query(`DELETE FROM ordenes_servicio WHERE id = $1 AND estado = 'borrador' RETURNING id`, [id]);
  return result.rows[0] || null;
}

async function updateOsItemComuna(id, { comuna, barrio }) {
  const result = await pool.query(
    `UPDATE os_items SET comuna = $1, barrio = $2, updated_at = NOW() WHERE id = $3 RETURNING id, comuna, barrio`,
    [comuna, barrio || null, id]
  );
  return result.rows[0] || null;
}

async function updateOsItem(id, fields, params) {
  const result = await pool.query(`UPDATE os_items SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
  return result.rows[0] || null;
}

async function deleteOsItem(id) {
  await pool.query(`DELETE FROM os_items WHERE id = $1`, [id]);
}

async function getOsItem(id) {
  const item = await pool.query(`SELECT oi.*, b.nombre as relevo_base_nombre FROM os_items oi LEFT JOIN bases b ON oi.relevo_base_id = b.id WHERE oi.id = $1`, [id]);
  if (!item.rows[0]) return null;
  const [turnos, relevos, fechas] = await Promise.all([
    pool.query(`SELECT t.*, b.nombre as base_nombre FROM os_item_turnos t LEFT JOIN bases b ON t.base_id = b.id WHERE t.os_item_id = $1 ORDER BY t.orden`, [id]),
    pool.query(`SELECT * FROM os_item_relevos WHERE os_item_id = $1 ORDER BY orden`, [id]),
    pool.query(`SELECT fecha FROM os_item_fechas WHERE os_item_id = $1 ORDER BY fecha`, [id]),
  ]);
  return {
    ...item.rows[0],
    turnos:  turnos.rows,
    relevos: relevos.rows,
    fechas:  fechas.rows.map(f => f.fecha.toISOString().slice(0, 10)),
  };
}

async function setItemFechas(itemId, fechas) {
  await pool.query(`DELETE FROM os_item_fechas WHERE os_item_id = $1`, [itemId]);
  for (const fecha of fechas) {
    await pool.query(
      `INSERT INTO os_item_fechas (os_item_id, fecha) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [itemId, fecha]
    );
  }
  const result = await pool.query(
    `SELECT fecha FROM os_item_fechas WHERE os_item_id = $1 ORDER BY fecha`, [itemId]
  );
  return result.rows.map(r => r.fecha.toISOString().slice(0, 10));
}

async function setOsItemTurnos(client, itemId, turnos, relevos) {
  await client.query(`DELETE FROM os_item_turnos WHERE os_item_id = $1`, [itemId]);
  await client.query(`DELETE FROM os_item_relevos WHERE os_item_id = $1`, [itemId]);
  for (const t of turnos) {
    await client.query(`INSERT INTO os_item_turnos (os_item_id, orden, turno, base_id, cantidad_agentes) VALUES ($1,$2,$3,$4,$5)`, [itemId, t.orden ?? 0, t.turno, t.base_id || null, t.cantidad_agentes ?? 1]);
  }
  if (Array.isArray(relevos)) {
    for (const r of relevos) {
      await client.query(`INSERT INTO os_item_relevos (os_item_id, orden, tipo) VALUES ($1,$2,$3)`, [itemId, r.orden ?? 0, r.tipo || 'Normal']);
    }
  }
  const [tRes, rRes] = await Promise.all([
    pool.query(`SELECT t.*, b.nombre as base_nombre FROM os_item_turnos t LEFT JOIN bases b ON t.base_id = b.id WHERE t.os_item_id = $1 ORDER BY t.orden`, [itemId]),
    pool.query(`SELECT * FROM os_item_relevos WHERE os_item_id = $1 ORDER BY orden`, [itemId]),
  ]);
  return { turnos: tRes.rows, relevos: rRes.rows };
}

async function crearOsItem(osId, data) {
  const { tipo, descripcion, turno, modo_ubicacion, calle, altura, calle2, desde, hasta, poligono_desc, eje_psv, cantidad_agentes, relevo_tipo, relevo_base_id, relevo_turno, lat, lng, place_id, instrucciones, poligono_coords } = data;
  const os = await pool.query(`SELECT numero FROM ordenes_servicio WHERE id = $1`, [osId]);
  if (!os.rows[0]) return null;
  const osNumero = String(os.rows[0].numero || 0).padStart(3, '0');
  const conteo   = await pool.query(`SELECT COUNT(*) FROM os_items WHERE os_id = $1 AND tipo = $2`, [osId, tipo]);
  const codigo   = `${tipo === 'servicio' ? 'S' : 'M'}${String(parseInt(conteo.rows[0].count) + 1).padStart(3, '0')}/${osNumero}`;
  const ordenRes = await pool.query(`SELECT COUNT(*) FROM os_items WHERE os_id = $1`, [osId]);
  const result   = await pool.query(
    `INSERT INTO os_items (os_id, tipo, codigo, descripcion, turno, modo_ubicacion, calle, altura, calle2, desde, hasta, poligono_desc, eje_psv, cantidad_agentes, relevo_tipo, relevo_base_id, relevo_turno, lat, lng, place_id, orden, instrucciones, poligono_coords)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
    [osId, tipo, codigo, descripcion, turno || 'manana', modo_ubicacion || 'altura', calle || null, altura || null, calle2 || null, desde || null, hasta || null, poligono_desc || null, eje_psv || null, cantidad_agentes ? JSON.stringify(cantidad_agentes) : '{}', relevo_tipo || null, relevo_base_id || null, relevo_turno || null, lat || null, lng || null, place_id || null, parseInt(ordenRes.rows[0].count), instrucciones || null, poligono_coords ? JSON.stringify(poligono_coords) : null]
  );
  return result.rows[0];
}

async function setOsFechas(osId, fechas) {
  await pool.query(`DELETE FROM os_fechas WHERE os_id = $1`, [osId]);
  for (const fecha of fechas) await pool.query(`INSERT INTO os_fechas (os_id, fecha) VALUES ($1,$2)`, [osId, fecha]);
  return (await pool.query(`SELECT * FROM os_fechas WHERE os_id = $1 ORDER BY fecha`, [osId])).rows;
}

async function generarMisionesHoy(client, osId) {
  const osRes = await client.query(`SELECT * FROM ordenes_servicio WHERE id = $1 AND estado = 'vigente'`, [osId]);
  if (!osRes.rows[0]) return null;
  const os  = osRes.rows[0];
  const hoy = new Date().toISOString().split('T')[0];
  const yaGenerado = await client.query(
    `SELECT COUNT(*) FROM misiones WHERE os_item_id IN (SELECT id FROM os_items WHERE os_id = $1) AND fecha = $2`, [osId, hoy]
  );
  if (parseInt(yaGenerado.rows[0].count) > 0) return { yaExiste: true, count: parseInt(yaGenerado.rows[0].count) };
  const items = await client.query(
    `SELECT oi.*, t.turno as turno_cadena, t.base_id as base_cadena
     FROM os_items oi
     LEFT JOIN os_item_turnos t ON t.os_item_id = oi.id AND t.orden = 0
     WHERE oi.os_id = $1
       AND (
         -- Sin fechas asignadas → aplica todos los días (retrocompatibilidad)
         NOT EXISTS (SELECT 1 FROM os_item_fechas WHERE os_item_id = oi.id)
         OR
         -- Con fechas asignadas → solo si hoy está entre ellas
         EXISTS (SELECT 1 FROM os_item_fechas WHERE os_item_id = oi.id AND fecha = $2)
       )
     ORDER BY oi.orden, oi.created_at`,
    [osId, hoy]
  );
  const ids = [];
  for (const item of items.rows) {
    const baseId = item.base_cadena || os.base_id;
    const turno  = item.turno_cadena || item.turno;
    const m = await client.query(
      `INSERT INTO misiones (os_item_id, base_id, titulo, turno, fecha, tipo, modo_ubicacion, calle, altura, calle2, desde, hasta, poligono_desc, eje_psv, lat, lng) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [item.id, baseId, item.descripcion || 'Sin titulo', turno, hoy, item.tipo, item.modo_ubicacion, item.calle, item.altura, item.calle2, item.desde, item.hasta, item.poligono_desc, item.eje_psv, item.lat, item.lng]
    );
    ids.push(m.rows[0].id);
    if (item.relevo_tipo && item.relevo_base_id && item.relevo_turno) {
      const mr = await client.query(
        `INSERT INTO misiones (os_item_id, base_id, titulo, turno, fecha, tipo, modo_ubicacion, calle, altura, calle2, desde, hasta, poligono_desc, eje_psv, lat, lng) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
        [item.id, item.relevo_base_id, `[Relevo ${item.relevo_tipo}] ${item.descripcion || 'Sin titulo'}`, item.relevo_turno, hoy, item.tipo, item.modo_ubicacion, item.calle, item.altura, item.calle2, item.desde, item.hasta, item.poligono_desc, item.eje_psv, item.lat, item.lng]
      );
      ids.push(mr.rows[0].id);
    }
  }
  return { yaExiste: false, ids, hoy };
}

async function updateOsItemComunaDirecto(id, { comuna, barrio }) {
  await pool.query(`UPDATE os_items SET comuna = $1, barrio = $2 WHERE id = $3`, [comuna, barrio, id]).catch(() => {});
}

module.exports = { getOsLista, crearOs, getOsById, getOsResumenItems, updateOsCamunda, updateOsEstado, deleteOs, updateOsItemComuna, updateOsItem, deleteOsItem, getOsItem, setOsItemTurnos, crearOsItem, setOsFechas, setItemFechas, generarMisionesHoy, updateOsItemComunaDirecto };
