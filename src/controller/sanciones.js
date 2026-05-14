const { listarSanciones, crearNuevaSancion, actualizarDatosSancion, borrarSancion, checkSancionActiva } = require('../service/sanciones');
const { crearSancionSchema, actualizarSancionSchema } = require('../service/validaciones/sanciones');

async function getSanciones(req, res) {
  try {
    return res.json(await listarSanciones({ activas: req.query.activas, busq: req.query.busq }));
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Error interno' }); }
}

async function postSancion(req, res) {
  const { error, value } = crearSancionSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const sancion = await crearNuevaSancion({ body: value, userId: req.user.id });
    return res.status(201).json(sancion);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error(e); return res.status(500).json({ error: 'Error interno' });
  }
}

async function putSancion(req, res) {
  const { error, value } = actualizarSancionSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const sancion = await actualizarDatosSancion({ id: req.params.id, body: value });
    if (!sancion) return res.status(404).json({ error: 'No encontrado' });
    return res.json(sancion);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Error interno' }); }
}

async function deleteSancion(req, res) {
  try {
    await borrarSancion(req.params.id);
    return res.json({ ok: true });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Error interno' }); }
}

async function checkSancion(req, res) {
  try {
    const sancionado = await checkSancionActiva(req.params.agente_id);
    return res.json({ sancionado });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Error interno' }); }
}

module.exports = { getSanciones, postSancion, putSancion, deleteSancion, checkSancion };
