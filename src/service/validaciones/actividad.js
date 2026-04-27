const Joi = require('joi');

const crearActividadSchema = Joi.object({
  tipo: Joi.string().required().messages({ 'any.required': 'Tipo requerido' }),
  descripcion: Joi.string().required().messages({ 'any.required': 'Descripción requerida' }),
  mision_id: Joi.string().uuid().optional().allow(null, ''),
  metadata: Joi.object().optional().allow(null),
});

module.exports = { crearActividadSchema };
