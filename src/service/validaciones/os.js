const Joi = require('joi');

const COMUNAS_CABA = [
  'Comuna 1','Comuna 2','Comuna 3','Comuna 4','Comuna 5','Comuna 6','Comuna 7',
  'Comuna 8','Comuna 9','Comuna 10','Comuna 11','Comuna 12','Comuna 13','Comuna 14','Comuna 15',
];

const crearOsSchema = Joi.object({
  titulo: Joi.string().required().messages({ 'any.required': 'El título es obligatorio' }),
  tipo: Joi.string().valid('ordinaria','adicional','alcoholemia').default('ordinaria'),
  base_id: Joi.string().uuid().optional().allow(null, ''),
  semana_inicio: Joi.string().optional().allow(null, ''),
  semana_fin: Joi.string().optional().allow(null, ''),
});

const actualizarOsSchema = Joi.object({
  titulo: Joi.string().optional().allow(null, ''),
  semana_inicio: Joi.string().optional().allow(null, ''),
  semana_fin: Joi.string().optional().allow(null, ''),
});

const comunaSchema = Joi.object({
  comuna: Joi.string().valid(...COMUNAS_CABA).required().messages({ 'any.required': 'La comuna es obligatoria', 'any.only': 'Comuna inválida' }),
  barrio: Joi.string().optional().allow(null, ''),
});

const turnosItemSchema = Joi.object({
  turnos: Joi.array().items(Joi.object()).min(1).required().messages({ 'any.required': 'Se requiere al menos un turno' }),
  relevos: Joi.array().items(Joi.object()).optional(),
});

const fechasSchema = Joi.object({
  fechas: Joi.array().items(Joi.string()).min(1).required().messages({ 'any.required': 'Se requiere un array de fechas' }),
});

const crearItemSchema = Joi.object({
  tipo: Joi.string().required().messages({ 'any.required': 'Tipo requerido' }),
  descripcion: Joi.string().required().messages({ 'any.required': 'Descripción requerida' }),
  turno: Joi.string().optional().allow(null, ''),
  modo_ubicacion: Joi.string().optional().allow(null, ''),
  calle: Joi.string().optional().allow(null, ''),
  altura: Joi.string().optional().allow(null, ''),
  calle2: Joi.string().optional().allow(null, ''),
  desde: Joi.string().optional().allow(null, ''),
  hasta: Joi.string().optional().allow(null, ''),
  poligono_desc: Joi.string().optional().allow(null, ''),
  poligono_coords: Joi.any().optional().allow(null),
  eje_psv: Joi.string().optional().allow(null, ''),
  cantidad_agentes: Joi.any().optional().allow(null),
  relevo_tipo: Joi.string().optional().allow(null, ''),
  relevo_base_id: Joi.string().uuid().optional().allow(null, ''),
  relevo_turno: Joi.string().optional().allow(null, ''),
  lat: Joi.number().optional().allow(null),
  lng: Joi.number().optional().allow(null),
  place_id: Joi.string().optional().allow(null, ''),
  instrucciones: Joi.string().optional().allow(null, ''),
});

module.exports = { crearOsSchema, actualizarOsSchema, comunaSchema, turnosItemSchema, fechasSchema, crearItemSchema, COMUNAS_CABA };
