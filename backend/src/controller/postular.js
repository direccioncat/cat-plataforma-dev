const { getInfoConvocatoria, registrarPostulacion } = require('../service/postular');
const { postulacionSchema } = require('../service/validaciones/postular');

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

async function getConvocatoria(req, res) {
  try {
    const result = await getInfoConvocatoria(req.params.token);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json(result.data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

async function postPostulacion(req, res) {
  const { error, value } = postulacionSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const result = await registrarPostulacion({
      token: req.params.token,
      legajo: value.legajo,
      rol_solicitado: value.rol_solicitado,
      turno_ids: value.turno_ids,
      todos_los_turnos: value.todos_los_turnos,
      ip: getIp(req),
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(201).json(result.data);
  } catch (e) {
    console.error(`[POSTULACION ERROR] ip=${getIp(req)} token=${req.params.token}`, e.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { getConvocatoria, postPostulacion };
