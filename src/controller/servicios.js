const m = require('../model/servicios');
const { validarMagicBytes, guardarDocumento, eliminarArchivoSiExiste } = require('../service/uploadDocumento');
const pool = require('../db/pool');

const E500 = (res, err, ctx) => {
  console.error(`[servicios] ${ctx}:`, err.message);
  return res.status(500).json({ error: 'Error interno' });
};

// GET /api/servicios
async function getLista(req, res) {
  try { res.json(await m.getLista()); }
  catch (err) { E500(res, err, 'getLista'); }
}

// GET /api/servicios/:id
async function getById(req, res) {
  try {
    const s = await m.getById(req.params.id);
    if (!s) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(s);
  } catch (err) { E500(res, err, 'getById'); }
}

// PATCH /api/servicios/:id/bui-pagada
async function patchBuiPagada(req, res) {
  try {
    const s = await m.actualizarBuiPagada(req.params.id, req.body.bui_pagada ?? true);
    if (!s) return res.status(404).json({ error: 'No encontrado' });
    res.json(s);
  } catch (err) { E500(res, err, 'patchBuiPagada'); }
}

// POST /api/servicios/:id/cancelar
async function cancelar(req, res) {
  try {
    const s = await m.cancelarServicio(req.params.id, req.user.id);
    res.json(s);
  } catch (err) {
    if (err.message.includes('ya cancelado') || err.message.includes('no encontrado')) {
      return res.status(400).json({ error: err.message });
    }
    E500(res, err, 'cancelar');
  }
}

// POST /api/servicios/:id/vincular-os
async function vincularOs(req, res) {
  const { os_adicional_id } = req.body;
  if (!os_adicional_id) return res.status(400).json({ error: 'os_adicional_id requerido' });
  try {
    await m.vincularOsAdicional(req.params.id, os_adicional_id);
    res.json({ ok: true });
  } catch (err) { E500(res, err, 'vincularOs'); }
}

// GET /api/servicios/:id/documentos
async function getDocumentos(req, res) {
  try { res.json(await m.getDocumentos(req.params.id)); }
  catch (err) { E500(res, err, 'getDocumentos'); }
}

// POST /api/servicios/:id/documentos
async function postDocumento(req, res) {
  const { id: servicio_id } = req.params;
  const { tipo, nombre } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
  if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' });

  if (!validarMagicBytes(req.file.buffer))
    return res.status(400).json({ error: 'Archivo no válido' });

  try {
    const nombre_archivo = guardarDocumento(req.file.buffer, req.file.originalname);
    const doc = await m.crearDocumento({
      servicio_id,
      tipo: tipo || 'otro',
      nombre: nombre.trim(),
      nombre_archivo,
      tipo_mime: req.file.mimetype,
      tamanio: req.file.size,
      subido_por: req.user.id,
    });
    res.status(201).json(doc);
  } catch (err) { E500(res, err, 'postDocumento'); }
}

// DELETE /api/servicios/:id/documentos/:docId
async function deleteDocumento(req, res) {
  try {
    const doc = await m.eliminarDocumento(req.params.id, req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
    eliminarArchivoSiExiste?.(doc.nombre_archivo);
    res.json({ ok: true });
  } catch (err) { E500(res, err, 'deleteDocumento'); }
}

// POST /api/servicios/:id/crear-ssaa
async function crearSsaa(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    // Cargar servicio con su presupuesto
    const srvR = await client.query(`
      SELECT s.id, s.presupuesto_id, p.estado AS pres_estado,
             p.evento, p.beneficiario, p.items, p.numero AS pres_numero
      FROM servicios s
      JOIN presupuestos p ON p.id = s.presupuesto_id
      WHERE s.id = $1
    `, [id]);
    if (!srvR.rows[0]) return res.status(404).json({ error: 'Servicio no encontrado' });
    const srv = srvR.rows[0];

    if (srv.pres_estado !== 'aprobado')
      return res.status(400).json({ error: 'El presupuesto debe estar aprobado para crear el SS.AA.' });

    // Verificar que no exista ya un SS.AA. vinculado (por OS o directo)
    const existeR = await client.query(`
      SELECT sa.id FROM servicios_adicionales sa
      LEFT JOIN os_adicional oa ON oa.id = sa.os_adicional_id
      WHERE oa.servicio_id = $1 OR sa.servicio_id = $1
      LIMIT 1
    `, [id]);
    if (existeR.rows[0]) return res.status(409).json({ error: 'Ya existe un SS.AA. vinculado a este servicio', id: existeR.rows[0].id });

    // Calcular dotación total desde los ítems del presupuesto
    const items = Array.isArray(srv.items) ? srv.items : [];
    const totalPersonal = items.reduce((acc, it) => acc + (Number(it.personal) || 0), 0);

    await client.query('BEGIN');

    // Crear SS.AA. directo vinculado al servicio
    const saR = await client.query(`
      INSERT INTO servicios_adicionales
        (servicio_id, sa_nombre, sa_evento, sa_dotacion_agentes,
         numero_externo, creado_por, estado)
      VALUES ($1, $2, $3, $4, $5, $6, 'pendiente')
      RETURNING *
    `, [
      id,
      srv.evento || srv.beneficiario || 'Servicio adicional',
      srv.beneficiario || null,
      totalPersonal || 0,
      srv.pres_numero || null,
      req.user.id,
    ]);
    const sa = saR.rows[0];

    // Crear requerimiento base con el personal total como infante
    if (totalPersonal > 0) {
      await client.query(
        'INSERT INTO sa_requerimientos (servicio_id, rol, cantidad) VALUES ($1, $2, $3)',
        [sa.id, 'infante', totalPersonal]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(sa);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[servicios] crearSsaa:', err.message);
    res.status(500).json({ error: 'Error al crear SS.AA.' });
  } finally {
    client.release();
  }
}

module.exports = { getLista, getById, patchBuiPagada, cancelar, vincularOs, getDocumentos, postDocumento, deleteDocumento, crearSsaa };
