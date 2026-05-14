require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Migrando os_adicional_fases...');

    // Agregar campo fecha a fases
    await client.query(`
      ALTER TABLE os_adicional_fases
      ADD COLUMN IF NOT EXISTS fecha DATE;
    `);
    console.log('  campo fecha agregado a os_adicional_fases');

    console.log('Migracion completada.');
  } catch (err) {
    console.error('Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
