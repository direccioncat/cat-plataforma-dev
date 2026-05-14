/**
 * Migración: SS.AA. de creación directa (sin pipeline Presupuesto → OS → SA)
 * - Hace nullable os_adicional_id
 * - Agrega columnas propias para nombre, evento, base, horario, dotación y número externo
 */
const pool = require('./pool');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE servicios_adicionales
        ALTER COLUMN os_adicional_id DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS sa_nombre               TEXT,
        ADD COLUMN IF NOT EXISTS sa_evento               TEXT,
        ADD COLUMN IF NOT EXISTS sa_base_id              UUID REFERENCES bases(id),
        ADD COLUMN IF NOT EXISTS sa_horario_desde        TIME,
        ADD COLUMN IF NOT EXISTS sa_horario_hasta        TIME,
        ADD COLUMN IF NOT EXISTS sa_dotacion_agentes     INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sa_dotacion_supervisores INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sa_dotacion_motorizados  INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS numero_externo          TEXT
    `);

    await client.query('COMMIT');
    console.log('✅ Migración migrate_sa_directa completada');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error en migración:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
