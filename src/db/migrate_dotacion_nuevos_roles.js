require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE os_adicional_turnos
        ADD COLUMN IF NOT EXISTS dotacion_choferes_gruas  INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS dotacion_coordinadores   INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS dotacion_jefes_operativo INTEGER NOT NULL DEFAULT 0;
    `);
    console.log('✅ Columnas dotacion_choferes_gruas, dotacion_coordinadores, dotacion_jefes_operativo agregadas a os_adicional_turnos');
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
