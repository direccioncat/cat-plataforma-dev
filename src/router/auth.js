const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { postLogin, postRefresh, postLogout } = require('../controller/auth');
const { RATE_LIMIT_WINDOW_MS } = require('../config');

const loginLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: 10,
  message: { error: 'Demasiados intentos. Intentá de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  message: { error: 'Demasiadas solicitudes de renovación. Esperá un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login',   loginLimiter,   postLogin);
router.post('/refresh', refreshLimiter, postRefresh);
router.post('/logout',                  postLogout);

module.exports = router;
