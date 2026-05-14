require('dotenv').config();
const pool = require('./pool');

async function run() {
  await pool.query(`
    INSERT INTO sa_scoring_config (clave, valor, tipo, descripcion)
    VALUES ('penalizacion_ausencia_justificada_puntos', '0', 'number',
            'Puntos que suma una ausencia justificada al score. 0 = no afecta el puntaje.')
    ON CONFLICT (clave) DO NOTHING
  `);
  console.log('✓ Clave penalizacion_ausencia_justificada_puntos insertada');
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
