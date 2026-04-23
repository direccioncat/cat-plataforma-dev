const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'cat_plataforma',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max:                20,    // maximo de conexiones en el pool
  idleTimeoutMillis:  30000, // cerrar conexiones ociosas despues de 30s
  connectionTimeoutMillis: 5000, // timeout al obtener una conexion del pool
});

pool.on('error', (err) => {
  console.error('Error inesperado en cliente PostgreSQL:', err);
});

module.exports = pool;
