require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Iniciando migración...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS bases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre TEXT NOT NULL,
        direccion TEXT,
        activa BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ bases');

    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('gerencia','jefe_base','coordinador','supervisor','agente','admin','director','planeamiento','jefe_cgm','coordinador_cgm')),
        base_id UUID REFERENCES bases(id),
        turno TEXT,
        legajo TEXT UNIQUE,
        nombre_completo TEXT NOT NULL,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ profiles');

    await client.query(`
      CREATE TABLE IF NOT EXISTS ordenes_servicio (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        numero SERIAL,
        tipo TEXT NOT NULL DEFAULT 'ordinaria' CHECK (tipo IN ('ordinaria','adicional','alcoholemia')),
        base_id UUID REFERENCES bases(id) NOT NULL,
        titulo TEXT NOT NULL,
        semana_inicio DATE,
        semana_fin DATE,
        vigencia_inicio TIMESTAMPTZ,
        vigencia_fin TIMESTAMPTZ,
        estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','validacion','vigente','cumplida')),
        creado_por UUID REFERENCES profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ ordenes_servicio');

    await client.query(`
      CREATE TABLE IF NOT EXISTS os_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        os_id UUID REFERENCES ordenes_servicio(id) ON DELETE CASCADE NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('servicio','mision')),
        codigo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        turno TEXT NOT NULL,
        modo_ubicacion TEXT DEFAULT 'altura' CHECK (modo_ubicacion IN ('altura','interseccion','entre_calles','poligono')),
        calle TEXT,
        altura TEXT,
        calle2 TEXT,
        desde TEXT,
        hasta TEXT,
        poligono_desc TEXT,
        eje_psv TEXT,
        es_mision BOOLEAN DEFAULT false,
        cantidad_agentes JSONB DEFAULT '{}',
        relevo_tipo TEXT CHECK (relevo_tipo IN ('Normal','En zona')),
        relevo_base_id UUID REFERENCES bases(id),
        relevo_turno TEXT,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        place_id TEXT,
        orden INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ os_items');

    await client.query(`
      CREATE TABLE IF NOT EXISTS misiones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        os_item_id UUID REFERENCES os_items(id) ON DELETE SET NULL,
        base_id UUID REFERENCES bases(id) NOT NULL,
        titulo TEXT NOT NULL,
        descripcion TEXT,
        turno TEXT NOT NULL,
        fecha DATE NOT NULL DEFAULT CURRENT_DATE,
        estado TEXT NOT NULL DEFAULT 'sin_asignar' CHECK (estado IN ('sin_asignar','asignada','en_mision','interrumpida','cerrada')),
        modo_ubicacion TEXT DEFAULT 'altura',
        calle TEXT,
        altura TEXT,
        calle2 TEXT,
        desde TEXT,
        hasta TEXT,
        poligono_desc TEXT,
        eje_psv TEXT,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        encargado_id UUID REFERENCES profiles(id),
        fotos TEXT[] DEFAULT '{}',
        observaciones TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ misiones');

    await client.query(`
      CREATE TABLE IF NOT EXISTS mision_agentes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mision_id UUID REFERENCES misiones(id) ON DELETE CASCADE NOT NULL,
        agente_id UUID REFERENCES profiles(id) NOT NULL,
        estado TEXT NOT NULL DEFAULT 'asignado' CHECK (estado IN ('asignado','en_mision','libre')),
        es_encargado BOOLEAN DEFAULT false,
        asignado_at TIMESTAMPTZ DEFAULT NOW(),
        aceptado_at TIMESTAMPTZ,
        UNIQUE(mision_id, agente_id)
      );
    `);
    console.log('✓ mision_agentes');

    await client.query(`
      CREATE TABLE IF NOT EXISTS interrupciones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mision_id UUID REFERENCES misiones(id) ON DELETE CASCADE NOT NULL,
        agente_id UUID REFERENCES profiles(id) NOT NULL,
        motivo TEXT NOT NULL,
        inicio TIMESTAMPTZ DEFAULT NOW(),
        fin TIMESTAMPTZ,
        activa BOOLEAN DEFAULT true
      );
    `);
    console.log('✓ interrupciones');

    await client.query(`
      CREATE TABLE IF NOT EXISTS actividad (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        base_id UUID REFERENCES bases(id),
        mision_id UUID REFERENCES misiones(id) ON DELETE SET NULL,
        agente_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        tipo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ actividad');

    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ refresh_tokens');

    await client.query(`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        jti UUID PRIMARY KEY,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at);
    `);
    console.log('✓ revoked_tokens');

    await client.query(`
      CREATE TABLE IF NOT EXISTS os_fechas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        os_id UUID REFERENCES ordenes_servicio(id) ON DELETE CASCADE NOT NULL,
        fecha DATE NOT NULL,
        hora_inicio TIME,
        hora_fin TIME,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ os_fechas');

    await client.query(`
      CREATE TABLE IF NOT EXISTS grupos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre TEXT NOT NULL,
        descripcion TEXT,
        modulo TEXT DEFAULT '*',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ grupos');

    await client.query(`
      CREATE TABLE IF NOT EXISTS grupo_reglas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('base','role','profile')),
        valor TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ grupo_reglas');

    await client.query(`
      CREATE TABLE IF NOT EXISTS os_alcoholemia_accesos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        os_id UUID REFERENCES ordenes_servicio(id) ON DELETE CASCADE NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('base','role','profile','grupo')),
        valor TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ os_alcoholemia_accesos');

    await client.query(`
      CREATE TABLE IF NOT EXISTS os_item_fechas (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        os_item_id UUID REFERENCES os_items(id) ON DELETE CASCADE NOT NULL,
        fecha      DATE NOT NULL,
        UNIQUE(os_item_id, fecha)
      );
      CREATE INDEX IF NOT EXISTS idx_os_item_fechas_item  ON os_item_fechas(os_item_id);
      CREATE INDEX IF NOT EXISTS idx_os_item_fechas_fecha ON os_item_fechas(fecha);
    `);
    console.log('✓ os_item_fechas');

    console.log('\n✅ Migración completada exitosamente.');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
