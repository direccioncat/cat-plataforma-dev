const Joi = require('joi');

const configSchema = Joi.array().items(
  Joi.object({
    clave: Joi.string().required(),
    valor: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  })
).min(1).required();

const crearServicioSchema = Joi.object({
  os_adicional_id: Joi.string().uuid().required(),
  observaciones:   Joi.string().allow(null, '').optional(),
});

const updateServicioSchema = Joi.object({
  observaciones: Joi.string().allow(null, '').optional(),
}).min(1);

const requerimientosSchema = Joi.object({
  requerimientos: Joi.array().items(
    Joi.object({
      rol:      Joi.string().required(),
      cantidad: Joi.number().integer().min(0).required(),
    })
  ).required(),
});

const crearTurnoSchema = Joi.object({
  fecha:                 Joi.string().required(),
  hora_inicio:           Joi.string().required(),
  hora_fin:              Joi.string().required(),
  nombre:                Joi.string().allow(null, '').optional(),
  dotacion_agentes:      Joi.number().integer().min(0).optional(),
  dotacion_supervisores: Joi.number().integer().min(0).optional(),
  dotacion_choferes:     Joi.number().integer().min(0).optional(),
});

const updateTurnoSchema = Joi.object({
  nombre:                Joi.string().allow(null, '').optional(),
  fecha:                 Joi.string().optional(),
  hora_inicio:           Joi.string().optional(),
  hora_fin:              Joi.string().optional(),
  dotacion_agentes:      Joi.number().integer().min(0).optional(),
  dotacion_supervisores: Joi.number().integer().min(0).optional(),
  dotacion_choferes:     Joi.number().integer().min(0).optional(),
  modulos:               Joi.number().integer().min(0).optional(),
}).min(1);

const estructuraSchema = Joi.object({
  agente_id:         Joi.string().uuid().required(),
  rol:               Joi.string().required(),
  jefe_id:           Joi.string().uuid().allow(null).optional(),
  origen:            Joi.string().optional(),
  tipo_convocatoria: Joi.string().valid('adicional', 'ordinario').optional(),
});

const patchEstructuraSchema = Joi.object({
  jefe_id:           Joi.string().uuid().allow(null).optional(),
  rol:               Joi.string().optional(),
  tipo_convocatoria: Joi.string().valid('adicional', 'ordinario').optional(),
}).min(1);

const postulantesSchema = Joi.object({
  agente_id:       Joi.string().uuid().required(),
  rol_solicitado:  Joi.string().required(),
  todos_los_turnos: Joi.boolean().optional(),
  turnos_ids:      Joi.array().items(Joi.string().uuid()).optional(),
});

const convocatoriaSchema = Joi.object({
  estado:        Joi.string().valid('confirmado', 'rechazado', 'reemplazado').required(),
  observaciones: Joi.string().allow(null, '').optional(),
});

const presentismoSchema = Joi.object({
  registros: Joi.array().items(
    Joi.object({
      agente_id:          Joi.string().uuid().required(),
      presente:           Joi.boolean().required(),
      modulos_acreditados: Joi.number().integer().min(0).optional(),
    })
  ).min(1).required(),
});

const flyerSchema = Joi.object({
  ubicacion:          Joi.string().allow(null, '').optional(),
  turnos_habilitados: Joi.any().optional(),
  modalidad_contrato: Joi.string().allow(null, '').optional(),
  link_postulacion:   Joi.string().allow(null, '').optional(),
  vigencia_link_hs:   Joi.number().optional(),
}).min(1);

const tokenSchema = Joi.object({
  vigencia_hs: Joi.number().positive().optional(),
});

const patchTokenSchema = Joi.object({
  activo: Joi.boolean().required(),
});

module.exports = {
  configSchema, crearServicioSchema, updateServicioSchema, requerimientosSchema,
  crearTurnoSchema, updateTurnoSchema,
  estructuraSchema, patchEstructuraSchema,
  postulantesSchema, convocatoriaSchema, presentismoSchema,
  flyerSchema, tokenSchema, patchTokenSchema,
};
