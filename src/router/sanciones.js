const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const { getSanciones, postSancion, putSancion, deleteSancion, checkSancion } = require('../controller/sanciones');

const ROLES_GESTION = ['admin', 'operador_disciplinario', 'gerencia', 'director'];
const ROLES_LECTURA = ['admin', 'operador_disciplinario', 'gerencia', 'director', 'operador_adicionales'];

router.get('/',                    authMiddleware, requireRole(...ROLES_LECTURA),  getSanciones);
router.get('/check/:agente_id',    authMiddleware,                                 checkSancion);
router.post('/',                   authMiddleware, requireRole(...ROLES_GESTION),  postSancion);
router.put('/:id',                 authMiddleware, requireRole(...ROLES_GESTION),  putSancion);
router.delete('/:id',              authMiddleware, requireRole(...ROLES_GESTION),  deleteSancion);

module.exports = router;
module.exports.tieneSancionActiva = require('../model/sanciones').tieneSancionActiva;
