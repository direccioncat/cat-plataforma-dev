const svc = require('../service/servicios_adicionales');
const {
  configSchema, crearServicioSchema, updateServicioSchema, requerimientosSchema,
  crearTurnoSchema, updateTurnoSchema,
  estructuraSchema, patchEstructuraSchema,
  postulantesSchema, convocatoriaSchema, presentismoSchema,
  flyerSchema, tokenSchema, patchTokenSchema,
} = require('../service/validaciones/servicios_adicionales');

// ── Config ────────────────────────────────────────────────────

async function getConfig(req, res) {
  try { res.json(await svc.getConfig()); }
  catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

async function updateConfig(req, res) {
  const { error, value } = configSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await svc.updateConfig(value);
    res.json(result.data);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

// ── Colección ─────────────────────────────────────────────────

async function getLista(req, res) {
  try { res.json(await svc.getLista(req.query.estado)); }
  catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

async function crearServicio(req, res) {
  const { error, value } = crearServicioSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await svc.crearServicio({ ...value, userId: req.user.id });
    if (result.error) return res.status(result.status).json({ error: result.error, ...(result.data || {}) });
    res.status(201).json(result.data);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
}

// ── Individual ─────────────────────────────────────────────────

async function getById(req, res) {
  try {
    const result = await svc.getById(req.params.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.data);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

async function updateServicio(req, res) {
  const { error, value } = updateServicioSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await svc.updateServicio(req.params.id, value);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.data);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

async function avanzarEstado(req, res) {
  try {
    const result = await svc.avanzarEstado(req.params.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.data);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

async function updateRequerimientos(req, res) {
  const { error, value } = requerimientosSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await svc.updateRequerimientos(req.params.id, value.requerimientos);
    res.json(result.data);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

// ── Turnos ─────────────────────────────────────────────────────

async function getTurnos(req, res) {
  try { res.json((await svc.getTurnos(req.params.id)).data); }
  catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

async function crearTurno(req, res) {
  const { error, value } = crearTurnoSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await svc.crearTurno(req.params.id, value);
    res.status(201).json(result.data);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
}

async function updateTurno(req, res) {
  const { error, value } = updateTurnoSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await svc.updateTurno(req.params.tid, req.params.id, value);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.data);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
}

async function deleteTurno(req, res) {
  try {
    const result = await svc.deleteTurno(req.params.tid, req.params.id);
    res.json(result.data);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

// ── Estructura ─────────────────────────────────────────────────

async function getEstructura(req, res) {
  try { res.json((await svc.getEstructura(req.params.id, req.params.tid)).data); }
  catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

async function upsertEstructura(req, res) {
  const { error, value } = estructuraSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await svc.upsertEstructura(req.params.id, req.params.tid, value);
    res.status(201).json(result.data);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
}

async function patchEstructura(req, res) {
  const { error, value } = patchEstructuraSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await svc.patchEstructura(req.params.nid, value);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.data);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

async function deleteEstructura(req, res) {
  try { res.json((await svc.deleteEstructura(req.params.nid)).data); }
  catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

// ── Presentismo ────────────────────────────────────────────────

async function getPresentismo(req, res) {
  try { res.json((await svc.getPresentismo(req.params.id, req.params.tid)).data); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
}

async function registrarPresentismo(req, res) {
  const { error, value } = presentismoSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await svc.registrarPresentismo(req.params.id, req.params.tid, value.registros, req.user.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.data);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
}

// ── Postulantes ────────────────────────────────────────────────

async function getPostulantes(req, res) {
  try { res.json((await svc.getPostulantes(req.params.id, req.query.rol)).data); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
}

async function importCsvPostulantes(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Se requiere CSV' });
  try {
    const result = await svc.importCsvPostulantes(req.params.id, req.file.buffer);
    res.json(result.data);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al procesar CSV' }); }
}

async function crearPostulante(req, res) {
  const { error, value } = postulantesSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await svc.crearPostulante(req.params.id, value);
    res.status(201).json(result.data);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

async function updatePostulanteRol(req, res) {
  const { rol_solicitado } = req.body;
  if (!rol_solicitado) return res.status(400).json({ error: 'rol_solicitado es obligatorio' });
  try {
    const result = await svc.updatePostulanteRol(req.params.id, req.params.pid, rol_solicitado);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.data);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

async function updatePostulanteTurnos(req, res) {
  try {
    const result = await svc.updatePostulanteTurnos(req.params.id, req.params.pid, req.body);
    res.json(result.data);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

async function updatePostulanteTelefono(req, res) {
  const { telefono } = req.body;
  if (!telefono || !telefono.trim()) return res.status(400).json({ error: 'Telefono requerido' });
  try {
    const result = await svc.updatePostulanteTelefono(req.params.id, req.params.pid, telefono);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.data);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

async function deletePostulante(req, res) {
  try { res.json((await svc.deletePostulante(req.params.id, req.params.pid)).data); }
  catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

// ── Convocatoria ───────────────────────────────────────────────

async function getConvocatoria(req, res) {
  try { res.json((await svc.getConvocatoria(req.params.id)).data); }
  catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

async function updateConvocatoria(req, res) {
  const { error, value } = convocatoriaSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await svc.updateConvocatoria(req.params.id, req.params.cid, value, req.user.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.data);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

// ── Flyer ──────────────────────────────────────────────────────

async function updateFlyer(req, res) {
  const { error, value } = flyerSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await svc.updateFlyer(req.params.id, value);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.data);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
}

async function getFlyerData(req, res) {
  try {
    const result = await svc.getFlyerData(req.params.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.data);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
}

// ── Módulos día ────────────────────────────────────────────────

async function getModulosDia(req, res) {
  if (!req.query.fecha) return res.status(400).json({ error: 'fecha requerida' });
  try { res.json((await svc.getModulosDia(req.query.fecha)).data); }
  catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

// ── Token convocatoria ─────────────────────────────────────────

async function getToken(req, res) {
  try { res.json((await svc.getToken(req.params.id)).data); }
  catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

async function upsertToken(req, res) {
  const { error, value } = tokenSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await svc.upsertToken(req.params.id, value.vigencia_hs);
    res.json(result.data);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
}

async function patchToken(req, res) {
  const { error, value } = patchTokenSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try { res.json((await svc.patchToken(req.params.id, value.activo)).data); }
  catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

// ── Scoring ────────────────────────────────────────────────────

async function getScoringAgente(req, res) {
  try {
    const result = await svc.getScoringAgente(req.params.agente_id, req.query.periodo);
    res.json(result.data);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
}

module.exports = {
  getConfig, updateConfig,
  getLista, crearServicio,
  getById, updateServicio, avanzarEstado, updateRequerimientos,
  getTurnos, crearTurno, updateTurno, deleteTurno,
  getEstructura, upsertEstructura, patchEstructura, deleteEstructura,
  getPresentismo, registrarPresentismo,
  getPostulantes, importCsvPostulantes, crearPostulante,
  updatePostulanteRol, updatePostulanteTurnos, updatePostulanteTelefono, deletePostulante,
  getConvocatoria, updateConvocatoria,
  updateFlyer, getFlyerData,
  getModulosDia, getToken, upsertToken, patchToken,
  getScoringAgente,
};
