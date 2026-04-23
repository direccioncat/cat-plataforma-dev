const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const { getMisiones, getMisionesMias, getMisionById, postMision, postAsignar, postAceptar, postInterrumpir, postCerrar } = require('../controller/misiones');

router.get('/',                  authMiddleware,                                                         getMisiones);
router.get('/mias',              authMiddleware, requireRole('agente'),                                  getMisionesMias);
router.get('/:id',               authMiddleware,                                                         getMisionById);
router.post('/',                 authMiddleware, requireRole('admin','gerencia','jefe_base','coordinador'), postMision);
router.post('/:id/asignar',      authMiddleware, requireRole('admin','gerencia','jefe_base','coordinador','supervisor'), postAsignar);
router.post('/:id/aceptar',      authMiddleware, requireRole('agente'),                                  postAceptar);
router.post('/:id/interrumpir',  authMiddleware, requireRole('agente'),                                  postInterrumpir);
router.post('/:id/cerrar',       authMiddleware,                                                         postCerrar);

module.exports = router;
