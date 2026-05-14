const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { authMiddleware, requirePermiso } = require('../middleware/auth');
const c = require('../controller/servicios_adicionales');

const uploadCSV = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── Config ────────────────────────────────────────────────────
router.get('/config', authMiddleware, requirePermiso('VER_SSAA'),           c.getConfig);
router.put('/config', authMiddleware, requirePermiso('SSAA_CONFIG_SCORING'), c.updateConfig);

// ── Rutas fijas antes de /:id ─────────────────────────────────
router.get('/modulos-dia',          authMiddleware, requirePermiso('VER_SSAA'), c.getModulosDia);
router.get('/nomina',               authMiddleware, requirePermiso('VER_SSAA'), c.getNomina);
router.get('/scoring/:agente_id',   authMiddleware, requirePermiso('VER_SSAA'), c.getScoringAgente);

// ── Colección ─────────────────────────────────────────────────
router.get('/',         authMiddleware, requirePermiso('VER_SSAA'),   c.getLista);
router.post('/',        authMiddleware, requirePermiso('SSAA_CREAR'), c.crearServicio);
router.post('/directo', authMiddleware, requirePermiso('SSAA_CREAR'), c.crearServicioDirecto);

// ── /:id ──────────────────────────────────────────────────────
router.get('/:id',  authMiddleware, requirePermiso('VER_SSAA'),           c.getById);
router.put('/:id',  authMiddleware, requirePermiso('SSAA_AVANZAR_ESTADO'), c.updateServicio);
router.post('/:id/avanzar-estado', authMiddleware, requirePermiso('SSAA_AVANZAR_ESTADO'), c.avanzarEstado);
router.put('/:id/requerimientos',  authMiddleware, requirePermiso('SSAA_CREAR'),           c.updateRequerimientos);

// ── Turnos ────────────────────────────────────────────────────
router.get('/:id/turnos',         authMiddleware, requirePermiso('VER_SSAA'),   c.getTurnos);
router.post('/:id/turnos',        authMiddleware, requirePermiso('SSAA_CREAR'), c.crearTurno);
router.put('/:id/turnos/:tid',    authMiddleware, requirePermiso('SSAA_CREAR'), c.updateTurno);
router.delete('/:id/turnos/:tid', authMiddleware, requirePermiso('SSAA_CREAR'), c.deleteTurno);

// ── Estructura por turno ──────────────────────────────────────
router.get('/:id/turnos/:tid/estructura',         authMiddleware, requirePermiso('VER_SSAA'),   c.getEstructura);
router.post('/:id/turnos/:tid/estructura',        authMiddleware, requirePermiso('SSAA_ARMADO'), c.upsertEstructura);
router.patch('/:id/turnos/:tid/estructura/:nid',  authMiddleware, requirePermiso('SSAA_ARMADO'), c.patchEstructura);
router.delete('/:id/turnos/:tid/estructura/:nid', authMiddleware, requirePermiso('SSAA_ARMADO'), c.deleteEstructura);

// ── Presentismo por turno ─────────────────────────────────────
router.get('/:id/turnos/:tid/presentismo',  authMiddleware, requirePermiso('VER_SSAA'),         c.getPresentismo);
router.post('/:id/turnos/:tid/presentismo', authMiddleware, requirePermiso('SSAA_PRESENTISMO'), c.registrarPresentismo);

// ── Postulantes ───────────────────────────────────────────────
router.get('/:id/postulantes',                          authMiddleware, requirePermiso('VER_SSAA'),         c.getPostulantes);
router.post('/:id/postulantes/import-csv',              authMiddleware, requirePermiso('SSAA_POSTULANTES'), uploadCSV.single('csv'), c.importCsvPostulantes);
router.post('/:id/postulantes',                         authMiddleware, requirePermiso('SSAA_POSTULANTES'), c.crearPostulante);
router.post('/:id/postulantes/:pid/rol',                authMiddleware, requirePermiso('SSAA_POSTULANTES'), c.updatePostulanteRol);
router.put('/:id/postulantes/:pid/turnos',              authMiddleware, requirePermiso('SSAA_POSTULANTES'), c.updatePostulanteTurnos);
router.patch('/:id/postulantes/:pid/telefono',          authMiddleware, requirePermiso('SSAA_POSTULANTES'), c.updatePostulanteTelefono);
router.delete('/:id/postulantes/:pid',                  authMiddleware, requirePermiso('SSAA_POSTULANTES'), c.deletePostulante);

// ── Convocatoria ──────────────────────────────────────────────
router.get('/:id/convocatoria',        authMiddleware, requirePermiso('VER_SSAA'),          c.getConvocatoria);
router.patch('/:id/convocatoria/:cid', authMiddleware, requirePermiso('SSAA_CONVOCATORIA'), c.updateConvocatoria);

// ── Flyer ─────────────────────────────────────────────────────
router.patch('/:id/flyer',    authMiddleware, requirePermiso('SSAA_CONVOCATORIA'), c.updateFlyer);
router.get('/:id/flyer-data', authMiddleware, requirePermiso('VER_SSAA'),          c.getFlyerData);

// ── Token convocatoria ────────────────────────────────────────
router.get('/:id/convocatoria-token',   authMiddleware, requirePermiso('VER_SSAA'),          c.getToken);
router.post('/:id/convocatoria-token',  authMiddleware, requirePermiso('SSAA_CONVOCATORIA'), c.upsertToken);
router.patch('/:id/convocatoria-token', authMiddleware, requirePermiso('SSAA_CONVOCATORIA'), c.patchToken);

// ── Recursos ──────────────────────────────────────────────────
router.get('/:id/recursos',                        authMiddleware, requirePermiso('VER_SSAA'),         c.getRecursos);
router.patch('/:id/recursos/:recurso_id/estado',   authMiddleware, requirePermiso('SSAA_PRESENTISMO'), c.patchRecursoEstado);

// ── Export convocados ─────────────────────────────────────────
router.get('/:id/convocados', authMiddleware, requirePermiso('VER_SSAA'), c.getConvocados);

// ── Cambios pendientes ────────────────────────────────────────
router.get('/:id/conflictos',       authMiddleware, requirePermiso('VER_SSAA'),            c.getConflictos);
router.post('/:id/marcar-revisado', authMiddleware, requirePermiso('SSAA_REVISAR_CAMBIOS'), c.marcarRevisado);

// ── Vincular a servicio del pipeline ─────────────────────────
router.patch('/:id/vincular-servicio', authMiddleware, requirePermiso('SSAA_CREAR'), c.vincularServicio);

module.exports = router;
