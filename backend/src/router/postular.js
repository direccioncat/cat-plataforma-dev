const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getConvocatoria, postPostulacion } = require('../controller/postular');
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_GET_MAX, RATE_LIMIT_POST_MAX } = require('../config');

const limitGet = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_GET_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.' },
});

const limitPost = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_POST_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Esperá unos minutos antes de volver a intentar.' },
});

router.get('/:token',  limitGet,  getConvocatoria);
router.post('/:token', limitPost, postPostulacion);

module.exports = router;
