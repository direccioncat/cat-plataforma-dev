const pool = require('../db/pool');
const { validarMagicBytes, guardarDocumento } = require('../service/uploadDocumento');
const serviciosModel = require('../model/servicios');

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
  const { beneficiario, beneficiario_id, evento, valor_modulo, validez_dias, items, observaciones } = req.body;
  if (!beneficiario?.trim()) return res.status(400).json({ error: 'El beneficiario es requerido' });
  if (!evento?.trim())       return res.status(400).json({ error: 'El evento es requerido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Crear presupuesto
    const { rows: [presupuesto] } = await client.query(`
      INSERT INTO presupuestos (beneficiario, beneficiario_id, evento, valor_modulo, validez_dias, items, observaciones, creado_por)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
      RETURNING *
    `, [
      beneficiario.trim(),
      beneficiario_id || null,
      evento.trim(),
      valor_modulo || 71249.25,
      validez_dias || 3,
      JSON.stringify(items || []),
      observaciones?.trim() || null,
      req.user.id,
    ]);

    // Crear servicio vinculado en la misma transacción
    const servicio = await serviciosModel.crearConPresupuesto(client, {
      presupuesto_id: presupuesto.id,
      creado_por: req.user.id,
    });

    await client.query('COMMIT');
    res.status(201).json({ ...presupuesto, servicio });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[presupuestos] postPresupuesto:', err.message);
    res.status(500).json({ error: 'Error al crear presupuesto' });
  } finally {
    client.release();
  }
}

// PUT /api/presupuestos/:id
async function putPresupuesto(req, res) {
  const { id } = req.params;
  const { beneficiario, beneficiario_id, evento, valor_modulo, validez_dias, items, observaciones, estado } = req.body;

  const ESTADOS_VALIDOS = ['borrador', 'enviado', 'aprobado', 'rechazado', 'vencido', 'cancelado'];
  if (estado && !ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido: ' + estado });
  }

  try {
    const result = await pool.query(`
      UPDATE presupuestos SET
        beneficiario    = COALESCE($1, beneficiario),
        beneficiario_id = COALESCE($2, beneficiario_id),
        evento          = COALESCE($3, evento),
        valor_modulo    = COALESCE($4, valor_modulo),
        validez_dias    = COALESCE($5, validez_dias),
        items           = COALESCE($6::jsonb, items),
        observaciones   = COALESCE($7, observaciones),
        estado          = COALESCE($8, estado),
        updated_at      = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      beneficiario?.trim()  || null,
      beneficiario_id       || null,
      evento?.trim()        || null,
      valor_modulo          || null,
      validez_dias          || null,
      items ? JSON.stringify(items) : null,
      observaciones?.trim() ?? null,
      estado                || null,
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
    // Solo se pueden eliminar presupuestos en borrador
    const check = await pool.query('SELECT id, estado FROM presupuestos WHERE id = $1', [id]);
    if (!check.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    if (check.rows[0].estado !== 'borrador') {
      return res.status(400).json({ error: `No se puede eliminar un presupuesto en estado "${check.rows[0].estado}". Solo los presupuestos en borrador pueden eliminarse.` });
    }
    await pool.query('DELETE FROM presupuestos WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[presupuestos] deletePresupuesto:', err.message);
    res.status(500).json({ error: 'Error al eliminar' });
  }
}

// PATCH /api/presupuestos/:id/modificar-aprobado
async function putPresupuestoAprobado(req, res) {
  const { id } = req.params;
  const { beneficiario, beneficiario_id, evento, valor_modulo, validez_dias, items, observaciones } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Verificar que existe y está aprobado — dentro de la transacción con FOR UPDATE para evitar TOCTOU
    const check = await client.query('SELECT id, estado FROM presupuestos WHERE id = $1 FOR UPDATE', [id]);
    if (!check.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'No encontrado' }); }
    if (check.rows[0].estado !== 'aprobado') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Solo se pueden modificar presupuestos aprobados con este endpoint' }); }

    // Actualizar presupuesto (sin tocar estado)
    const result = await client.query(`
      UPDATE presupuestos SET
        beneficiario    = COALESCE($1, beneficiario),
        beneficiario_id = COALESCE($2, beneficiario_id),
        evento          = COALESCE($3, evento),
        valor_modulo    = COALESCE($4, valor_modulo),
        validez_dias    = COALESCE($5, validez_dias),
        items           = COALESCE($6::jsonb, items),
        observaciones   = COALESCE($7, observaciones),
        updated_at      = NOW()
      WHERE id = $8
      RETURNING *
    `, [
      beneficiario?.trim()  || null,
      beneficiario_id       || null,
      evento?.trim()        || null,
      valor_modulo          || null,
      validez_dias          || null,
      items ? JSON.stringify(items) : null,
      observaciones?.trim() ?? null,
      id,
    ]);

    // Pasar la OS vinculada a 'requiere_revision' para que el usuario la revise y re-valide
    await client.query(`
      UPDATE os_adicional oa
         SET estado = 'requiere_revision', updated_at = NOW()
        FROM servicios srv
       WHERE oa.servicio_id = srv.id
         AND srv.presupuesto_id = $1
         AND oa.estado IN ('validada', 'cumplida')
    `, [id]);

    // Sincronizar os_adicional_fechas de TODAS las OSes vinculadas al presupuesto
    // (sin importar su estado actual) para que el editor de turnos muestre las fechas correctas
    if (Array.isArray(items) && items.length > 0) {
      const fechasPresupuesto = [...new Set(
        items.map(i => i.dia).filter(Boolean)
      )].sort();

      if (fechasPresupuesto.length > 0) {
        // Obtener todas las OSes vinculadas al presupuesto (no canceladas)
        const osVinculadas = await client.query(`
          SELECT oa.id FROM os_adicional oa
          JOIN servicios srv ON srv.id = oa.servicio_id
          WHERE srv.presupuesto_id = $1
            AND oa.estado != 'cancelada'
        `, [id]);

        for (const row of osVinculadas.rows) {
          await client.query(
            'DELETE FROM os_adicional_fechas WHERE os_adicional_id = $1',
            [row.id]
          );
          for (const fecha of fechasPresupuesto) {
            await client.query(
              'INSERT INTO os_adicional_fechas (os_adicional_id, fecha) VALUES ($1, $2)',
              [row.id, fecha]
            );
          }
        }
      }
    }

    // Detectar OSes en borrador/pendiente_validacion que también quedan desactualizadas pero no se tocan
    const { rows: osDesactualizadas } = await client.query(`
      SELECT oa.id, oa.nombre, oa.estado
        FROM os_adicional oa
        JOIN servicios srv ON oa.servicio_id = srv.id
       WHERE srv.presupuesto_id = $1
         AND oa.estado IN ('borrador', 'validacion')
    `, [id]);

    await client.query('COMMIT');

    res.json({
      ...result.rows[0],
      ...(osDesactualizadas.length > 0 ? {
        advertencia: `Hay ${osDesactualizadas.length} OS en borrador/validación que no fueron notificadas del cambio: ${osDesactualizadas.map(o => o.nombre || o.id).join(', ')}`
      } : {}),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[presupuestos] putPresupuestoAprobado:', err.message);
    res.status(500).json({ error: 'Error al modificar presupuesto' });
  } finally {
    client.release();
  }
}

// POST /api/presupuestos/:id/bui  — carga número + PDF de la BUI (principal y/o complementaria)
async function postBUI(req, res) {
  const { id } = req.params;
  const numero      = req.body.numero?.trim()      || null;
  const comp_numero = req.body.comp_numero?.trim() || null;

  try {
    // req.files es un objeto { archivo: [...], comp_archivo: [...] } con multer.fields
    const fileMain = req.files?.archivo?.[0]      || null;
    const fileComp = req.files?.comp_archivo?.[0] || null;

    let bui_archivo      = null;
    let bui_comp_archivo = null;

    if (fileMain) {
      if (!validarMagicBytes(fileMain.buffer))
        return res.status(400).json({ error: 'El archivo principal no es válido' });
      bui_archivo = guardarDocumento(fileMain.buffer, fileMain.originalname);
    }
    if (fileComp) {
      if (!validarMagicBytes(fileComp.buffer))
        return res.status(400).json({ error: 'El archivo complementario no es válido' });
      bui_comp_archivo = guardarDocumento(fileComp.buffer, fileComp.originalname);
    }

    // Construir SET dinámico — solo actualizar los campos enviados
    const sets = ['updated_at = NOW()'];
    const vals = [];

    if (numero !== null)           { vals.push(numero);           sets.push(`bui_numero = $${vals.length}`); }
    if (bui_archivo !== null)      { vals.push(bui_archivo);      sets.push(`bui_archivo = $${vals.length}`); }
    if (comp_numero !== null)      { vals.push(comp_numero);      sets.push(`bui_comp_numero = $${vals.length}`); }
    if (bui_comp_archivo !== null) { vals.push(bui_comp_archivo); sets.push(`bui_comp_archivo = $${vals.length}`); }

    if (sets.length === 1) return res.status(400).json({ error: 'Enviá al menos un número o archivo' });

    vals.push(id);
    const r = await pool.query(
      `UPDATE presupuestos SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (!r.rowCount) return res.status(404).json({ error: 'No encontrado' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('[presupuestos] postBUI:', err.message);
    res.status(500).json({ error: 'Error al guardar BUI' });
  }
}

module.exports = { getPresupuestos, getPresupuesto, postPresupuesto, putPresupuesto, deletePresupuesto, postBUI, putPresupuestoAprobado };
