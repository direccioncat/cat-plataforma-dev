const path = require('path');

const TIPOS_PERMITIDOS = /jpeg|jpg|png|webp|gif/;

function validarImagen(file) {
  if (!file) return 'No se recibió archivo';
  const ext = path.extname(file.originalname).toLowerCase();
  if (!TIPOS_PERMITIDOS.test(ext) || !TIPOS_PERMITIDOS.test(file.mimetype))
    return 'Solo se permiten imágenes (jpeg, jpg, png, webp, gif)';
  return null;
}

module.exports = { validarImagen };
