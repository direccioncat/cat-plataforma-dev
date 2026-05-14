const pool = require('../db/pool');
async function run() {
  await pool.query(`
    ALTER TABLE servicios_adicionales
    ADD COLUMN IF NOT EXISTS servicio_id UUID REFERENCES servicios(id) ON DELETE SET NULL
  `);
  console.log('OK: columna servicio_id agregada a servicios_adicionales');
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
