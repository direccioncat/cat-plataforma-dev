require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Migrando: estados OS adicional + campo validacion...\n');

    // 1. Agregar columna validado_por y observacion_rechazo
    await client.query(`
      ALTER TABLE os_adicional
        ADD COLUMN IF NOT EXISTS validado_por     UUID REFERENCES profiles(id),
        ADD COLUMN IF NOT EXISTS validado_at      TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS obs_rechazo      TEXT;
    `);
    console.log('✓ columnas validado_por / validado_at / obs_rechazo');

    // 2. Normalizar estados existentes y agregar constraint
    // Primero limpiamos cualquier valor raro
    await client.query(`
      UPDATE os_adicional SET estado = 'borrador'
      WHERE estado NOT IN ('borrador','validacion','validada','rechazada','cumplida');
    `);

    await client.query(`
      ALTER TABLE os_adicional
        DROP CONSTRAINT IF EXISTS os_adicional_estado_check;
    `);
    await client.query(`
      ALTER TABLE os_adicional
        ADD CONSTRAINT os_adicional_estado_check
        CHECK (estado IN ('borrador','validacion','validada','rechazada','cumplida'));
    `);
    console.log('✓ constraint de estados actualizado');

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
