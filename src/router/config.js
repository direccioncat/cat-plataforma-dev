const express = require('express');
const router  = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const c = require('../controller/config');

// Solo admin y gerencia pueden ver/modificar config del sistema
const ROLES_CONFIG = ['admin', 'gerencia', 'director'];

router.get ('/smtp',      authMiddleware, requireRole(...ROLES_CONFIG), c.getSMTP);
router.put ('/smtp',      authMiddleware, requireRole(...ROLES_CONFIG), c.setSMTP);
router.post('/smtp/test', authMiddleware, requireRole(...ROLES_CONFIG), c.testSMTP);

module.exports = router;
