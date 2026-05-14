const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email requerido',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Contraseña requerida',
  }),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().uuid().required().messages({
    'any.required': 'Token requerido',
  }),
});

module.exports = { loginSchema, refreshSchema };
