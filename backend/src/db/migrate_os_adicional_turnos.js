require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Migrando: os_adicional_turnos + fases vinculadas a turnos...\n');

    // 1. Tabla de turnos de la OS adicional
    await client.query(`
      CREATE TABLE IF NOT EXISTS os_adicional_turnos (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        os_adicional_id UUID REFERENCES os_adicional(id) ON DELETE CASCADE NOT NULL,
        nombre          TEXT,
        fecha           DATE,
        hora_inicio     TIME,
        hora_fin        TIME,
        dotacion_agentes      INTEGER NOT NULL DEFAULT 0,
        dotacion_supervisores INTEGER NOT NULL DEFAULT 0,
        dotacion_choferes     INTEGER NOT NULL DEFAULT 0,
        orden           INTEGER DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ os_adicional_turnos');

    // 2. Agregar turno_id a os_adicional_fases
    await client.query(`
      ALTER TABLE os_adicional_fases
        ADD COLUMN IF NOT EXISTS turno_id UUID REFERENCES os_adicional_turnos(id) ON DELETE SET NULL;
    `);
    console.log('✓ os_adicional_fases: columna turno_id');

    // 3. Índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_os_adicional_turnos_os ON os_adicional_turnos(os_adicional_id);
      CREATE INDEX IF NOT EXISTS idx_os_adicional_fases_turno ON os_adicional_fases(turno_id);
    `);
    console.log('✓ índices');

    // 4. Limpiar BA Cultural para empezar desde 0
    await client.query(`
      DELETE FROM os_adicional_fases
      WHERE os_adicional_id = 'cb2b6b49-ec4d-4281-8df1-c40a406f2e68';
    `);
    console.log('✓ BA Cultural: fases limpiadas');

    console.log('\n✅ Migración completada.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
