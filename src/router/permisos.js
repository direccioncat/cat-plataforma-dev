const express = require('express');
const router  = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const { getPermisos, putPermisosRol } = require('../controller/permisos');

router.get('/',        authMiddleware, requireRole('admin'), getPermisos);
router.put('/:rol',    authMiddleware, requireRole('admin'), putPermisosRol);

module.exports = router;
