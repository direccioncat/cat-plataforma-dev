// ── Configuración central de la aplicación ────────────────────
// Todas las constantes y variables de entorno en un solo lugar.
// El resto de los módulos importan desde acá, nunca desde process.env directamente.

module.exports = {
  // ── Servidor ───────────────────────────────────────────────
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // ── Base de datos ──────────────────────────────────────────
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,

  // ── JWT ────────────────────────────────────────────────────
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',

  // ── CORS ───────────────────────────────────────────────────
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // ── Archivos ───────────────────────────────────────────────
  UPLOADS_DIR: process.env.UPLOADS_DIR || './uploads',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB) || 10,

  // ── Google Maps ────────────────────────────────────────────
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,

  // ── Roles y permisos ───────────────────────────────────────
  ROLES_VALIDOS_SA: ['infante', 'motorizado', 'chofer', 'supervisor', 'coordinador'],
  ROL_LABELS_SA: {
    infante: 'Infante',
    motorizado: 'Motorizado',
    chofer: 'Chofer',
    supervisor: 'Supervisor',
    coordinador: 'Coordinador',
  },

  // ── Servicios Adicionales ──────────────────────────────────
  MAX_TURNO_IDS: 20,
  MAX_MODULOS_DIA: 2,

  // ── Rate limiting ──────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutos
  RATE_LIMIT_GET_MAX: 60,
  RATE_LIMIT_POST_MAX: 5,

  // ── Postulaciones ──────────────────────────────────────────
  LEGAJO_REGEX: /^\d{3,6}$/,
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};
