const express = require('express');
const router  = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const {
  getPresupuestos,
  getPresupuesto,
  postPresupuesto,
  putPresupuesto,
  deletePresupuesto,
} = require('../controller/presupuestos');

const ROLES = ['admin', 'operador_adicionales', 'gerencia', 'director', 'jefe_cgm'];

router.get('/',    authMiddleware, requireRole(...ROLES), getPresupuestos);
router.get('/:id', authMiddleware, requireRole(...ROLES), getPresupuesto);
router.post('/',   authMiddleware, requireRole(...ROLES), postPresupuesto);
router.put('/:id', authMiddleware, requireRole(...ROLES), putPresupuesto);
router.delete('/:id', authMiddleware, requireRole(...ROLES), deletePresupuesto);

module.exports = router;
