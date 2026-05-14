const { previewSync, ejecutarSync, resetearDB } = require('../service/syncNomina');

async function previewSyncNomina(req, res) {
  try {
    const data = await previewSync();
    res.json(data);
  } catch (e) {
    console.error('[syncNomina] Preview error:', e.message);
    res.status(500).json({ error: e.message || 'Error al conectar con RR.HH.' });
  }
}

async function ejecutarSyncNomina(req, res) {
  try {
    const result = await ejecutarSync();
    res.json(result);
  } catch (e) {
    console.error('[syncNomina] Sync error:', e.message);
    res.status(500).json({ error: e.message || 'Error durante la sincronización' });
  }
}

async function resetearDBHandler(req, res) {
  try {
    await resetearDB();
    res.json({ ok: true });
  } catch (e) {
    console.error('[syncNomina] Reset error:', e.message);
    res.status(500).json({ error: e.message || 'Error durante el reset' });
  }
}

module.exports = { previewSyncNomina, ejecutarSyncNomina, resetearDBHandler };
