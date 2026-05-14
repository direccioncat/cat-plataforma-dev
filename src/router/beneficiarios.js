const express = require('express');
const router  = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const { getAll, getOne, post, put, del, getDocumentos, postDocumento, deleteDocumento } = require('../controller/beneficiarios');
const { documentoMiddleware } = require('../service/uploadDocumento');

const ROLES_SSAA = ['admin', 'operador_adicionales', 'gerencia', 'director', 'jefe_cgm'];

function multerDoc(req, res, next) {
  documentoMiddleware.single('archivo')(req, res, err => {
    if (!err) return next();
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: err.message });
  });
}

// Beneficiarios
router.get('/',    authMiddleware,                             getAll);
router.get('/:id', authMiddleware,                             getOne);
router.post('/',   authMiddleware, requireRole(...ROLES_SSAA), post);
router.put('/:id', authMiddleware, requireRole(...ROLES_SSAA), put);
router.delete('/:id', authMiddleware, requireRole(...ROLES_SSAA), del);

// Documentos
router.get('/:id/documentos',           authMiddleware,                             getDocumentos);
router.post('/:id/documentos',          authMiddleware, requireRole(...ROLES_SSAA), multerDoc, postDocumento);
router.delete('/:id/documentos/:docId', authMiddleware, requireRole(...ROLES_SSAA), deleteDocumento);

module.exports = router;
