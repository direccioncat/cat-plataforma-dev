const { listarActividad, registrarActividad } = require('../service/actividad');
const { crearActividadSchema } = require('../service/validaciones/actividad');

async function getActividad(req, res) {
  try {
    if (req.user.role === 'agente')
      return res.status(403).json({ error: 'Sin permisos para ver el feed de actividad' });

    const { limite = 50, mision_id, base_id } = req.query;
    const rows = await listarActividad({ user: req.user, limite, mision_id, base_id_query: base_id });
    return res.json(rows);
  } catch (err) {
    console.error('Error en GET /actividad:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function postActividad(req, res) {
  const { error, value } = crearActividadSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const row = await registrarActividad({ user: req.user, ...value });
    return res.status(201).json(row);
  } catch (err) {
    console.error('Error en POST /actividad:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { getActividad, postActividad };
