require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS area TEXT;`);
    console.log('✓ profiles.area agregada');
  } catch (err) {
    console.error('❌', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
