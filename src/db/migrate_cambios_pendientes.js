const pool = require('../db/pool');
async function run() {
  await pool.query(`
    ALTER TABLE servicios_adicionales
    ADD COLUMN IF NOT EXISTS tiene_cambios_pendientes BOOLEAN DEFAULT false
  `);
  console.log('OK: columna tiene_cambios_pendientes agregada');
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
