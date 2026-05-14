const { listarBases } = require('../service/bases');

async function getBases(req, res) {
  try {
    const bases = await listarBases();
    return res.json(bases);
  } catch (err) {
    console.error('Error en GET /bases:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { getBases };
