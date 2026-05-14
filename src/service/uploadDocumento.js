/**
 * uploadDocumento.js
 * Multer + validación de magic bytes para documentos.
 * Soporta: PDF, DOCX, DOC, XLSX, XLS, PNG, JPG.
 */
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');
const { UPLOADS_DIR, MAX_FILE_SIZE_MB } = require('../config');

// ── Magic bytes ───────────────────────────────────────────────
const MAGIC_DOC = [
  // PDF: %PDF
  { label: 'pdf',  match: b => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  // ZIP → DOCX / XLSX (Office Open XML)
  { label: 'ooxml', match: b => b[0] === 0x50 && b[1] === 0x4B && b[2] === 0x03 && b[3] === 0x04 },
  // OLE2 → DOC / XLS (Office 97-2003)
  { label: 'ole2',  match: b => b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0 },
  // JPEG
  { label: 'jpeg',  match: b => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  // PNG
  { label: 'png',   match: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 },
];

function validarMagicBytes(buffer) {
  if (!buffer || buffer.length < 8) return false;
  return MAGIC_DOC.some(({ match }) => match(buffer));
}

function guardarDocumento(buffer, originalname) {
  const ext      = path.extname(originalname).toLowerCase() || '.bin';
  const filename = `doc_${uuidv4()}${ext}`;
  const dest     = path.join(UPLOADS_DIR || './uploads', filename);
  fs.writeFileSync(dest, buffer);
  return filename;
}

const EXTS_PERMITIDAS  = /^\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png)$/;
const MAX_DOC_MB       = Math.max((MAX_FILE_SIZE_MB || 10), 20); // al menos 20 MB para docs

const documentoMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOC_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (EXTS_PERMITIDAS.test(ext)) return cb(null, true);
    cb(new Error('Formato no permitido. Usá PDF, Word, Excel o imagen.'));
  },
});

module.exports = { documentoMiddleware, validarMagicBytes, guardarDocumento };
