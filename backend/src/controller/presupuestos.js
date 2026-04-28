const pool = require('../db/pool');

// GET /api/presupuestos
async function getPresupuestos(req, res) {
  try {
    const result = await pool.query(`
      SELECT p.*, pr.nombre_completo AS creado_por_nombre
      FROM presupuestos p
      LEFT JOIN profiles pr ON pr.id = p.creado_por
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[presupuestos] getPresupuestos:', err.message);
    res.status(500).json({ error: 'Error al obtener presupuestos' });
  }
}

// GET /api/presupuestos/:id
async function getPresupuesto(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*, pr.nombre_completo AS creado_por_nombre
      FROM presupuestos p
      LEFT JOIN profiles pr ON pr.id = p.creado_por
      WHERE p.id = $1
    `, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[presupuestos] getPresupuesto:', err.message);
    res.status(500).json({ error: 'Error' });
  }
}

// POST /api/presupuestos
async function postPresupuesto(req, res) {
  const { beneficiario, evento, valor_modulo, validez_dias, items, observaciones } = req.body;
  if (!beneficiario?.trim()) return res.status(400).json({ error: 'El beneficiario es requerido' });
  if (!evento?.trim())       return res.status(400).json({ error: 'El evento es requerido' });

  try {
    const result = await pool.query(`
      INSERT INTO presupuestos (beneficiario, evento, valor_modulo, validez_dias, items, observaciones, creado_por)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
      RETURNING *
    `, [
      beneficiario.trim(),
      evento.trim(),
      valor_modulo || 71249.25,
      validez_dias || 3,
      JSON.stringify(items || []),
      observaciones?.trim() || null,
      req.user.id,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[presupuestos] postPresupuesto:', err.message);
    res.status(500).json({ error: 'Error al crear presupuesto' });
  }
}

// PUT /api/presupuestos/:id
async function putPresupuesto(req, res) {
  const { id } = req.params;
  const { beneficiario, evento, valor_modulo, validez_dias, items, observaciones, estado } = req.body;
  try {
    const result = await pool.query(`
      UPDATE presupuestos SET
        beneficiario  = COALESCE($1, beneficiario),
        evento        = COALESCE($2, evento),
        valor_modulo  = COALESCE($3, valor_modulo),
        validez_dias  = COALESCE($4, validez_dias),
        items         = COALESCE($5::jsonb, items),
        observaciones = COALESCE($6, observaciones),
        estado        = COALESCE($7, estado),
        updated_at    = NOW()
      WHERE id = $8
      RETURNING *
    `, [
      beneficiario?.trim() || null,
      evento?.trim()       || null,
      valor_modulo         || null,
      validez_dias         || null,
      items ? JSON.stringify(items) : null,
      observaciones?.trim() ?? null,
      estado               || null,
      id,
    ]);
    if (!result.rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[presupuestos] putPresupuesto:', err.message);
    res.status(500).json({ error: 'Error al actualizar' });
  }
}

// DELETE /api/presupuestos/:id
async function deletePresupuesto(req, res) {
  const { id } = req.params;
  try {
    const r = await pool.query('DELETE FROM presupuestos WHERE id = $1 RETURNING id', [id]);
    if (!r.rowCount) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[presupuestos] deletePresupuesto:', err.message);
    res.status(500).json({ error: 'Error al eliminar' });
  }
}

module.exports = { getPresupuestos, getPresupuesto, postPresupuesto, putPresupuesto, deletePresupuesto };
