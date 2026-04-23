require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Migrando: columna nombre en sa_turnos...\n');

    await client.query(`
      ALTER TABLE sa_turnos
        ADD COLUMN IF NOT EXISTS nombre TEXT;
    `);
    console.log('✓ sa_turnos: columna nombre agregada');

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
