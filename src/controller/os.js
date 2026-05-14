const { listarOs, obtenerOs, obtenerResumen, crearNuevaOs, actualizarOs, enviarValidacion, publicarOs, cerrarOs, eliminarOs, actualizarComuna, actualizarItem, obtenerItem, eliminarItem, guardarTurnosItem, crearItem, guardarFechas, guardarFechasItem, generarMisiones } = require('../service/os');
const { crearOsSchema, actualizarOsSchema, comunaSchema, turnosItemSchema, fechasSchema, crearItemSchema } = require('../service/validaciones/os');

const E500 = (res, err, msg) => { console.error(msg, err); return res.status(500).json({ error: 'Error interno del servidor' }); };

async function getOs(req, res) {
  try { return res.json(await listarOs({ user: req.user, query: req.query })); }
  catch (err) { return E500(res, err, 'Error en GET /os'); }
}

async function getOsById(req, res) {
  try { const os = await obtenerOs(req.params.id); return os ? res.json(os) : res.status(404).json({ error: 'OS no encontrada' }); }
  catch (err) { return E500(res, err, 'Error en GET /os/:id'); }
}

async function getResumen(req, res) {
  try { const r = await obtenerResumen(req.params.id); return r ? res.json(r) : res.status(404).json({ error: 'OS no encontrada' }); }
  catch (err) { return E500(res, err, 'Error en GET /os/:id/resumen'); }
}

async function postOs(req, res) {
  const { error, value } = crearOsSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try { return res.status(201).json(await crearNuevaOs({ user: req.user, body: value })); }
  catch (err) { return E500(res, err, 'Error en POST /os'); }
}

async function putOs(req, res) {
  const { error, value } = actualizarOsSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try { const r = await actualizarOs(req.params.id, value); return r ? res.json(r) : res.status(404).json({ error: 'OS no encontrada o no editable' }); }
  catch (err) { return E500(res, err, 'Error en PUT /os/:id'); }
}

async function postEnviarValidacion(req, res) {
  try { const r = await enviarValidacion(req.params.id); return r ? res.json(r) : res.status(400).json({ error: 'Solo se puede enviar a validación una OS en borrador' }); }
  catch (err) { return E500(res, err, 'Error en /enviar-validacion'); }
}

async function postPublicar(req, res) {
  try { const r = await publicarOs(req.params.id); return r ? res.json(r) : res.status(400).json({ error: 'Solo se puede activar una OS en validación' }); }
  catch (err) { return E500(res, err, 'Error en /publicar'); }
}

async function postCerrar(req, res) {
  try { const r = await cerrarOs(req.params.id); return r ? res.json(r) : res.status(400).json({ error: 'Solo se puede cerrar una OS vigente' }); }
  catch (err) { return E500(res, err, 'Error en /cerrar'); }
}

async function deleteOs(req, res) {
  try { const r = await eliminarOs(req.params.id); return r ? res.json({ ok: true }) : res.status(400).json({ error: 'Solo se puede eliminar una OS en borrador' }); }
  catch (err) { return E500(res, err, 'Error en DELETE /os/:id'); }
}

async function patchComuna(req, res) {
  const { error, value } = comunaSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try { const r = await actualizarComuna(req.params.id, value); return r ? res.json(r) : res.status(404).json({ error: 'Item no encontrado' }); }
  catch (err) { return E500(res, err, 'Error en PATCH /os/items/:id/comuna'); }
}

async function putItem(req, res) {
  try { const r = await actualizarItem(req.params.id, req.body); return r ? res.json(r) : res.status(400).json({ error: 'Sin campos para actualizar' }); }
  catch (err) { return E500(res, err, 'Error en PUT /os/items/:id'); }
}

async function deleteItem(req, res) {
  try { await eliminarItem(req.params.id); return res.json({ ok: true }); }
  catch (err) { return E500(res, err, 'Error en DELETE /os/items/:id'); }
}

async function getItem(req, res) {
  try { const r = await obtenerItem(req.params.id); return r ? res.json(r) : res.status(404).json({ error: 'Item no encontrado' }); }
  catch (err) { return E500(res, err, 'Error en GET /os/items/:id'); }
}

async function postItemTurnos(req, res) {
  const { error, value } = turnosItemSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try { return res.json(await guardarTurnosItem(req.params.id, value)); }
  catch (err) { return E500(res, err, 'Error en POST /os/items/:id/turnos'); }
}

async function putItemFechas(req, res) {
  const { fechas } = req.body;
  if (!Array.isArray(fechas)) return res.status(400).json({ error: 'fechas debe ser un array de fechas (YYYY-MM-DD)' });
  const invalidas = fechas.filter(f => !/^\d{4}-\d{2}-\d{2}$/.test(f));
  if (invalidas.length) return res.status(400).json({ error: `Formato de fecha inválido: ${invalidas.join(', ')}` });
  try {
    const result = await guardarFechasItem(req.params.id, fechas);
    return res.json({ fechas: result });
  } catch (err) { return E500(res, err, 'Error en PUT /os/items/:id/fechas'); }
}

async function postItems(req, res) {
  const { error, value } = crearItemSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try { const r = await crearItem(req.params.id, value); return r ? res.status(201).json(r) : res.status(404).json({ error: 'OS no encontrada' }); }
  catch (err) { return E500(res, err, 'Error en POST /os/:id/items'); }
}

async function postFechas(req, res) {
  const { error, value } = fechasSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try { return res.json(await guardarFechas(req.params.id, value.fechas)); }
  catch (err) { return E500(res, err, 'Error en POST /os/:id/fechas'); }
}

async function postGenerarHoy(req, res) {
  try {
    const r = await generarMisiones(req.params.id);
    if (!r) return res.status(400).json({ error: 'La OS debe estar vigente para generar misiones' });
    if (r.yaExiste) return res.status(409).json({ error: 'Ya se generaron misiones para esta OS hoy', misiones_existentes: r.count });
    return res.json({ ok: true, fecha: r.hoy, misiones_creadas: r.ids.length, ids: r.ids });
  } catch (err) { return E500(res, err, 'Error en /generar-hoy'); }
}

module.exports = { getOs, getOsById, getResumen, postOs, putOs, postEnviarValidacion, postPublicar, postCerrar, deleteOs, patchComuna, putItem, deleteItem, getItem, postItemTurnos, putItemFechas, postItems, postFechas, postGenerarHoy };
