const { listarMisiones, obtenerMision, misionesMias, crearNuevaMision, asignar, aceptar, interrumpir, cerrar } = require('../service/misiones');
const { crearMisionSchema, asignarSchema, interrumpirSchema, cerrarSchema } = require('../service/validaciones/misiones');

async function getMisiones(req, res) {
  try {
    return res.json(await listarMisiones({ user: req.user, query: req.query }));
  } catch (err) { console.error('Error en GET /misiones:', err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

async function getMisionesMias(req, res) {
  try {
    return res.json(await misionesMias(req.user.id));
  } catch (err) { console.error('Error en GET /misiones/mias:', err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

async function getMisionById(req, res) {
  try {
    const mision = await obtenerMision(req.params.id);
    if (!mision) return res.status(404).json({ error: 'Misión no encontrada' });
    return res.json(mision);
  } catch (err) { console.error('Error en GET /misiones/:id:', err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

async function postMision(req, res) {
  const { error, value } = crearMisionSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    return res.status(201).json(await crearNuevaMision({ user: req.user, body: value }));
  } catch (err) { console.error('Error en POST /misiones:', err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

async function postAsignar(req, res) {
  const { error, value } = asignarSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    await asignar({ misionId: req.params.id, ...value, user: req.user });
    return res.json({ ok: true });
  } catch (err) { console.error('Error en /asignar:', err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

async function postAceptar(req, res) {
  try {
    const result = await aceptar({ misionId: req.params.id, user: req.user });
    if (result?.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true });
  } catch (err) { console.error('Error en /aceptar:', err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

async function postInterrumpir(req, res) {
  const { error, value } = interrumpirSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    await interrumpir({ misionId: req.params.id, user: req.user, motivo: value.motivo });
    return res.json({ ok: true });
  } catch (err) { console.error('Error en /interrumpir:', err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

async function postCerrar(req, res) {
  const { error, value } = cerrarSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    await cerrar({ misionId: req.params.id, user: req.user, observaciones: value.observaciones });
    return res.json({ ok: true });
  } catch (err) { console.error('Error en /cerrar:', err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

module.exports = { getMisiones, getMisionesMias, getMisionById, postMision, postAsignar, postAceptar, postInterrumpir, postCerrar };
