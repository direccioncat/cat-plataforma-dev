const { listarProfiles, obtenerProfile, obtenerEquipo, misionesDeAgente, crearNuevoProfile, actualizarDatosProfile, actualizarTelefonoProfile } = require('../service/profiles');
const { getPermisosRol } = require('../model/permisos');
const { getBases, upsertProfileNomina } = require('../model/profiles');
const pool = require('../db/pool');
const { crearProfileSchema, actualizarProfileSchema, telefonoSchema } = require('../service/validaciones/profiles');

async function getNomina(req, res) {
  try {
    const { busq = '', base_id, turno, tipo_contrato, activo } = req.query;
    const params = [];
    const conds = [`p.role = 'agente'`];

    if (activo === 'true')  conds.push('p.activo = true');
    if (activo === 'false') conds.push('p.activo = false');

    if (base_id) { params.push(base_id); conds.push(`p.base_id = $${params.length}`); }
    if (turno)   { params.push(turno);   conds.push(`p.turno = $${params.length}`); }
    if (tipo_contrato) { params.push(tipo_contrato); conds.push(`p.tipo_contrato = $${params.length}`); }
    if (busq.trim()) {
      params.push(`%${busq.toLowerCase().trim()}%`);
      conds.push(`(LOWER(p.nombre_completo) LIKE $${params.length} OR p.legajo LIKE $${params.length})`);
    }

    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const { rows } = await pool.query(`
      SELECT p.id, p.legajo, p.nombre_completo, p.cuit, p.email,
             p.turno, p.tipo_contrato, p.funcion, p.cargo, p.funcion_especifica, p.area,
             p.hora_entrada, p.hora_salida,
             p.telefono, p.telefono_ht,
             p.fecha_nacimiento, p.activo,
             b.nombre AS base_nombre
      FROM profiles p
      LEFT JOIN bases b ON p.base_id = b.id
      ${where}
      ORDER BY p.nombre_completo
    `, params);

    return res.json(rows);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Error interno' }); }
}

async function getProfiles(req, res) {
  try {
    const rows = await listarProfiles({ user: req.user, query: req.query });
    return res.json(rows);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Error interno del servidor' }); }
}

async function getProfileMe(req, res) {
  try {
    const [profile, permisos] = await Promise.all([
      obtenerProfile(req.user.id),
      getPermisosRol(req.user.role),
    ]);
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });
    return res.json({ ...profile, permisos });
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

async function postImportarNomina(req, res) {
  try {
    const { filas } = req.body; // array de objetos ya parseados desde el frontend
    if (!Array.isArray(filas) || filas.length === 0)
      return res.status(400).json({ error: 'Sin datos para importar' });

    // Construir mapa base nombre → id (case insensitive)
    const bases = await getBases();
    const baseMap = {};
    bases.forEach(b => { baseMap[b.nombre.toLowerCase().trim()] = b.id; });

    const resultados = { actualizados: 0, creados: 0, errores: [] };
    const detalle = [];

    for (const fila of filas) {
      try {
        // Mapear base por nombre
        const baseNombre = (fila.base || '').toLowerCase().trim();
        const base_id = baseMap[baseNombre] || null;

        // Valida que un valor sea hora HH:MM — si no, devuelve null (evita error por shift de columnas)
        const horaValida = v => /^\d{1,2}:\d{2}(:\d{2})?$/.test((v || '').trim()) ? v.trim() : null;
        // Valida fecha YYYY-MM-DD
        const fechaValida = v => /^\d{4}-\d{2}-\d{2}$/.test((v || '').trim()) ? v.trim() : null;

        const row = {
          legajo:             fila.legajo?.trim() || null,
          nombre_completo:    [fila.nombre, fila.apellido].filter(Boolean).map(s => s.trim()).join(' ') || null,
          email:              (fila.email_gobierno || fila.email || '').trim().toLowerCase() || null,
          base_id,
          turno:              fila.turno?.trim() || null,
          cuit:               fila.cuit?.trim() || null,
          cargo:              fila.cargo?.trim() || null,
          funcion:            fila.funcion?.trim() || null,
          funcion_especifica: fila.funcion_especifica?.trim() || null,
          tipo_contrato:      fila.tipo_contrato?.trim() || null,
          fecha_nacimiento:   fechaValida(fila.fecha_nacimiento),
          hora_entrada:       horaValida(fila.hora_entrada),
          hora_salida:        horaValida(fila.hora_salida),
          telefono:           fila.telefono?.trim() || null,
          telefono_ht:        fila.telefono_ht?.trim() || null,
        };

        if (!row.cuit && !row.legajo && !row.email) {
          resultados.errores.push({ fila: fila.legajo || fila.cuit || '?', error: 'Sin CUIT, legajo ni email' });
          continue;
        }

        const r = await upsertProfileNomina(row);
        if (r.accion === 'actualizado') resultados.actualizados++;
        else resultados.creados++;
        detalle.push(r);
      } catch (err) {
        resultados.errores.push({ fila: fila.legajo || '?', error: err.message });
      }
    }

    return res.json({ ...resultados, total: filas.length, detalle });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al importar nómina' });
  }
}

async function patchRol(req, res) {
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: 'Rol requerido' });
  if (req.params.id === req.user.id)
    return res.status(400).json({ error: 'No podés cambiar tu propio rol' });
  try {
    // Validar contra la tabla roles en DB (soporta roles custom)
    const { rows } = await pool.query('SELECT key FROM roles WHERE key = $1', [role]);
    if (rows.length === 0) return res.status(400).json({ error: 'Rol inválido' });

    const profile = await actualizarDatosProfile({ id: req.params.id, body: { role }, esAdmin: true });
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });
    return res.json(profile);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Error interno' }); }
}

module.exports = { getProfiles, getNomina, getProfileMe, getProfileMias, getEquipo, getProfileById, postProfile, putProfile, patchTelefono, postImportarNomina, patchRol };
