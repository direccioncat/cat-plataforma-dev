const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const c = require('../controller/os');

const ROLES_WRITE   = ['admin','director','gerencia','planeamiento','jefe_cgm','coordinador_cgm'];
const ROLES_APROBAR = ['admin','director','gerencia'];

// ── Items (prefijo fijo — antes de /:id) ──────────────────────
router.patch('/items/:id/comuna',   authMiddleware, requireRole(...ROLES_WRITE),   c.patchComuna);
router.put('/items/:id/fechas',     authMiddleware, requireRole(...ROLES_WRITE),   c.putItemFechas);
router.put('/items/:id',            authMiddleware, requireRole(...ROLES_WRITE),   c.putItem);
router.delete('/items/:id',         authMiddleware, requireRole(...ROLES_WRITE),   c.deleteItem);
router.post('/items/:id/turnos',    authMiddleware, requireRole(...ROLES_WRITE),   c.postItemTurnos);
router.get('/items/:id',            authMiddleware,                                c.getItem);

// ── Colección ─────────────────────────────────────────────────
router.get('/',                     authMiddleware,                                c.getOs);
router.post('/',                    authMiddleware, requireRole(...ROLES_WRITE),   c.postOs);

// ── OS individual ─────────────────────────────────────────────
router.get('/:id',                  authMiddleware,                                c.getOsById);
router.get('/:id/resumen',          authMiddleware,                                c.getResumen);
router.put('/:id',                  authMiddleware, requireRole(...ROLES_WRITE),   c.putOs);
router.delete('/:id',               authMiddleware, requireRole(...ROLES_WRITE),   c.deleteOs);
router.post('/:id/enviar-validacion', authMiddleware, requireRole(...ROLES_WRITE), c.postEnviarValidacion);
router.post('/:id/publicar',        authMiddleware, requireRole(...ROLES_APROBAR), c.postPublicar);
router.post('/:id/cerrar',          authMiddleware, requireRole(...ROLES_APROBAR), c.postCerrar);
router.post('/:id/generar-hoy',     authMiddleware, requireRole(...ROLES_WRITE),   c.postGenerarHoy);
router.post('/:id/fechas',          authMiddleware, requireRole(...ROLES_WRITE),   c.postFechas);
router.post('/:id/items',           authMiddleware, requireRole(...ROLES_WRITE),   c.postItems);

module.exports = router;
