require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Migrando: categoria en os_adicional_recursos...\n');

    await client.query(`
      ALTER TABLE os_adicional_recursos
        ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'elemento'
          CHECK (categoria IN ('vehiculo','elemento'));
    `);
    console.log('✓ columna categoria agregada a os_adicional_recursos');

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
