const { PERMISOS_DEF, getTodosLosPermisos, setPermisosRol } = require('../model/permisos');
const { getRoles } = require('../model/roles');

async function getPermisos(req, res) {
  try {
    const [mapa, roles] = await Promise.all([
      getTodosLosPermisos(),
      getRoles(),
    ]);
    // Devuelve roles como objetos completos (key, label, color, bg, descripcion, es_sistema)
    res.json({ permisos_def: PERMISOS_DEF, roles, mapa });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
}

async function putPermisosRol(req, res) {
  const { rol } = req.params;
  const { permisos } = req.body;
  if (rol === 'admin') return res.status(400).json({ error: 'Los permisos de admin no se pueden modificar' });
  if (!Array.isArray(permisos)) return res.status(400).json({ error: 'permisos debe ser un array' });
  try {
    await setPermisosRol(rol, permisos);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(400).json({ error: e.message || 'Error interno' }); }
}

module.exports = { getPermisos, putPermisosRol };
