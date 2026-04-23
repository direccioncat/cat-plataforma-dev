const { validateMagicBytes, saveUploadedFile } = require('../service/upload');

async function postUpload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

  // Validación de contenido real: magic bytes del buffer en memoria
  if (!validateMagicBytes(req.file.buffer)) {
    return res.status(400).json({ error: 'El archivo no es una imagen válida' });
  }

  const filename = saveUploadedFile(req.file.buffer, req.file.originalname);
  const url = `/uploads/${filename}`;
  return res.json({ url, filename });
}

module.exports = { postUpload };
