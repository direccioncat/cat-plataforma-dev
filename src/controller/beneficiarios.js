const pool = require('../db/pool');
const { getBeneficiarios, getBeneficiarioById, crearBeneficiario, actualizarBeneficiario, eliminarBeneficiario } = require('../model/beneficiarios');
const { validarMagicBytes, guardarDocumento } = require('../service/uploadDocumento');

// ── BENEFICIARIOS ─────────────────────────────────────────────

async function getAll(req, res) {
  try {
    const rows = await getBeneficiarios();
    res.json(rows);
  } catch (err) {
    console.error('[beneficiarios] getAll:', err.message);
    res.status(500).json({ error: 'Error al obtener beneficiarios' });
  }
}

async function getOne(req, res) {
  try {
    const b = await getBeneficiarioById(req.params.id);
    if (!b) return res.status(404).json({ error: 'No encontrado' });
    res.json(b);
  } catch (err) {
    console.error('[beneficiarios] getOne:', err.message);
    res.status(500).json({ error: 'Error' });
  }
}

async function post(req, res) {
  const { razon_social, nombre, email, telefono, cuit } = req.body;
  if (!razon_social?.trim()) return res.status(400).json({ error: 'La razón social es requerida' });
  try {
    const b = await crearBeneficiario({ razon_social, nombre, email, telefono, cuit });
    res.status(201).json(b);
  } catch (err) {
    console.error('[beneficiarios] post:', err.message);
    res.status(500).json({ error: 'Error al crear beneficiario' });
  }
}

async function put(req, res) {
  try {
    const b = await actualizarBeneficiario(req.params.id, req.body);
    if (!b) return res.status(404).json({ error: 'No encontrado' });
    res.json(b);
  } catch (err) {
    console.error('[beneficiarios] put:', err.message);
    res.status(500).json({ error: 'Error al actualizar' });
  }
}

async function del(req, res) {
  try {
    const b = await eliminarBeneficiario(req.params.id);
    if (!b) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[beneficiarios] del:', err.message);
    res.status(500).json({ error: 'Error al eliminar' });
  }
}

// ── DOCUMENTOS ────────────────────────────────────────────────

async function getDocumentos(req, res) {
  try {
    const r = await pool.query(
      `SELECT d.*, p.nombre_completo AS subido_por_nombre
       FROM beneficiario_documentos d
       LEFT JOIN profiles p ON p.id = d.subido_por
       WHERE d.beneficiario_id = $1
       ORDER BY d.created_at DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('[beneficiarios] getDocumentos:', err.message);
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
}

async function postDocumento(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

  if (!validarMagicBytes(req.file.buffer)) {
    return res.status(400).json({ error: 'El archivo no es válido o está corrupto' });
  }

  try {
    const nombre_archivo = guardarDocumento(req.file.buffer, req.file.originalname);
    const nombre         = req.body.nombre?.trim() || req.file.originalname;

    const r = await pool.query(
      `INSERT INTO beneficiario_documentos
         (beneficiario_id, nombre, nombre_archivo, tipo_mime, tamanio, subido_por)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.params.id,
        nombre,
        nombre_archivo,
        req.file.mimetype,
        req.file.size,
        req.user.id,
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('[beneficiarios] postDocumento:', err.message);
    res.status(500).json({ error: 'Error al guardar documento' });
  }
}

async function deleteDocumento(req, res) {
  try {
    const { id, docId } = req.params;
    const r = await pool.query(
      'DELETE FROM beneficiario_documentos WHERE id = $1 AND beneficiario_id = $2 RETURNING nombre_archivo',
      [docId, id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Documento no encontrado' });

    // Borrar archivo físico (no bloquear si falla)
    try {
      const fs   = require('fs');
      const path = require('path');
      const { UPLOADS_DIR } = require('../config');
      fs.unlinkSync(path.join(UPLOADS_DIR || './uploads', r.rows[0].nombre_archivo));
    } catch { /* ignorar si no existe en disco */ }

    res.json({ ok: true });
  } catch (err) {
    console.error('[beneficiarios] deleteDocumento:', err.message);
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
}

module.exports = { getAll, getOne, post, put, del, getDocumentos, postDocumento, deleteDocumento };
