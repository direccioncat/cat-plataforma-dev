require('dotenv').config();
const pool = require('./pool');

async function run() {
  await pool.query(`
    ALTER TABLE sa_presentismo
    ADD COLUMN IF NOT EXISTS ausencia_justificada BOOLEAN NOT NULL DEFAULT false
  `);
  console.log('✓ Columna ausencia_justificada agregada a sa_presentismo');
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
