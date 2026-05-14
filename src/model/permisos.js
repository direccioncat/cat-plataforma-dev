const pool = require('../db/pool');

// ── Definición canónica de permisos ──────────────────────────
const PERMISOS_DEF = [
  // Misiones
  { key: 'MISIONES_CREAR',              modulo: 'Misiones',      label: 'Crear misiones' },
  { key: 'MISIONES_ASIGNAR',            modulo: 'Misiones',      label: 'Asignar misiones a agentes' },
  // Órdenes de servicio
  { key: 'OS_CREAR',                    modulo: 'OS',            label: 'Crear órdenes de servicio' },
  { key: 'OS_ELIMINAR',                 modulo: 'OS',            label: 'Eliminar OS en borrador' },
  // Presupuestos
  { key: 'PRESUPUESTOS_CREAR',          modulo: 'Presupuestos',  label: 'Crear presupuestos' },
  { key: 'PRESUPUESTOS_APROBAR',        modulo: 'Presupuestos',  label: 'Aprobar presupuestos' },
  { key: 'PRESUPUESTOS_RECHAZAR',       modulo: 'Presupuestos',  label: 'Rechazar presupuestos' },
  { key: 'PRESUPUESTOS_ELIMINAR',       modulo: 'Presupuestos',  label: 'Eliminar presupuestos' },
  { key: 'PRESUPUESTOS_MODIFICAR_APROBADO', modulo: 'Presupuestos', label: 'Modificar presupuesto ya aprobado' },
  // Servicios Adicionales
  { key: 'SSAA_CREAR',                  modulo: 'SS.AA.',        label: 'Crear SS.AA. directos' },
  { key: 'SSAA_AVANZAR_ESTADO',         modulo: 'SS.AA.',        label: 'Avanzar estado del servicio' },
  { key: 'SSAA_POSTULANTES',            modulo: 'SS.AA.',        label: 'Gestionar postulantes' },
  { key: 'SSAA_ARMADO',                 modulo: 'SS.AA.',        label: 'Armar turnos (asignar agentes)' },
  { key: 'SSAA_CONVOCATORIA',           modulo: 'SS.AA.',        label: 'Gestionar convocatoria' },
  { key: 'SSAA_PRESENTISMO',            modulo: 'SS.AA.',        label: 'Cargar presentismo y cerrar' },
  { key: 'SSAA_CONFIG_SCORING',         modulo: 'SS.AA.',        label: 'Configurar scoring' },
  { key: 'SSAA_REVISAR_CAMBIOS',        modulo: 'SS.AA.',        label: 'Revisar y resolver cambios post-modificación' },
  // Órdenes de servicio adicional
  { key: 'OS_VALIDAR',                  modulo: 'OS',            label: 'Validar / rechazar OS Adicional' },
  // Servicios pipeline
  { key: 'SERVICIOS_CARGAR_BUI',        modulo: 'Servicios',     label: 'Cargar / editar BUI' },
  { key: 'SERVICIOS_MARCAR_BUI_PAGADA', modulo: 'Servicios',     label: 'Marcar BUI como pagada' },
  { key: 'SERVICIOS_CANCELAR',          modulo: 'Servicios',     label: 'Cancelar servicio' },
  { key: 'SERVICIOS_VINCULAR_OS',       modulo: 'Servicios',     label: 'Vincular OS Adicional' },
  { key: 'SERVICIOS_SOLICITAR_FACTURAS',modulo: 'Servicios',     label: 'Solicitar facturas a agentes' },
  // Cobros
  { key: 'COBROS_NUEVA_LIQUIDACION',    modulo: 'Cobros',        label: 'Crear liquidaciones' },
  { key: 'COBROS_ACTUALIZAR_UF',        modulo: 'Cobros',        label: 'Actualizar valor UF' },
  // Facturación
  { key: 'FACTURACION_APROBAR',         modulo: 'Facturación',   label: 'Aprobar facturas' },
  { key: 'FACTURACION_RECHAZAR',        modulo: 'Facturación',   label: 'Rechazar facturas' },
  { key: 'FACTURACION_SUBSANAR',        modulo: 'Facturación',   label: 'Solicitar subsanación' },
  { key: 'FACTURACION_CONFIG_SMTP',     modulo: 'Facturación',   label: 'Configurar SMTP' },
  // Admin
  { key: 'ADMIN_USUARIOS',              modulo: 'Admin',         label: 'Gestión de usuarios y roles' },
  { key: 'ADMIN_IMPORTAR_NOMINA',       modulo: 'Admin',         label: 'Importar nómina' },
  // Visibilidad de módulos (nav + tabs)
  { key: 'VER_MISIONES',                modulo: 'Visibilidad',   label: 'Ver módulo Misiones' },
  { key: 'VER_OS',                      modulo: 'Visibilidad',   label: 'Ver módulo Órdenes de Servicio' },
  { key: 'VER_OS_ADICIONAL',            modulo: 'Visibilidad',   label: 'Ver módulo OS Adicional' },
  { key: 'VER_SSAA',                    modulo: 'Visibilidad',   label: 'Ver módulo Gestión SS.AA.' },
  { key: 'VER_SERVICIOS',               modulo: 'Visibilidad',   label: 'Ver módulo Servicios' },
  { key: 'VER_PRESUPUESTOS',            modulo: 'Visibilidad',   label: 'Ver módulo Presupuestos' },
  { key: 'VER_COBROS',                  modulo: 'Visibilidad',   label: 'Ver módulo Cobros' },
  { key: 'VER_FACTURACION',             modulo: 'Visibilidad',   label: 'Ver módulo Facturación' },
  { key: 'VER_EQUIPO',                  modulo: 'Visibilidad',   label: 'Ver módulo Mi Equipo' },
  { key: 'VER_NOMINA',                  modulo: 'Visibilidad',   label: 'Ver módulo Nómina' },
];

// Roles se leen dinámicamente desde la tabla `roles` — no hardcodeado acá

// Permisos por defecto por rol
const DEFAULTS = {
  admin: PERMISOS_DEF.map(p => p.key),

  gerencia: [
    'MISIONES_CREAR','MISIONES_ASIGNAR',
    'OS_CREAR','OS_ELIMINAR','OS_VALIDAR',
    'PRESUPUESTOS_CREAR','PRESUPUESTOS_APROBAR','PRESUPUESTOS_RECHAZAR','PRESUPUESTOS_ELIMINAR','PRESUPUESTOS_MODIFICAR_APROBADO',
    'SSAA_CREAR','SSAA_AVANZAR_ESTADO',
    'SSAA_POSTULANTES','SSAA_ARMADO','SSAA_CONVOCATORIA','SSAA_PRESENTISMO',
    'SSAA_CONFIG_SCORING',
    'SERVICIOS_CARGAR_BUI','SERVICIOS_MARCAR_BUI_PAGADA','SERVICIOS_CANCELAR',
    'SERVICIOS_VINCULAR_OS','SERVICIOS_SOLICITAR_FACTURAS',
    'COBROS_NUEVA_LIQUIDACION','COBROS_ACTUALIZAR_UF',
    'FACTURACION_APROBAR','FACTURACION_RECHAZAR','FACTURACION_SUBSANAR',
    'VER_MISIONES','VER_OS','VER_OS_ADICIONAL','VER_SSAA',
    'VER_SERVICIOS','VER_PRESUPUESTOS','VER_COBROS','VER_FACTURACION','VER_EQUIPO','VER_NOMINA',
  ],

  director: [
    'OS_CREAR','OS_VALIDAR',
    'PRESUPUESTOS_APROBAR','PRESUPUESTOS_RECHAZAR','PRESUPUESTOS_MODIFICAR_APROBADO',
    'SSAA_CONFIG_SCORING',
    'COBROS_NUEVA_LIQUIDACION',
    'FACTURACION_APROBAR','FACTURACION_RECHAZAR',
    'VER_OS','VER_OS_ADICIONAL','VER_SSAA',
    'VER_SERVICIOS','VER_PRESUPUESTOS','VER_COBROS','VER_FACTURACION',
  ],

  jefe_base: [
    'MISIONES_CREAR','MISIONES_ASIGNAR',
    'OS_CREAR',
    'VER_MISIONES','VER_OS','VER_EQUIPO','VER_NOMINA',
  ],

  jefe_cgm: [
    'OS_CREAR','OS_VALIDAR',
    'PRESUPUESTOS_CREAR',
    'SSAA_CREAR','SSAA_AVANZAR_ESTADO',
    'SSAA_POSTULANTES','SSAA_ARMADO','SSAA_CONVOCATORIA','SSAA_PRESENTISMO',
    'SSAA_CONFIG_SCORING','SSAA_REVISAR_CAMBIOS',
    'SERVICIOS_CARGAR_BUI','SERVICIOS_VINCULAR_OS',
    'VER_OS','VER_OS_ADICIONAL','VER_SSAA','VER_SERVICIOS','VER_PRESUPUESTOS','VER_EQUIPO','VER_NOMINA',
  ],

  coordinador: [
    'MISIONES_ASIGNAR',
    'VER_MISIONES','VER_EQUIPO',
  ],

  coordinador_cgm: [
    'OS_CREAR',
    'SSAA_ARMADO','SSAA_CONVOCATORIA','SSAA_PRESENTISMO',
    'VER_OS','VER_OS_ADICIONAL','VER_SSAA',
  ],

  planeamiento: [
    'OS_CREAR',
    'VER_OS',
  ],

  operador_adicionales: [
    'PRESUPUESTOS_CREAR','PRESUPUESTOS_MODIFICAR_APROBADO',
    'SSAA_CREAR','SSAA_AVANZAR_ESTADO',
    'SSAA_POSTULANTES','SSAA_ARMADO','SSAA_CONVOCATORIA','SSAA_PRESENTISMO',
    'SSAA_CONFIG_SCORING','SSAA_REVISAR_CAMBIOS',
    'SERVICIOS_CARGAR_BUI','SERVICIOS_VINCULAR_OS','SERVICIOS_SOLICITAR_FACTURAS',
    'COBROS_NUEVA_LIQUIDACION',
    'FACTURACION_SUBSANAR',
    'VER_SSAA','VER_OS_ADICIONAL','VER_SERVICIOS','VER_PRESUPUESTOS','VER_COBROS','VER_FACTURACION',
  ],

  operador_disciplinario: [],
  supervisor:             ['MISIONES_ASIGNAR', 'VER_MISIONES', 'VER_EQUIPO'],
  agente:                 ['VER_MISIONES'],
};

// ── Cache en memoria ──────────────────────────────────────────
let cache = null;
let cacheTs = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getCache() {
  if (cache && (Date.now() - cacheTs) < CACHE_TTL) return cache;
  const [rolesRes, permisosRes] = await Promise.all([
    pool.query('SELECT key FROM roles'),
    pool.query('SELECT rol, permiso_key FROM rol_permisos'),
  ]);
  const map = {};
  for (const r of rolesRes.rows) map[r.key] = [];
  for (const row of permisosRes.rows) {
    if (!map[row.rol]) map[row.rol] = [];
    map[row.rol].push(row.permiso_key);
  }
  cache = map;
  cacheTs = Date.now();
  return cache;
}

function invalidarCache() { cache = null; }

async function getPermisosRol(rol) {
  const map = await getCache();
  return map[rol] || [];
}

async function getTodosLosPermisos() {
  return getCache();
}

async function setPermisosRol(rol, permisoKeys) {
  // Validar que el rol existe en la tabla de roles
  const rolCheck = await pool.query('SELECT key FROM roles WHERE key=$1', [rol]);
  if (!rolCheck.rows[0]) throw new Error(`Rol "${rol}" no encontrado`);
  const validos = permisoKeys.filter(k => PERMISOS_DEF.some(p => p.key === k));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM rol_permisos WHERE rol = $1', [rol]);
    for (const key of validos)
      await client.query('INSERT INTO rol_permisos (rol, permiso_key) VALUES ($1, $2)', [rol, key]);
    await client.query('COMMIT');
    invalidarCache();
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function migrate() {
  // Primero migrar tabla de roles
  const { migrate: migrateRoles } = require('./roles');
  await migrateRoles();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rol_permisos (
      rol         VARCHAR(60) NOT NULL,
      permiso_key VARCHAR(60) NOT NULL,
      PRIMARY KEY (rol, permiso_key)
    )
  `);

  // Siempre hacer upsert de los defaults para los permisos definidos en PERMISOS_DEF.
  // ON CONFLICT DO NOTHING: no pisa cambios manuales, solo agrega los que faltan.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [rol, keys] of Object.entries(DEFAULTS))
      for (const key of keys)
        await client.query(
          'INSERT INTO rol_permisos (rol, permiso_key) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [rol, key]
        );
    await client.query('COMMIT');
    console.log('[permisos] Migración completada — permisos nuevos aplicados.');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { PERMISOS_DEF, getPermisosRol, getTodosLosPermisos, setPermisosRol, migrate };
