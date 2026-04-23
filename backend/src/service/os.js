const https = require('https');
const pool = require('../db/pool');
const { getOsLista, crearOs, getOsById, getOsResumenItems, updateOsCamunda, updateOsEstado, deleteOs, updateOsItemComuna, updateOsItem, deleteOsItem, getOsItem, setOsItemTurnos, crearOsItem, setOsFechas, setItemFechas, generarMisionesHoy, updateOsItemComunaDirecto } = require('../model/os');
const { COMUNAS_CABA } = require('./validaciones/os');

function usigDatosUtiles({ lat, lng, calle, altura, calle2 }) {
  return new Promise((resolve) => {
    let url;
    if (lat && lng) url = `https://ws.usig.buenosaires.gob.ar/datos_utiles?x=${lng}&y=${lat}`;
    else if (calle && altura) url = `https://ws.usig.buenosaires.gob.ar/datos_utiles?calle=${encodeURIComponent(calle)}&altura=${encodeURIComponent(altura)}`;
    else if (calle && calle2)  url = `https://ws.usig.buenosaires.gob.ar/datos_utiles?calle=${encodeURIComponent(calle + ' y ' + calle2)}`;
    else return resolve(null);
    const req = https.get(url, { timeout: 4000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { const obj = Array.isArray(JSON.parse(data)) ? JSON.parse(data)[0] : JSON.parse(data); resolve(obj?.comuna ? { comuna: obj.comuna, barrio: obj.barrio || null } : null); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function calcularStats(items) {
  const porTurno = {}, porComuna = {}, porEjePSV = {};
  let totalAgentes = 0, sinUbicacion = 0, sinComuna = 0, sinEjePSV = 0, sinAgentes = 0;
  const comunasSet = new Set();
  for (const it of items) {
    const turnos = it.turnos || [];
    if (it.tipo === 'servicio') {
      if (turnos.length === 0) { const t = it.turno || 'sin_turno'; if (!porTurno[t]) porTurno[t] = { servicios: 0, misiones: 0, agentes: 0 }; porTurno[t].servicios++; sinAgentes++; }
      else { turnos.forEach(e => { const t = e.turno || 'sin_turno'; const ag = e.cantidad_agentes || 0; if (!porTurno[t]) porTurno[t] = { servicios: 0, misiones: 0, agentes: 0 }; porTurno[t].servicios++; porTurno[t].agentes += ag; totalAgentes += ag; }); if (turnos.reduce((s, e) => s + (e.cantidad_agentes || 0), 0) === 0) sinAgentes++; }
    } else { const t = (turnos[0]?.turno) || it.turno || 'sin_turno'; if (!porTurno[t]) porTurno[t] = { servicios: 0, misiones: 0, agentes: 0 }; porTurno[t].misiones++; }
    const com = it.comuna || null;
    if (com) { comunasSet.add(com); if (!porComuna[com]) porComuna[com] = { servicios: 0, misiones: 0, agentes: 0, barrio: it.barrio }; if (it.tipo === 'servicio') { porComuna[com].servicios++; porComuna[com].agentes += turnos.reduce((acc, e) => acc + (e.cantidad_agentes || 0), 0); } else porComuna[com].misiones++; } else sinComuna++;
    const eje = it.eje_psv || null;
    if (eje) { if (!porEjePSV[eje]) porEjePSV[eje] = { servicios: 0, misiones: 0 }; if (it.tipo === 'servicio') porEjePSV[eje].servicios++; else porEjePSV[eje].misiones++; } else sinEjePSV++;
    if (!it.lat && !it.lng && !it.calle) sinUbicacion++;
  }
  return {
    totales: { items: items.length, servicios: items.filter(i => i.tipo === 'servicio').length, misiones: items.filter(i => i.tipo === 'mision').length, agentes: totalAgentes, comunas: comunasSet.size },
    alertas: { sin_ubicacion: sinUbicacion, sin_comuna: sinComuna, sin_eje_psv: sinEjePSV, sin_agentes: sinAgentes },
    por_turno: porTurno, por_comuna: porComuna, por_eje_psv: porEjePSV,
  };
}

async function listarOs({ user, query }) {
  let baseId = !['gerencia', 'admin', 'director'].includes(user.role) ? user.base_id : (query.base_id || null);
  return await getOsLista({ baseId, estado: query.estado });
}

async function obtenerOs(id) { return await getOsById(id); }

async function obtenerResumen(osId) {
  const data = await getOsResumenItems(osId);
  if (!data) return null;
  const resoluciones = await Promise.all(data.items.map(async (item) => {
    if (item.comuna) return { id: item.id, comuna: item.comuna, barrio: item.barrio };
    const resultado = await usigDatosUtiles({ lat: item.lat, lng: item.lng, calle: item.calle, altura: item.altura, calle2: item.calle2 });
    if (resultado) updateOsItemComunaDirecto(item.id, resultado);
    return { id: item.id, ...resultado };
  }));
  const resMap = Object.fromEntries(resoluciones.map(r => [r.id, r]));
  const itemsEnriquecidos = data.items.map(item => ({ ...item, comuna: resMap[item.id]?.comuna || item.comuna || null, barrio: resMap[item.id]?.barrio || item.barrio || null }));
  return { os: data.os, stats: calcularStats(itemsEnriquecidos), items: itemsEnriquecidos, comunas_disponibles: COMUNAS_CABA };
}

async function crearNuevaOs({ user, body }) {
  return await crearOs({ base_id: body.base_id || user.base_id, titulo: body.titulo, tipo: body.tipo || 'ordinaria', semana_inicio: body.semana_inicio, semana_fin: body.semana_fin, creado_por: user.id });
}

async function actualizarOs(id, body) { return await updateOsCamunda(id, body); }
async function enviarValidacion(id) { return await updateOsEstado(id, 'borrador', 'validacion'); }
async function publicarOs(id) { return await updateOsEstado(id, 'validacion', 'vigente'); }
async function cerrarOs(id) { return await updateOsEstado(id, 'vigente', 'cumplida'); }
async function eliminarOs(id) { return await deleteOs(id); }

async function actualizarComuna(id, body) { return await updateOsItemComuna(id, body); }

async function actualizarItem(id, body) {
  const CAMPOS = ['descripcion','turno','modo_ubicacion','calle','altura','calle2','desde','hasta','poligono_desc','poligono_coords','eje_psv','relevo_tipo','relevo_base_id','relevo_turno','lat','lng','place_id','cantidad_agentes','instrucciones'];
  const CAMPOS_UBICACION = new Set(['modo_ubicacion','calle','altura','calle2','desde','hasta','lat','lng','place_id','poligono_coords']);
  const fields = [], params = [];
  let cambioUbicacion = false;
  for (const campo of CAMPOS) {
    if (body[campo] !== undefined) {
      params.push(campo === 'cantidad_agentes' ? JSON.stringify(body[campo]) : body[campo]);
      fields.push(`${campo} = $${params.length}`);
      if (CAMPOS_UBICACION.has(campo)) cambioUbicacion = true;
    }
  }
  if (!fields.length) return null;
  // Si cambió la ubicación, invalidar la comuna para que el Resumen la recalcule vía USIG
  if (cambioUbicacion) {
    params.push(null); fields.push(`comuna = $${params.length}`);
    params.push(null); fields.push(`barrio = $${params.length}`);
  }
  params.push(new Date()); fields.push(`updated_at = $${params.length}`);
  params.push(id);
  return await updateOsItem(id, fields, params);
}

async function obtenerItem(id) { return await getOsItem(id); }
async function eliminarItem(id) { await deleteOsItem(id); }

async function guardarTurnosItem(itemId, { turnos, relevos }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await setOsItemTurnos(client, itemId, turnos, relevos);
    await client.query('COMMIT');
    return result;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

async function crearItem(osId, body) { return await crearOsItem(osId, body); }
async function guardarFechas(osId, fechas) { return await setOsFechas(osId, fechas); }

async function guardarFechasItem(itemId, fechas) {
  return await setItemFechas(itemId, fechas);
}

async function generarMisiones(osId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await generarMisionesHoy(client, osId);
    await client.query('COMMIT');
    return result;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

module.exports = { listarOs, obtenerOs, obtenerResumen, crearNuevaOs, actualizarOs, enviarValidacion, publicarOs, cerrarOs, eliminarOs, actualizarComuna, actualizarItem, obtenerItem, eliminarItem, guardarTurnosItem, crearItem, guardarFechas, guardarFechasItem, generarMisiones };
