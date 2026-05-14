const express = require('express');
const router  = express.Router();
const { authMiddleware, requireRole, requirePermiso } = require('../middleware/auth');
const { documentoMiddleware } = require('../service/uploadDocumento');
const c = require('../controller/servicios');

const ROLES = ['admin', 'operador_adicionales', 'gerencia', 'director', 'jefe_cgm'];

function multerDoc(req, res, next) {
  documentoMiddleware.single('archivo')(req, res, err => {
    if (!err) return next();
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.message });
  });
}

router.get('/',                         authMiddleware, requireRole(...ROLES), c.getLista);
router.get('/:id',                      authMiddleware, requireRole(...ROLES), c.getById);
router.patch('/:id/bui-pagada',         authMiddleware, requireRole(...ROLES), c.patchBuiPagada);
router.post('/:id/cancelar',            authMiddleware, requireRole(...ROLES), c.cancelar);
router.post('/:id/vincular-os',         authMiddleware, requireRole(...ROLES), c.vincularOs);
router.get('/:id/documentos',           authMiddleware, requireRole(...ROLES), c.getDocumentos);
router.post('/:id/documentos',          authMiddleware, requireRole(...ROLES), multerDoc, c.postDocumento);
router.delete('/:id/documentos/:docId', authMiddleware, requireRole(...ROLES), c.deleteDocumento);
router.post('/:id/crear-ssaa',          authMiddleware, requirePermiso('SSAA_CREAR'), c.crearSsaa);

module.exports = router;
