require('dotenv').config();
const pool = require('./pool');

async function run() {
  const client = await pool.connect();
  try {
    console.log('Aplicando migración estado_turno...');

    await client.query(`
      ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS estado_turno TEXT DEFAULT 'fuera_turno'
        CHECK (estado_turno IN ('libre', 'en_mision', 'fuera_turno'));
    `);
    console.log('✓ profiles: columna estado_turno agregada');

    // El agente de prueba arranca libre
    await client.query(`
      UPDATE profiles SET estado_turno = 'libre' WHERE role = 'agente';
    `);
    console.log('✓ Agentes existentes seteados a libre');

    console.log('\n✅ Listo.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
