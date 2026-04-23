const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { authMiddleware, requireRole } = require('../middleware/auth');
const c = require('../controller/servicios_adicionales');

const ROLES_OPERADOR = ['admin', 'operador_adicionales'];
const ROLES_LECTURA  = ['admin', 'operador_adicionales', 'gerencia', 'director', 'jefe_cgm'];
const ROLES_CONFIG   = ['admin', 'operador_adicionales', 'gerencia', 'director'];

const uploadCSV = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── Config ────────────────────────────────────────────────────
router.get('/config', authMiddleware, requireRole(...ROLES_LECTURA), c.getConfig);
router.put('/config', authMiddleware, requireRole(...ROLES_CONFIG),  c.updateConfig);

// ── Rutas fijas antes de /:id ─────────────────────────────────
router.get('/modulos-dia',          authMiddleware, requireRole(...ROLES_LECTURA), c.getModulosDia);
router.get('/scoring/:agente_id',   authMiddleware, requireRole(...ROLES_LECTURA), c.getScoringAgente);

// ── Colección ─────────────────────────────────────────────────
router.get('/',  authMiddleware, requireRole(...ROLES_LECTURA),  c.getLista);
router.post('/', authMiddleware, requireRole(...ROLES_OPERADOR), c.crearServicio);

// ── /:id ──────────────────────────────────────────────────────
router.get('/:id',  authMiddleware, requireRole(...ROLES_LECTURA),  c.getById);
router.put('/:id',  authMiddleware, requireRole(...ROLES_OPERADOR), c.updateServicio);
router.post('/:id/avanzar-estado', authMiddleware, requireRole(...ROLES_OPERADOR), c.avanzarEstado);
router.put('/:id/requerimientos',  authMiddleware, requireRole(...ROLES_OPERADOR), c.updateRequerimientos);

// ── Turnos ────────────────────────────────────────────────────
router.get('/:id/turnos',         authMiddleware, requireRole(...ROLES_LECTURA),  c.getTurnos);
router.post('/:id/turnos',        authMiddleware, requireRole(...ROLES_OPERADOR), c.crearTurno);
router.put('/:id/turnos/:tid',    authMiddleware, requireRole(...ROLES_OPERADOR), c.updateTurno);
router.delete('/:id/turnos/:tid', authMiddleware, requireRole(...ROLES_OPERADOR), c.deleteTurno);

// ── Estructura por turno ──────────────────────────────────────
router.get('/:id/turnos/:tid/estructura',         authMiddleware, requireRole(...ROLES_LECTURA),  c.getEstructura);
router.post('/:id/turnos/:tid/estructura',        authMiddleware, requireRole(...ROLES_OPERADOR), c.upsertEstructura);
router.patch('/:id/turnos/:tid/estructura/:nid',  authMiddleware, requireRole(...ROLES_OPERADOR), c.patchEstructura);
router.delete('/:id/turnos/:tid/estructura/:nid', authMiddleware, requireRole(...ROLES_OPERADOR), c.deleteEstructura);

// ── Presentismo por turno ─────────────────────────────────────
router.get('/:id/turnos/:tid/presentismo',  authMiddleware, requireRole(...ROLES_LECTURA),  c.getPresentismo);
router.post('/:id/turnos/:tid/presentismo', authMiddleware, requireRole(...ROLES_OPERADOR), c.registrarPresentismo);

// ── Postulantes ───────────────────────────────────────────────
router.get('/:id/postulantes',                          authMiddleware, requireRole(...ROLES_LECTURA),  c.getPostulantes);
router.post('/:id/postulantes/import-csv',              authMiddleware, requireRole(...ROLES_OPERADOR), uploadCSV.single('csv'), c.importCsvPostulantes);
router.post('/:id/postulantes',                         authMiddleware, requireRole(...ROLES_OPERADOR), c.crearPostulante);
router.post('/:id/postulantes/:pid/rol',                authMiddleware, requireRole(...ROLES_OPERADOR), c.updatePostulanteRol);
router.put('/:id/postulantes/:pid/turnos',              authMiddleware, requireRole(...ROLES_OPERADOR), c.updatePostulanteTurnos);
router.patch('/:id/postulantes/:pid/telefono',          authMiddleware, requireRole(...ROLES_OPERADOR), c.updatePostulanteTelefono);
router.delete('/:id/postulantes/:pid',                  authMiddleware, requireRole(...ROLES_OPERADOR), c.deletePostulante);

// ── Convocatoria ──────────────────────────────────────────────
router.get('/:id/convocatoria',        authMiddleware, requireRole(...ROLES_LECTURA),  c.getConvocatoria);
router.patch('/:id/convocatoria/:cid', authMiddleware, requireRole(...ROLES_OPERADOR), c.updateConvocatoria);

// ── Flyer ─────────────────────────────────────────────────────
router.patch('/:id/flyer',    authMiddleware, requireRole(...ROLES_OPERADOR), c.updateFlyer);
router.get('/:id/flyer-data', authMiddleware, requireRole(...ROLES_LECTURA),  c.getFlyerData);

// ── Token convocatoria ────────────────────────────────────────
router.get('/:id/convocatoria-token',   authMiddleware, requireRole(...ROLES_LECTURA),  c.getToken);
router.post('/:id/convocatoria-token',  authMiddleware, requireRole(...ROLES_OPERADOR), c.upsertToken);
router.patch('/:id/convocatoria-token', authMiddleware, requireRole(...ROLES_OPERADOR), c.patchToken);

module.exports = router;
