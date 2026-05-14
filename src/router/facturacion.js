const express = require('express');
const router  = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const c = require('../controller/facturacion');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const ROLES_RRHH = ['admin', 'gerencia', 'director', 'operador_adicionales', 'jefe_cgm'];

// Multer para upload de factura (público)
const uploadsDir = path.join(process.cwd(), process.env.UPLOADS_DIR || 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `factura_${req.params.token}_${Date.now()}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf', '.jpg', '.jpeg', '.png'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Solo PDF, JPG o PNG'), ok);
  },
});

// ── Rutas específicas PRIMERO (antes de /:id genérico) ────────

// Públicas (agentes via token — sin auth)
router.get ('/form/:token', c.getForm);
router.post('/form/:token', upload.single('factura_archivo'), async (req, res) => {
  if (req.file) req.body.factura_archivo = req.file.filename;
  return c.postForm(req, res);
});

// Protegidas específicas
router.get  ('/agentes',        authMiddleware, requireRole(...ROLES_RRHH), c.getAgentes);
router.patch('/items/:item_id', authMiddleware, requireRole(...ROLES_RRHH), c.accionRRHH);

// ── Rutas genéricas ───────────────────────────────────────────
router.get ('/', authMiddleware, requireRole(...ROLES_RRHH), c.getLista);
router.post('/', authMiddleware, requireRole(...ROLES_RRHH), c.crear);
router.get ('/:id', authMiddleware, requireRole(...ROLES_RRHH), c.getById);

module.exports = router;
