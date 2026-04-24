const s = require('../service/os_adicional');
const { crearOsAdicionalSchema, estadoSchema, rechazarSchema, ROLES_VALIDAR } = require('../service/validaciones/os_adicional');

const E500 = (res, err, msg) => { console.error(msg, err); return res.status(500).json({ error: 'Error interno' }); };

// ── OS ────────────────────────────────────────────────────────
async function getOs(req, res) {
  try { return res.json(await s.listarOs(req.user)); }
  catch (err) { return E500(res, err, 'GET /os-adicional'); }
}

async function getOsById(req, res) {
  try { const r = await s.obtenerOs(req.params.id); return r ? res.json(r) : res.status(404).json({ error: 'OS adicional no encontrada' }); }
  catch (err) { return E500(res, err, 'GET /os-adicional/:id'); }
}

async function postOs(req, res) {
  const { error, value } = crearOsAdicionalSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try { return res.status(201).json(await s.crearOs({ user: req.user, body: value })); }
  catch (err) { return E500(res, err, 'POST /os-adicional'); }
}

async function putOs(req, res) {
  try { const r = await s.actualizarOs(req.params.id, req.body); return r ? res.json(r) : res.status(404).json({ error: 'No encontrada' }); }
  catch (err) { return E500(res, err, 'PUT /os-adicional/:id'); }
}

async function deleteOs(req, res) {
  try {
    const r = await s.eliminarOs(req.params.id);
    if (r.notFound) return res.status(404).json({ error: 'OS no encontrada' });
    if (r.badState) return res.status(400).json({ error: 'Solo se puede eliminar una OS en borrador' });
    return res.json({ ok: true });
  } catch (err) { return E500(res, err, 'DELETE /os-adicional/:id'); }
}

// ── Estados ───────────────────────────────────────────────────
async function postEnviarValidacion(req, res) {
  try { const r = await s.enviarAValidacion(req.params.id, req.user); return r ? res.json(r) : res.status(400).json({ error: 'Solo se puede enviar a validación una OS en borrador' }); }
  catch (err) { return E500(res, err, 'POST /enviar-validacion'); }
}

async function postValidar(req, res) {
  if (!ROLES_VALIDAR.includes(req.user.role)) return res.status(403).json({ error: 'Sin permiso' });
  try { const r = await s.validarOs(req.params.id, req.user); return r ? res.json(r) : res.status(400).json({ error: 'Solo se puede validar una OS en estado validacion' }); }
  catch (err) { return E500(res, err, 'POST /validar'); }
}

async function postRechazar(req, res) {
  if (!ROLES_VALIDAR.includes(req.user.role)) return res.status(403).json({ error: 'Sin permiso' });
  const { error, value } = rechazarSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try { const r = await s.rechazarOs(req.params.id, req.user, value.obs_rechazo); return r ? res.json(r) : res.status(400).json({ error: 'Solo se puede rechazar una OS en estado validacion' }); }
  catch (err) { return E500(res, err, 'POST /rechazar'); }
}

async function postEstado(req, res) {
  const { error, value } = estadoSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try { const r = await s.cambiarEstado(req.params.id, value.estado); return r ? res.json(r) : res.status(404).json({ error: 'No encontrada' }); }
  catch (err) { return E500(res, err, 'POST /estado'); }
}

// ── Turnos ────────────────────────────────────────────────────
async function getTurnos(req, res) {
  try { return res.json(await s.getTurnos(req.params.id)); }
  catch (err) { return E500(res, err, 'GET /turnos'); }
}

async function postTurno(req, res) {
  try { return res.status(201).json({ ...await s.crearTurno(req.params.id, req.body), fases: [] }); }
  catch (err) { return E500(res, err, 'POST /turnos'); }
}

async function putTurno(req, res) {
  try { const r = await s.actualizarTurno(req.params.turno_id, req.body); return r ? res.json(r) : res.status(400).json({ error: 'Sin campos' }); }
  catch (err) { return E500(res, err, 'PUT /turnos/:turno_id'); }
}

async function deleteTurno(req, res) {
  try { await s.eliminarTurno(req.params.turno_id); return res.json({ ok: true }); }
  catch (err) { return E500(res, err, 'DELETE /turnos/:turno_id'); }
}

// ── Fases ─────────────────────────────────────────────────────
async function postFase(req, res) {
  try { return res.status(201).json({ ...await s.crearFase(req.params.id, req.body), elementos: [] }); }
  catch (err) { return E500(res, err, 'POST /fases'); }
}

async function postDuplicarFase(req, res) {
  try { const r = await s.duplicarFase(req.params.fase_id); return r ? res.status(201).json(r) : res.status(404).json({ error: 'Fase no encontrada' }); }
  catch (err) { return E500(res, err, 'POST /fases/:fase_id/duplicar'); }
}

async function patchMoverFase(req, res) {
  try { const r = await s.moverFase(req.params.fase_id, req.body.turno_id); return r ? res.json(r) : res.status(404).json({ error: 'Fase no encontrada' }); }
  catch (err) { return E500(res, err, 'PATCH /fases/:fase_id/mover'); }
}

async function putFase(req, res) {
  try { const r = await s.actualizarFase(req.params.fase_id, req.body); return r ? res.json(r) : res.status(400).json({ error: 'Sin campos para actualizar' }); }
  catch (err) { return E500(res, err, 'PUT /fases/:fase_id'); }
}

async function deleteFase(req, res) {
  try { await s.eliminarFase(req.params.fase_id); return res.json({ ok: true }); }
  catch (err) { return E500(res, err, 'DELETE /fases/:fase_id'); }
}

// ── Elementos ─────────────────────────────────────────────────
async function postElemento(req, res) {
  try { return res.status(201).json(await s.crearElemento(req.params.fase_id, req.body)); }
  catch (err) { return E500(res, err, 'POST /elementos'); }
}

async function putElemento(req, res) {
  try { const r = await s.actualizarElemento(req.params.el_id, req.body); return r ? res.json(r) : res.status(404).json({ error: 'Elemento no encontrado' }); }
  catch (err) { return E500(res, err, 'PUT /elementos/:el_id'); }
}

async function deleteElemento(req, res) {
  try { await s.eliminarElemento(req.params.el_id); return res.json({ ok: true }); }
  catch (err) { return E500(res, err, 'DELETE /elementos/:el_id'); }
}

// ── Recursos ──────────────────────────────────────────────────
async function putRecursos(req, res) {
  const { recursos } = req.body;
  if (!Array.isArray(recursos)) return res.status(400).json({ error: 'recursos debe ser un array' });
  try {
    const result = await s.guardarRecursos(req.params.id, recursos);
    return res.json(result);
  } catch (err) { return E500(res, err, 'PUT /:id/recursos'); }
}

module.exports = { getOs, getOsById, postOs, putOs, deleteOs, postEnviarValidacion, postValidar, postRechazar, postEstado, getTurnos, postTurno, putTurno, deleteTurno, postFase, postDuplicarFase, patchMoverFase, putFase, deleteFase, postElemento, putElemento, deleteElemento, putRecursos };
