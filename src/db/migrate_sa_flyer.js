require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Migrando: campos flyer en servicios_adicionales...\n');

    await client.query(`
      ALTER TABLE servicios_adicionales
        ADD COLUMN IF NOT EXISTS ubicacion          TEXT,
        ADD COLUMN IF NOT EXISTS turnos_habilitados TEXT,
        ADD COLUMN IF NOT EXISTS modalidad_contrato TEXT DEFAULT 'Todas las modalidades',
        ADD COLUMN IF NOT EXISTS link_postulacion   TEXT,
        ADD COLUMN IF NOT EXISTS vigencia_link_hs   INTEGER DEFAULT 24;
    `);
    console.log('✓ campos flyer agregados');

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
