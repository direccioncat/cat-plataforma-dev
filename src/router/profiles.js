const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const { getProfiles, getNomina, getProfileMe, getProfileMias, getEquipo, getProfileById, postProfile, putProfile, patchTelefono, postImportarNomina, patchRol } = require('../controller/profiles');
const { previewSyncNomina, ejecutarSyncNomina, resetearDBHandler } = require('../controller/syncNomina');

router.get('/nomina',            authMiddleware,                   getNomina);
router.get('/',                  authMiddleware,                   getProfiles);
router.get('/equipo',            authMiddleware,                   getEquipo);
router.get('/me',                authMiddleware,                   getProfileMe);
router.get('/mias',              authMiddleware,                   getProfileMias);
router.get('/:id',               authMiddleware,                   getProfileById);
router.post('/',                 authMiddleware, requireRole('admin'), postProfile);
router.put('/:id',               authMiddleware,                   putProfile);
router.patch('/:id/telefono',    authMiddleware,                   patchTelefono);
router.post('/importar-nomina',  authMiddleware, requireRole('admin'), postImportarNomina);
router.get('/sync-nomina/preview',   authMiddleware, requireRole('admin'), previewSyncNomina);
router.post('/sync-nomina/ejecutar', authMiddleware, requireRole('admin'), ejecutarSyncNomina);
router.post('/sync-nomina/reset-db', authMiddleware, requireRole('admin'), resetearDBHandler);
router.patch('/:id/rol',         authMiddleware, requireRole('admin'), patchRol);

module.exports = router;
