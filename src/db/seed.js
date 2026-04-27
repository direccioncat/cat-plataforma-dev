require('dotenv').config();
const pool = require('./pool');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Iniciando seed...');

    // Base principal
    const baseRes = await client.query(`
      INSERT INTO bases (nombre, direccion)
      VALUES ('Base Central', 'Av. Corrientes 1000, CABA')
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);

    let baseId;
    if (baseRes.rows.length > 0) {
      baseId = baseRes.rows[0].id;
    } else {
      const existing = await client.query(`SELECT id FROM bases WHERE nombre = 'Base Central' LIMIT 1`);
      baseId = existing.rows[0].id;
    }
    console.log('✓ Base Central creada, id:', baseId);

    // Admin
    const adminHash = await bcrypt.hash('Cat2025!', 10);
    await client.query(`
      INSERT INTO profiles (email, password_hash, role, base_id, nombre_completo, legajo)
      VALUES ($1, $2, 'admin', $3, 'Administrador CAT', '00001')
      ON CONFLICT (email) DO NOTHING;
    `, ['aricciardiwolfenson@buenosaires.gob.ar', adminHash, baseId]);
    console.log('✓ Usuario admin creado');

    // Agente de prueba
    const agenteHash = await bcrypt.hash('Agente2025!', 10);
    await client.query(`
      INSERT INTO profiles (email, password_hash, role, base_id, turno, nombre_completo, legajo)
      VALUES ($1, $2, 'agente', $3, 'mañana', 'Cristian Menéndez', '04230')
      ON CONFLICT (email) DO NOTHING;
    `, ['cmenendez@buenosaires.gob.ar', agenteHash, baseId]);
    console.log('✓ Agente de prueba creado');

    console.log('\n✅ Seed completado exitosamente.');
    console.log('   Admin:  aricciardiwolfenson@buenosaires.gob.ar / Cat2025!');
    console.log('   Agente: cmenendez@buenosaires.gob.ar / Agente2025!');

  } catch (err) {
    console.error('❌ Error en seed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
