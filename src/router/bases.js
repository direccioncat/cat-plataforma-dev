const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getBases } = require('../controller/bases');

router.get('/', authMiddleware, getBases);

module.exports = router;
