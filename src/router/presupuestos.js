const express = require('express');
const router  = express.Router();
const { authMiddleware, requireRole, requirePermiso } = require('../middleware/auth');
const { documentoMiddleware } = require('../service/uploadDocumento');
const {
  getPresupuestos,
  getPresupuesto,
  postPresupuesto,
  putPresupuesto,
  deletePresupuesto,
  postBUI,
  putPresupuestoAprobado,
} = require('../controller/presupuestos');

const ROLES = ['admin', 'operador_adicionales', 'gerencia', 'director', 'jefe_cgm'];

function multerDoc(req, res, next) {
  documentoMiddleware.fields([
    { name: 'archivo',      maxCount: 1 },
    { name: 'comp_archivo', maxCount: 1 },
  ])(req, res, err => {
    if (!err) return next();
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.message });
  });
}

router.get('/',           authMiddleware, requireRole(...ROLES), getPresupuestos);
router.get('/:id',        authMiddleware, requireRole(...ROLES), getPresupuesto);
router.post('/',          authMiddleware, requireRole(...ROLES), postPresupuesto);
router.put('/:id',        authMiddleware, requireRole(...ROLES), putPresupuesto);
router.delete('/:id',     authMiddleware, requireRole(...ROLES), deletePresupuesto);
router.post('/:id/bui',   authMiddleware, requireRole(...ROLES), multerDoc, postBUI);
router.patch('/:id/modificar-aprobado', authMiddleware, requirePermiso('PRESUPUESTOS_MODIFICAR_APROBADO'), putPresupuestoAprobado);

module.exports = router;
