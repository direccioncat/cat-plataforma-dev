const Joi = require('joi');

const crearMisionSchema = Joi.object({
  titulo: Joi.string().required().messages({ 'any.required': 'Título requerido' }),
  turno: Joi.string().required().messages({ 'any.required': 'Turno requerido' }),
  base_id: Joi.string().uuid().optional().allow(null, ''),
  descripcion: Joi.string().optional().allow(null, ''),
  fecha: Joi.string().optional().allow(null, ''),
  tipo: Joi.string().optional().allow(null, ''),
  modo_ubicacion: Joi.string().optional().allow(null, ''),
  calle: Joi.string().optional().allow(null, ''),
  altura: Joi.string().optional().allow(null, ''),
  calle2: Joi.string().optional().allow(null, ''),
  desde: Joi.string().optional().allow(null, ''),
  hasta: Joi.string().optional().allow(null, ''),
  poligono_desc: Joi.string().optional().allow(null, ''),
  eje_psv: Joi.string().optional().allow(null, ''),
  lat: Joi.number().optional().allow(null),
  lng: Joi.number().optional().allow(null),
  os_item_id: Joi.string().uuid().optional().allow(null, ''),
});

const asignarSchema = Joi.object({
  agente_ids: Joi.array().items(Joi.string().uuid()).min(1).required().messages({ 'any.required': 'Se requiere al menos un agente' }),
  encargado_id: Joi.string().uuid().optional().allow(null, ''),
});

const interrumpirSchema = Joi.object({
  motivo: Joi.string().required().messages({ 'any.required': 'Motivo requerido' }),
});

const cerrarSchema = Joi.object({
  observaciones: Joi.string().optional().allow(null, ''),
});

module.exports = { crearMisionSchema, asignarSchema, interrumpirSchema, cerrarSchema };
