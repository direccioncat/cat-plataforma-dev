require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Iniciando migracion OS adicional...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS os_adicional (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre TEXT NOT NULL,
        evento_motivo TEXT,
        estado TEXT NOT NULL DEFAULT 'borrador'
          CHECK (estado IN ('borrador','validacion','vigente','cumplida')),
        base_id UUID REFERENCES bases(id) ON DELETE SET NULL,
        creado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
        horario_desde TIME,
        horario_hasta TIME,
        dotacion_agentes INTEGER DEFAULT 0,
        dotacion_supervisores INTEGER DEFAULT 0,
        dotacion_motorizados INTEGER DEFAULT 0,
        observaciones TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  os_adicional');

    await client.query(`
      CREATE TABLE IF NOT EXISTS os_adicional_fechas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        os_adicional_id UUID REFERENCES os_adicional(id) ON DELETE CASCADE NOT NULL,
        fecha DATE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  os_adicional_fechas');

    await client.query(`
      CREATE TABLE IF NOT EXISTS os_adicional_recursos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        os_adicional_id UUID REFERENCES os_adicional(id) ON DELETE CASCADE NOT NULL,
        tipo TEXT NOT NULL,
        cantidad INTEGER NOT NULL DEFAULT 0,
        descripcion TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  os_adicional_recursos');

    await client.query(`
      CREATE TABLE IF NOT EXISTS os_adicional_zonas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        os_adicional_id UUID REFERENCES os_adicional(id) ON DELETE CASCADE NOT NULL,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        orden INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  os_adicional_zonas');

    await client.query(`
      CREATE TABLE IF NOT EXISTS os_adicional_elementos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        zona_id UUID REFERENCES os_adicional_zonas(id) ON DELETE CASCADE NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('punto_control','tramo','zona_area','desvio')),
        nombre TEXT,
        instruccion TEXT,
        geometria JSONB NOT NULL,
        color TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  os_adicional_elementos');

    await client.query(`
      CREATE TABLE IF NOT EXISTS os_adicional_fases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        os_adicional_id UUID REFERENCES os_adicional(id) ON DELETE CASCADE NOT NULL,
        nombre TEXT NOT NULL,
        horario_desde TIME,
        horario_hasta TIME,
        color TEXT NOT NULL DEFAULT '#e24b4a',
        orden INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  os_adicional_fases');

    await client.query(`
      CREATE TABLE IF NOT EXISTS os_adicional_fase_zonas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fase_id UUID REFERENCES os_adicional_fases(id) ON DELETE CASCADE NOT NULL,
        zona_id UUID REFERENCES os_adicional_zonas(id) ON DELETE CASCADE NOT NULL,
        tipo_operacion TEXT CHECK (tipo_operacion IN (
          'ingreso','egreso','control','corte','desvio',
          'contracarril','estacionamiento','refuerzo','otro'
        )),
        dotacion_agentes INTEGER DEFAULT 0,
        dotacion_supervisores INTEGER DEFAULT 0,
        dotacion_motorizados INTEGER DEFAULT 0,
        instrucciones TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(fase_id, zona_id)
      );
    `);
    console.log('  os_adicional_fase_zonas');

    console.log('\nMigracion OS adicional completada.');
  } catch (err) {
    console.error('Error en migracion:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
