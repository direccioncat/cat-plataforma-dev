require('dotenv').config();
const pool = require('./pool');

async function fixSchema() {
  const client = await pool.connect();
  try {
    console.log('Aplicando ajustes de schema...');

    // 1. Eliminar columna redundante es_mision de os_items
    await client.query(`
      ALTER TABLE os_items DROP COLUMN IF EXISTS es_mision;
    `);
    console.log('✓ os_items: columna es_mision eliminada (redundante con campo tipo)');

    // 2. Agregar campo tipo a misiones
    await client.query(`
      ALTER TABLE misiones 
        ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'servicio' 
        CHECK (tipo IN ('servicio','mision'));
    `);
    console.log('✓ misiones: columna tipo agregada (servicio/mision)');

    // 3. Agregar número correlativo a ordenes_servicio
    await client.query(`
      ALTER TABLE ordenes_servicio 
        ADD COLUMN IF NOT EXISTS numero SERIAL;
    `);
    // Crear secuencia única por base
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS os_numero_seq;
    `);
    // Reemplazar con campo entero simple (SERIAL ya lo maneja)
    console.log('✓ ordenes_servicio: columna numero agregada (correlativo)');

    console.log('\n✅ Ajustes de schema completados.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchema();
