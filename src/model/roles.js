const pool = require('../db/pool');

// Roles del sistema (no se pueden eliminar desde la UI)
const ROLES_SISTEMA = [
  { key: 'admin',                  label: 'Admin',                  descripcion: 'Acceso total al sistema',                                  color: '#636366', bg: '#f5f5f7' },
  { key: 'gerencia',               label: 'Gerencia',               descripcion: 'Aprueba presupuestos, facturas y configuración',           color: '#1a2744', bg: '#eef1f8' },
  { key: 'director',               label: 'Director',               descripcion: 'Aprueba presupuestos y liquidaciones',                     color: '#185fa5', bg: '#e8f0fe' },
  { key: 'jefe_base',              label: 'Jefe de base',           descripcion: 'Gestión operativa de su base',                            color: '#0f6e56', bg: '#e8faf2' },
  { key: 'jefe_cgm',               label: 'Jefe CGM',               descripcion: 'Acceso a SS.AA., OS adicional y presupuestos',            color: '#0369a1', bg: '#e0f2fe' },
  { key: 'coordinador',            label: 'Coordinador',            descripcion: 'Asignación y seguimiento de misiones',                    color: '#534ab7', bg: '#eeecff' },
  { key: 'coordinador_cgm',        label: 'Coordinador CGM',        descripcion: 'Gestión de OS adicional',                                 color: '#6d28d9', bg: '#f0ebff' },
  { key: 'planeamiento',           label: 'Planeamiento',           descripcion: 'Acceso a órdenes de servicio',                            color: '#854f0b', bg: '#fff8e6' },
  { key: 'operador_adicionales',   label: 'Operador SS.AA.',        descripcion: 'Gestión completa de servicios adicionales y facturación', color: '#c47f00', bg: '#fffbe6' },
  { key: 'operador_disciplinario', label: 'Operador disciplinario', descripcion: 'Gestión de sanciones',                                    color: '#b91c1c', bg: '#fef2f2' },
  { key: 'supervisor',             label: 'Supervisor',             descripcion: 'Asignación de misiones en campo',                         color: '#4338ca', bg: '#eef2ff' },
  { key: 'agente',                 label: 'Agente',                 descripcion: 'Solo ve sus propias misiones',                            color: '#8e8e93', bg: '#f5f5f7' },
];

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      key         VARCHAR(60) PRIMARY KEY,
      label       TEXT NOT NULL,
      descripcion TEXT    DEFAULT '',
      color       TEXT    DEFAULT '#636366',
      bg          TEXT    DEFAULT '#f5f5f7',
      es_sistema  BOOLEAN DEFAULT false,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  for (const r of ROLES_SISTEMA) {
    await pool.query(
      `INSERT INTO roles (key, label, descripcion, color, bg, es_sistema)
       VALUES ($1,$2,$3,$4,$5,true)
       ON CONFLICT (key) DO NOTHING`,
      [r.key, r.label, r.descripcion, r.color, r.bg]
    );
  }
}

async function getRoles() {
  const res = await pool.query(
    'SELECT * FROM roles ORDER BY es_sistema DESC, created_at ASC'
  );
  return res.rows;
}

async function getRolByKey(key) {
  const res = await pool.query('SELECT * FROM roles WHERE key=$1', [key]);
  return res.rows[0] || null;
}

async function createRol({ key, label, descripcion, color, bg }) {
  const res = await pool.query(
    `INSERT INTO roles (key, label, descripcion, color, bg, es_sistema)
     VALUES ($1,$2,$3,$4,$5,false)
     RETURNING *`,
    [key, label, descripcion || '', color || '#636366', bg || '#f5f5f7']
  );
  return res.rows[0];
}

async function updateRol(key, { label, descripcion, color, bg }) {
  const res = await pool.query(
    `UPDATE roles SET label=$2, descripcion=$3, color=$4, bg=$5
     WHERE key=$1 RETURNING *`,
    [key, label, descripcion || '', color, bg]
  );
  return res.rows[0] || null;
}

async function deleteRol(key) {
  const check = await pool.query('SELECT es_sistema FROM roles WHERE key=$1', [key]);
  if (!check.rows[0])              throw new Error('Rol no encontrado');
  if (check.rows[0].es_sistema)   throw new Error('No se puede eliminar un rol del sistema');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM rol_permisos WHERE rol=$1', [key]);
    await client.query('DELETE FROM roles WHERE key=$1', [key]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { ROLES_SISTEMA, migrate, getRoles, getRolByKey, createRol, updateRol, deleteRol };
