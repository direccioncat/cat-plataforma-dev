const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getActividad, postActividad } = require('../controller/actividad');

router.get('/',  authMiddleware, getActividad);
router.post('/', authMiddleware, postActividad);

module.exports = router;
