const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { uploadMiddleware } = require('../service/upload');
const { postUpload } = require('../controller/upload');

// Wrapeamos multer para que sus errores (tipo/tamaño inválido)
// devuelvan 400 en lugar de llegar al handler global de 500.
function multerSingle(fieldname) {
  return (req, res, next) => {
    uploadMiddleware.single(fieldname)(req, res, (err) => {
      if (!err) return next();
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: err.message });
    });
  };
}

router.post('/', authMiddleware, multerSingle('foto'), postUpload);

module.exports = router;
