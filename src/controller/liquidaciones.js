const m = require('../model/liquidaciones');

const E500 = (res, err, ctx) => {
  console.error(`[liquidaciones] ${ctx}:`, err.message);
  return res.status(500).json({ error: 'Error interno' });
};

// GET /api/liquidaciones
async function getLista(req, res) {
  try { res.json(await m.getLista()); }
  catch (err) { E500(res, err, 'getLista'); }
}

// GET /api/liquidaciones/:id
async function getById(req, res) {
  try {
    const liq = await m.getById(req.params.id);
    if (!liq) return res.status(404).json({ error: 'Liquidación no encontrada' });
    res.json(liq);
  } catch (err) { E500(res, err, 'getById'); }
}

// POST /api/liquidaciones/preview
async function preview(req, res) {
  const { fecha_desde, fecha_hasta, valor_uf } = req.body;
  if (!fecha_desde || !fecha_hasta || !valor_uf) {
    return res.status(400).json({ error: 'fecha_desde, fecha_hasta y valor_uf son requeridos' });
  }
  if (Number(valor_uf) <= 0) {
    return res.status(400).json({ error: 'El valor UF debe ser mayor a 0' });
  }
  try {
    const data = await m.preview(fecha_desde, fecha_hasta, Number(valor_uf));
    res.json(data);
  } catch (err) { E500(res, err, 'preview'); }
}

// POST /api/liquidaciones
async function crear(req, res) {
  const { fecha_desde, fecha_hasta, valor_uf, observaciones } = req.body;
  if (!fecha_desde || !fecha_hasta || !valor_uf) {
    return res.status(400).json({ error: 'fecha_desde, fecha_hasta y valor_uf son requeridos' });
  }
  try {
    const liq = await m.crearLiquidacion({
      fecha_desde,
      fecha_hasta,
      valor_uf: Number(valor_uf),
      generado_por: req.user.id,
      observaciones,
    });
    res.status(201).json(liq);
  } catch (err) {
    if (err.message.includes('pendientes') || err.message.includes('CBU')) {
      return res.status(400).json({ error: err.message });
    }
    E500(res, err, 'crear');
  }
}

// GET /api/liquidaciones/valor-uf
async function getUF(req, res) {
  try {
    const [vigente, historial] = await Promise.all([m.getUFVigente(), m.getUFHistorial()]);
    res.json({ vigente, historial });
  } catch (err) { E500(res, err, 'getUF'); }
}

// POST /api/liquidaciones/valor-uf
async function crearUF(req, res) {
  const { valor, vigente_desde } = req.body;
  if (!valor || !vigente_desde) {
    return res.status(400).json({ error: 'valor y vigente_desde son requeridos' });
  }
  if (Number(valor) <= 0) {
    return res.status(400).json({ error: 'El valor debe ser mayor a 0' });
  }
  try {
    const uf = await m.crearUF({ valor: Number(valor), vigente_desde, creado_por: req.user.id });
    res.status(201).json(uf);
  } catch (err) {
    if (err.message.includes('unique') || err.message.includes('duplicate')) {
      return res.status(400).json({ error: 'Ya existe un valor UF para esa fecha' });
    }
    E500(res, err, 'crearUF');
  }
}

module.exports = { getLista, getById, preview, crear, getUF, crearUF };
