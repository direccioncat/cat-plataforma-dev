const { listarProfiles, obtenerProfile, obtenerEquipo, misionesDeAgente, crearNuevoProfile, actualizarDatosProfile, actualizarTelefonoProfile } = require('../service/profiles');
const { crearProfileSchema, actualizarProfileSchema, telefonoSchema } = require('../service/validaciones/profiles');

async function getProfiles(req, res) {
  try {
    const rows = await listarProfiles({ user: req.user, query: req.query });
    return res.json(rows);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

async function getProfileMe(req, res) {
  try {
    const profile = await obtenerProfile(req.user.id);
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });
    return res.json(profile);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

async function getProfileMias(req, res) {
  try {
    const misiones = await misionesDeAgente(req.user.id);
    return res.json(misiones);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

async function getEquipo(req, res) {
  try {
    const { base, miembros } = await obtenerEquipo({ user: req.user, base_id_query: req.query.base_id });
    if (!base) return res.status(400).json({ error: 'base_id requerido' });
    return res.json({ base, miembros });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

async function getProfileById(req, res) {
  try {
    const profile = await obtenerProfile(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });
    return res.json(profile);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

async function postProfile(req, res) {
  const { error, value } = crearProfileSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const profile = await crearNuevoProfile(value);
    return res.status(201).json(profile);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email o legajo ya existe' });
    console.error(err); return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function putProfile(req, res) {
  const esAdmin = req.user.role === 'admin';
  const esPropio = req.user.id === req.params.id;
  if (!esAdmin && !esPropio) return res.status(403).json({ error: 'Sin permisos' });

  const { error } = actualizarProfileSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const profile = await actualizarDatosProfile({ id: req.params.id, body: req.body, esAdmin });
    if (!profile) return res.status(400).json({ error: 'Sin campos para actualizar' });
    return res.json(profile);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

async function patchTelefono(req, res) {
  const { error, value } = telefonoSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const profile = await actualizarTelefonoProfile(req.params.id, value.telefono);
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });
    return res.json(profile);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Error interno' }); }
}

module.exports = { getProfiles, getProfileMe, getProfileMias, getEquipo, getProfileById, postProfile, putProfile, patchTelefono };
