const Joi = require('joi');

const crearSancionSchema = Joi.object({
  agente_id: Joi.string().uuid().required().messages({ 'any.required': 'agente_id requerido' }),
  motivo: Joi.string().required().messages({ 'any.required': 'Motivo requerido' }),
  fecha_inicio: Joi.string().required().messages({ 'any.required': 'fecha_inicio requerida' }),
  fecha_fin: Joi.string().required().messages({ 'any.required': 'fecha_fin requerida' }),
  propuesto_por: Joi.string().uuid().optional().allow(null, ''),
});

const actualizarSancionSchema = Joi.object({
  motivo: Joi.string().required(),
  fecha_inicio: Joi.string().required(),
  fecha_fin: Joi.string().required(),
  propuesto_por: Joi.string().uuid().optional().allow(null, ''),
});

module.exports = { crearSancionSchema, actualizarSancionSchema };
