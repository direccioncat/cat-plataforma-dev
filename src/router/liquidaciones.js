const express = require('express');
const router  = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const c = require('../controller/liquidaciones');

// Roles que pueden operar el módulo de cobro
const ROLES_COBRO    = ['admin', 'gerencia', 'director', 'operador_adicionales', 'jefe_cgm'];
// Solo admin/gerencia pueden gestionar el valor UF
const ROLES_UF_ADMIN = ['admin', 'gerencia', 'director'];

router.get ('/valor-uf', authMiddleware, requireRole(...ROLES_COBRO),    c.getUF);
router.post('/valor-uf', authMiddleware, requireRole(...ROLES_UF_ADMIN), c.crearUF);
router.post('/preview',  authMiddleware, requireRole(...ROLES_COBRO),    c.preview);
router.get ('/',         authMiddleware, requireRole(...ROLES_COBRO),    c.getLista);
router.post('/',         authMiddleware, requireRole(...ROLES_COBRO),    c.crear);
router.get ('/:id',      authMiddleware, requireRole(...ROLES_COBRO),    c.getById);

module.exports = router;
