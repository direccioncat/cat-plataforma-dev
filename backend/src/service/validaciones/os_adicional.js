const Joi = require('joi');

const ESTADOS_VALIDOS = ['borrador','validacion','validada','rechazada','cumplida'];
const ROLES_VALIDAR   = ['admin','director','gerencia','jefe_cgm'];

const crearOsAdicionalSchema = Joi.object({
  nombre: Joi.string().optional().allow(null, ''),
  evento_motivo: Joi.string().optional().allow(null, ''),
  base_id: Joi.string().uuid().optional().allow(null, ''),
  horario_desde: Joi.string().optional().allow(null, ''),
  horario_hasta: Joi.string().optional().allow(null, ''),
  dotacion_agentes: Joi.number().integer().min(0).optional().default(0),
  dotacion_supervisores: Joi.number().integer().min(0).optional().default(0),
  dotacion_motorizados: Joi.number().integer().min(0).optional().default(0),
  observaciones: Joi.string().optional().allow(null, ''),
  fechas: Joi.array().items(Joi.string()).optional().default([]),
  recursos: Joi.array().items(Joi.object()).optional().default([]),
});

const estadoSchema = Joi.object({
  estado: Joi.string().valid(...ESTADOS_VALIDOS).required().messages({ 'any.only': 'Estado inválido' }),
});

const rechazarSchema = Joi.object({
  obs_rechazo: Joi.string().optional().allow(null, ''),
});

module.exports = { crearOsAdicionalSchema, estadoSchema, rechazarSchema, ROLES_VALIDAR };
