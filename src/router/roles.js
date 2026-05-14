const express = require('express');
const router  = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const { listarRoles, crearRol, editarRol, eliminarRol } = require('../controller/roles');

router.get('/',         authMiddleware,                    listarRoles);
router.post('/',        authMiddleware, requireRole('admin'), crearRol);
router.patch('/:key',   authMiddleware, requireRole('admin'), editarRol);
router.delete('/:key',  authMiddleware, requireRole('admin'), eliminarRol);

module.exports = router;
