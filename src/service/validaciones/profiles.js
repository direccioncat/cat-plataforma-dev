const Joi = require('joi');

const crearProfileSchema = Joi.object({
  email: Joi.string().email().required().messages({ 'any.required': 'Email requerido' }),
  password: Joi.string().min(6).required().messages({ 'any.required': 'Contraseña requerida' }),
  role: Joi.string().required().messages({ 'any.required': 'Rol requerido' }),
  nombre_completo: Joi.string().required().messages({ 'any.required': 'Nombre requerido' }),
  base_id: Joi.string().uuid().optional().allow(null, ''),
  turno: Joi.string().optional().allow(null, ''),
  legajo: Joi.string().optional().allow(null, ''),
});

const actualizarProfileSchema = Joi.object({
  nombre_completo: Joi.string().optional(),
  turno: Joi.string().optional().allow(null, ''),
  base_id: Joi.string().uuid().optional().allow(null, ''),
  role: Joi.string().optional(),
  activo: Joi.boolean().optional(),
}).min(1).messages({ 'object.min': 'Sin campos para actualizar' });

const telefonoSchema = Joi.object({
  telefono: Joi.string().min(1).required().messages({ 'any.required': 'Teléfono requerido' }),
});

module.exports = { crearProfileSchema, actualizarProfileSchema, telefonoSchema };
