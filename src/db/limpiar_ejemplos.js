const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cat_plataforma',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function limpiarDatos() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Servicios adicionales y sus dependencias (cascade por FK)
    await client.query('DELETE FROM servicios_adicionales');
    console.log('OK - servicios_adicionales');

    // OS adicionales y sus dependencias
    await client.query('DELETE FROM os_adicional');
    console.log('OK - os_adicional');

    // OS ordinarias y sus dependencias
    await client.query('DELETE FROM ordenes_servicio');
    console.log('OK - ordenes_servicio');

    await client.query('COMMIT');
    console.log('Limpieza completa.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

limpiarDatos();
