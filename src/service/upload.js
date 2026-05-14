const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { UPLOADS_DIR, MAX_FILE_SIZE_MB } = require('../config');

// ── Magic bytes de cada formato permitido ──────────────────────
// El cliente puede mentir en la extensión y el mimetype,
// pero los bytes iniciales del archivo real no se pueden falsificar.
const MAGIC_SIGNATURES = [
  // JPEG: FF D8 FF
  { label: 'jpeg', match: (b) => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { label: 'png',  match: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 },
  // GIF87a / GIF89a: 47 49 46 38 ('GIF8')
  { label: 'gif',  match: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  // WebP: 'RIFF' (0-3) + 'WEBP' (8-11)
  { label: 'webp', match: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
];

/**
 * Verifica que el buffer corresponda a una imagen real
 * comparando sus magic bytes con las firmas conocidas.
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function validateMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) return false;
  return MAGIC_SIGNATURES.some(({ match }) => match(buffer));
}

/**
 * Persiste el buffer en disco con un nombre UUID + extensión original.
 * Solo debe llamarse después de que validateMagicBytes() devuelva true.
 * @param {Buffer} buffer
 * @param {string} originalname
 * @returns {string} filename guardado
 */
function saveUploadedFile(buffer, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  const filename = `${uuidv4()}${ext}`;
  const dest = path.join(UPLOADS_DIR || './uploads', filename);
  fs.writeFileSync(dest, buffer);
  return filename;
}

// ── Multer con memoryStorage ───────────────────────────────────
// El archivo queda en RAM (req.file.buffer) hasta pasar la validación
// de magic bytes en el controller. Si falla, nunca toca el disco.

const TIPOS_PERMITIDOS = /^(image\/(jpeg|png|webp|gif))$/;
const EXTS_PERMITIDAS  = /^\.(jpg|jpeg|png|webp|gif)$/;

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (MAX_FILE_SIZE_MB || 5) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = TIPOS_PERMITIDOS.test(file.mimetype);
    const extOk  = EXTS_PERMITIDAS.test(ext);
    if (mimeOk && extOk) return cb(null, true);
    cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'));
  },
});

module.exports = { uploadMiddleware, validateMagicBytes, saveUploadedFile };
