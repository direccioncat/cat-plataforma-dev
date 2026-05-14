require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Migrando: sa_recursos_estado...\n');

    await client.query(`
      CREATE TABLE IF NOT EXISTS sa_recursos_estado (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        servicio_id UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
        recurso_id  UUID REFERENCES os_adicional_recursos(id) ON DELETE CASCADE NOT NULL,
        estado      TEXT NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente','solicitado','confirmado','no_disponible')),
        observacion TEXT,
        updated_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_by  UUID REFERENCES profiles(id),
        UNIQUE(servicio_id, recurso_id)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sa_recursos_estado_servicio ON sa_recursos_estado(servicio_id);`);

    console.log('✓ sa_recursos_estado');
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
