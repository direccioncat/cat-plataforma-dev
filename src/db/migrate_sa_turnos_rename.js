require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Normalizando nombres de columnas en sa_turnos...\n');

    // Renombrar dot_* a dotacion_* para consistencia
    await client.query('ALTER TABLE sa_turnos RENAME COLUMN dot_agentes TO dotacion_agentes;');
    await client.query('ALTER TABLE sa_turnos RENAME COLUMN dot_supervisores TO dotacion_supervisores;');
    await client.query('ALTER TABLE sa_turnos RENAME COLUMN dot_choferes TO dotacion_choferes;');

    // Eliminar columna observaciones que no usamos
    await client.query('ALTER TABLE sa_turnos DROP COLUMN IF EXISTS observaciones;');

    console.log('✓ sa_turnos: columnas renombradas');
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
