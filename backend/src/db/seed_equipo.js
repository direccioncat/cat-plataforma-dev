/**
 * seed_equipo.js
 * Crea usuarios de prueba para ver el organigrama completo:
 * 1 jefe_base + 1 coordinador + 2 supervisores + 5 agentes
 * Todos en Base Central.
 */
const bcrypt = require('bcryptjs');
const pool   = require('./pool');

const BASE_ID = '6677c27b-a0cf-43d9-b17c-f6638d54c5bc';

const USUARIOS = [
  {
    nombre_completo: 'Roberto Sánchez',
    email:           'rsanchez@buenosaires.gob.ar',
    role:            'jefe_base',
    turno:           null,
    legajo:          '01001',
    estado_turno:    'fuera_turno',
  },
  {
    nombre_completo: 'Laura Méndez',
    email:           'lmendez@buenosaires.gob.ar',
    role:            'coordinador',
    turno:           'manana',
    legajo:          '02001',
    estado_turno:    'fuera_turno',
  },
  {
    nombre_completo: 'Diego Herrera',
    email:           'dherrera@buenosaires.gob.ar',
    role:            'supervisor',
    turno:           'manana',
    legajo:          '03001',
    estado_turno:    'libre',
  },
  {
    nombre_completo: 'Valeria Torres',
    email:           'vtorres@buenosaires.gob.ar',
    role:            'supervisor',
    turno:           'tarde',
    legajo:          '03002',
    estado_turno:    'fuera_turno',
  },
  {
    nombre_completo: 'Pablo Romero',
    email:           'promero@buenosaires.gob.ar',
    role:            'agente',
    turno:           'manana',
    legajo:          '04001',
    estado_turno:    'libre',
  },
  {
    nombre_completo: 'Natalia Fernández',
    email:           'nfernandez@buenosaires.gob.ar',
    role:            'agente',
    turno:           'manana',
    legajo:          '04002',
    estado_turno:    'en_mision',
  },
  {
    nombre_completo: 'Marcos Giménez',
    email:           'mgimenez@buenosaires.gob.ar',
    role:            'agente',
    turno:           'manana',
    legajo:          '04003',
    estado_turno:    'libre',
  },
  {
    nombre_completo: 'Carolina López',
    email:           'clopez@buenosaires.gob.ar',
    role:            'agente',
    turno:           'tarde',
    legajo:          '04004',
    estado_turno:    'fuera_turno',
  },
  {
    nombre_completo: 'Facundo Álvarez',
    email:           'falvarez@buenosaires.gob.ar',
    role:            'agente',
    turno:           'tarde',
    legajo:          '04005',
    estado_turno:    'fuera_turno',
  },
];

async function main() {
  const hash = await bcrypt.hash('Test2025!', 10);

  let creados = 0;
  let omitidos = 0;

  for (const u of USUARIOS) {
    try {
      await pool.query(
        `INSERT INTO profiles
           (email, password_hash, role, base_id, turno, legajo, nombre_completo, estado_turno)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO NOTHING`,
        [u.email, hash, u.role, BASE_ID, u.turno, u.legajo, u.nombre_completo, u.estado_turno]
      );
      creados++;
      console.log(`  ✓ ${u.role.padEnd(14)} ${u.nombre_completo}`);
    } catch (err) {
      console.warn(`  ✗ ${u.nombre_completo}: ${err.message}`);
      omitidos++;
    }
  }

  console.log(`\nListo: ${creados} creados, ${omitidos} omitidos.`);
  console.log(`Password para todos: Test2025!`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
