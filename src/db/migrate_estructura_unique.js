require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Migrando: sa_estructura unique constraint...\n');

    // Eliminar constraint vieja
    await client.query(`
      ALTER TABLE sa_estructura
        DROP CONSTRAINT IF EXISTS sa_estructura_servicio_id_agente_id_key;
    `);
    console.log('✓ constraint vieja eliminada');

    // Nueva: un agente puede estar en múltiples turnos del mismo servicio
    await client.query(`
      ALTER TABLE sa_estructura
        ADD CONSTRAINT sa_estructura_servicio_agente_turno_key
        UNIQUE (servicio_id, agente_id, turno_id);
    `);
    console.log('✓ nueva constraint: UNIQUE(servicio_id, agente_id, turno_id)');

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
