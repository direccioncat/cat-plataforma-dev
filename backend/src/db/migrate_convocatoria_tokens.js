require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Migrando: sa_convocatoria_tokens...\n');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sa_convocatoria_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        servicio_id UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL UNIQUE,
        token       UUID NOT NULL DEFAULT gen_random_uuid(),
        activo      BOOLEAN NOT NULL DEFAULT true,
        vence_en    TIMESTAMPTZ,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sa_conv_tokens_token ON sa_convocatoria_tokens(token);`);
    console.log('✓ sa_convocatoria_tokens');
    console.log('\n✅ Migración completada.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
migrate();
