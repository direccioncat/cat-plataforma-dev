const Joi = require('joi');
const { ROLES_VALIDOS_SA, MAX_TURNO_IDS, UUID_REGEX, LEGAJO_REGEX } = require('../../config');

const postulacionSchema = Joi.object({
  legajo: Joi.string().pattern(LEGAJO_REGEX).required().messages({
    'string.pattern.base': 'Formato de legajo inválido',
    'any.required': 'Legajo y rol son obligatorios',
  }),
  rol_solicitado: Joi.string().valid(...ROLES_VALIDOS_SA).required().messages({
    'any.only': 'Rol inválido',
    'any.required': 'Legajo y rol son obligatorios',
  }),
  todos_los_turnos: Joi.boolean().optional().default(false),
  turno_ids: Joi.when('todos_los_turnos', {
    is: true,
    then: Joi.array().optional().default([]),
    otherwise: Joi.array().items(Joi.string()).min(1).max(MAX_TURNO_IDS).required().messages({
      'array.min': 'Seleccioná al menos un turno',
      'array.max': 'Demasiados turnos seleccionados',
    }),
  }),
});

function validarUUID(token) {
  return UUID_REGEX.test(token);
}

function validarTurnoIdsUUID(turnoIds) {
  return turnoIds.every(id => UUID_REGEX.test(id));
}

module.exports = { postulacionSchema, validarUUID, validarTurnoIdsUUID };
