require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Migrando: dotacion_motorizados en turnos...\n');

    await client.query(`
      ALTER TABLE os_adicional_turnos
        ADD COLUMN IF NOT EXISTS dotacion_motorizados INTEGER NOT NULL DEFAULT 0;
    `);
    console.log('✓ os_adicional_turnos: dotacion_motorizados');

    await client.query(`
      ALTER TABLE sa_turnos
        ADD COLUMN IF NOT EXISTS dotacion_motorizados INTEGER NOT NULL DEFAULT 0;
    `);
    console.log('✓ sa_turnos: dotacion_motorizados');

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
