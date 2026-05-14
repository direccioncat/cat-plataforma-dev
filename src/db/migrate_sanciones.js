const pool = require('../db/pool');

async function migrate() {
  const client = await pool.connect();
  try {
    // Tabla de sanciones
    await client.query(`
      CREATE TABLE IF NOT EXISTS sa_sanciones (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agente_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        motivo          TEXT NOT NULL,
        propuesto_por   UUID REFERENCES profiles(id),
        fecha_inicio    DATE NOT NULL,
        fecha_fin       DATE NOT NULL,
        creado_por      UUID REFERENCES profiles(id),
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_sa_sanciones_agente ON sa_sanciones(agente_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sa_sanciones_activa ON sa_sanciones(fecha_fin);`);

    // Agregar rol operador_disciplinario al enum si no existe
    // (en PostgreSQL el enum requiere ALTER TYPE, pero como role es text, solo documentamos)

    console.log('Migracion sa_sanciones completada');
  } catch (e) {
    console.error('Error en migracion:', e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
