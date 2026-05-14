const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const c = require('../controller/os_adicional');

router.use(authMiddleware);

// ── Prefijos fijos (antes de /:id) ────────────────────────────
router.put('/turnos/:turno_id',            c.putTurno);
router.delete('/turnos/:turno_id',         c.deleteTurno);
router.post('/fases/:fase_id/duplicar',    c.postDuplicarFase);
router.patch('/fases/:fase_id/mover',      c.patchMoverFase);
router.put('/fases/:fase_id',              c.putFase);
router.delete('/fases/:fase_id',           c.deleteFase);
router.post('/fases/:fase_id/elementos',   c.postElemento);
router.put('/elementos/:el_id',            c.putElemento);
router.delete('/elementos/:el_id',         c.deleteElemento);

// ── Colección ─────────────────────────────────────────────────
router.get('/',   c.getOs);
router.post('/',  c.postOs);

// ── OS individual ─────────────────────────────────────────────
router.get('/:id',                   c.getOsById);
router.put('/:id',                   c.putOs);
router.delete('/:id',                c.deleteOs);
router.post('/:id/enviar-validacion', c.postEnviarValidacion);
router.post('/:id/validar',          c.postValidar);
router.post('/:id/rechazar',         c.postRechazar);
router.post('/:id/estado',           c.postEstado);
router.get('/:id/turnos',            c.getTurnos);
router.post('/:id/turnos',           c.postTurno);
router.post('/:id/fases',            c.postFase);
router.put('/:id/recursos',          c.putRecursos);

module.exports = router;
