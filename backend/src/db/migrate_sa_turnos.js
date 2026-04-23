require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Migrando: turnos de servicios adicionales...\n');

    // 1. Tabla de turnos
    await client.query(`
      CREATE TABLE IF NOT EXISTS sa_turnos (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        servicio_id     UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
        fecha           DATE NOT NULL,
        hora_inicio     TIME NOT NULL,
        hora_fin        TIME NOT NULL,
        dotacion_agentes      INTEGER NOT NULL DEFAULT 0,
        dotacion_supervisores INTEGER NOT NULL DEFAULT 0,
        dotacion_choferes     INTEGER NOT NULL DEFAULT 0,
        modulos             INTEGER NOT NULL DEFAULT 0,
        orden           INTEGER DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ sa_turnos');

    // 2. Tabla postulante → turnos específicos (si no va a todos)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sa_postulante_turnos (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        postulante_id   UUID REFERENCES sa_postulantes(id) ON DELETE CASCADE NOT NULL,
        turno_id        UUID REFERENCES sa_turnos(id) ON DELETE CASCADE NOT NULL,
        UNIQUE(postulante_id, turno_id)
      );
    `);
    console.log('✓ sa_postulante_turnos');

    // 3. Agregar todos_los_turnos a sa_postulantes
    await client.query(`
      ALTER TABLE sa_postulantes
        ADD COLUMN IF NOT EXISTS todos_los_turnos BOOLEAN NOT NULL DEFAULT true;
    `);
    console.log('✓ sa_postulantes: columna todos_los_turnos');

    // 4. Agregar turno_id y tipo_convocatoria a sa_estructura
    await client.query(`
      ALTER TABLE sa_estructura
        ADD COLUMN IF NOT EXISTS turno_id UUID REFERENCES sa_turnos(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS tipo_convocatoria TEXT NOT NULL DEFAULT 'adicional'
          CHECK (tipo_convocatoria IN ('adicional','ordinario'));
    `);
    console.log('✓ sa_estructura: turno_id + tipo_convocatoria');

    // 5. Agregar turno_id a sa_presentismo
    await client.query(`
      ALTER TABLE sa_presentismo
        ADD COLUMN IF NOT EXISTS turno_id UUID REFERENCES sa_turnos(id) ON DELETE CASCADE;
    `);
    // Cambiar UNIQUE constraint para incluir turno_id
    await client.query(`
      ALTER TABLE sa_presentismo
        DROP CONSTRAINT IF EXISTS sa_presentismo_servicio_id_agente_id_key;
    `);
    await client.query(`
      ALTER TABLE sa_presentismo
        ADD CONSTRAINT sa_presentismo_servicio_agente_turno_key
        UNIQUE(servicio_id, agente_id, turno_id);
    `);
    console.log('✓ sa_presentismo: turno_id');

    // 6. Actualizar config: modulo = 4hs, max_modulos_dia = 3
    await client.query(`
      UPDATE sa_scoring_config SET valor = '4' WHERE clave = 'modulo_duracion_horas';
    `);
    await client.query(`
      INSERT INTO sa_scoring_config (clave, valor, tipo, descripcion)
      VALUES ('max_modulos_dia', '3', 'number', 'Máximo de módulos por agente por día')
      ON CONFLICT (clave) DO UPDATE SET valor = '3';
    `);
    console.log('✓ sa_scoring_config: modulo=4hs, max_modulos_dia=3');

    // 7. Índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sa_turnos_servicio ON sa_turnos(servicio_id);
      CREATE INDEX IF NOT EXISTS idx_sa_estructura_turno ON sa_estructura(turno_id);
      CREATE INDEX IF NOT EXISTS idx_sa_presentismo_turno ON sa_presentismo(turno_id);
    `);
    console.log('✓ índices');

    console.log('\n✅ Migración completada.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
