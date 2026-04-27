const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const { getProfiles, getProfileMe, getProfileMias, getEquipo, getProfileById, postProfile, putProfile, patchTelefono } = require('../controller/profiles');

router.get('/',                  authMiddleware,                   getProfiles);
router.get('/equipo',            authMiddleware,                   getEquipo);
router.get('/me',                authMiddleware,                   getProfileMe);
router.get('/mias',              authMiddleware,                   getProfileMias);
router.get('/:id',               authMiddleware,                   getProfileById);
router.post('/',                 authMiddleware, requireRole('admin'), postProfile);
router.put('/:id',               authMiddleware,                   putProfile);
router.patch('/:id/telefono',    authMiddleware,                   patchTelefono);

module.exports = router;
