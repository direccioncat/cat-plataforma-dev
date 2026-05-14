/**
 * migrate_config.js
 * Tabla de configuración del sistema (clave-valor).
 * Usada inicialmente para credenciales SMTP que rotan cada 15 días.
 *
 * Ejecutar: node src/db/migrate_config.js (desde C:\cat-plataforma\backend)
 */
require('dotenv').config();
const pool = require('./pool');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS sistema_config (
        clave          VARCHAR(80) PRIMARY KEY,
        valor          TEXT,
        descripcion    TEXT,
        actualizado_por UUID REFERENCES profiles(id),
        actualizado_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ sistema_config');

    // Insertar claves SMTP con valores vacíos (fallback al .env si están vacíos)
    const claves = [
      ['smtp_host', process.env.SMTP_HOST || 'smtp.office365.com', 'Servidor SMTP (ej: smtp.office365.com)'],
      ['smtp_port', process.env.SMTP_PORT || '587',                'Puerto SMTP (generalmente 587)'],
      ['smtp_user', process.env.SMTP_USER || '',                   'Usuario / casilla de correo institucional'],
      ['smtp_pass', process.env.SMTP_PASS || '',                   'Contraseña de la casilla (rota cada 15 días)'],
      ['smtp_from', process.env.SMTP_FROM || '',                   'Nombre visible del remitente (ej: "CAT DGCAT <casilla@buenosaires.gob.ar>")'],
    ];

    for (const [clave, valor, descripcion] of claves) {
      await client.query(`
        INSERT INTO sistema_config (clave, valor, descripcion)
        VALUES ($1, $2, $3)
        ON CONFLICT (clave) DO NOTHING
      `, [clave, valor, descripcion]);
    }
    console.log('✓ claves SMTP insertadas (sin sobreescribir existentes)');

    await client.query('COMMIT');
    console.log('\n✅ Migración config completada');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
