require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Iniciando migración: Servicios Adicionales...\n');

    // 1. Agregar rol operador_adicionales al CHECK de profiles
    // Primero verificamos si ya existe la constraint y la dropeamos para recrearla
    await client.query(`
      ALTER TABLE profiles
        DROP CONSTRAINT IF EXISTS profiles_role_check;
    `);
    await client.query(`
      ALTER TABLE profiles
        ADD CONSTRAINT profiles_role_check
        CHECK (role IN (
          'gerencia','jefe_base','coordinador','supervisor','agente','admin',
          'director','planeamiento','jefe_cgm','coordinador_cgm',
          'operador_adicionales'
        ));
    `);
    console.log('✓ profiles: rol operador_adicionales agregado');

    // 2. Tabla principal: servicios_adicionales
    // Un registro por OS adicional que entra al área
    await client.query(`
      CREATE TABLE IF NOT EXISTS servicios_adicionales (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        os_adicional_id  UUID REFERENCES os_adicional(id) ON DELETE SET NULL,
        estado           TEXT NOT NULL DEFAULT 'pendiente'
                           CHECK (estado IN ('pendiente','en_gestion','convocado','en_curso','cerrado')),
        fecha_servicio   DATE,
        hora_inicio      TIME,
        hora_fin         TIME,
        modulos_calculados INTEGER,          -- duración_horas / 2, editable por operador
        observaciones    TEXT,
        creado_por       UUID REFERENCES profiles(id),
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ servicios_adicionales');

    // 3. Requerimientos por rol para el servicio
    // Cuántos de cada rol se necesitan (viene de la OS adicional, editable)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sa_requerimientos (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        servicio_id    UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
        rol            TEXT NOT NULL CHECK (rol IN ('jefe_general','jefe','supervisor','agente','chofer')),
        cantidad       INTEGER NOT NULL DEFAULT 1,
        UNIQUE(servicio_id, rol)
      );
    `);
    console.log('✓ sa_requerimientos');

    // 4. Postulantes al servicio
    // Origen: csv (importado) o plataforma (futuro)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sa_postulantes (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        servicio_id    UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
        agente_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
        rol_solicitado TEXT NOT NULL CHECK (rol_solicitado IN ('jefe_general','jefe','supervisor','agente','chofer')),
        origen         TEXT NOT NULL DEFAULT 'csv' CHECK (origen IN ('csv','plataforma','manual')),
        created_at     TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(servicio_id, agente_id)
      );
    `);
    console.log('✓ sa_postulantes');

    // 5. Estructura / organigrama del servicio armado
    // jefe_id = NULL para nodos raíz (jefes generales)
    // jefe_id = UUID del nodo padre para el resto
    await client.query(`
      CREATE TABLE IF NOT EXISTS sa_estructura (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        servicio_id    UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
        agente_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
        rol            TEXT NOT NULL CHECK (rol IN ('jefe_general','jefe','supervisor','agente','chofer')),
        jefe_id        UUID REFERENCES sa_estructura(id) ON DELETE SET NULL,  -- padre en el organigrama
        origen         TEXT NOT NULL DEFAULT 'scoring' CHECK (origen IN ('scoring','manual')), -- scoring=propuesto, manual=elegido por operador
        created_at     TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(servicio_id, agente_id)
      );
    `);
    console.log('✓ sa_estructura');

    // 6. Convocatoria: estado de confirmación de cada agente del organigrama
    await client.query(`
      CREATE TABLE IF NOT EXISTS sa_convocatoria (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        estructura_id     UUID REFERENCES sa_estructura(id) ON DELETE CASCADE NOT NULL UNIQUE,
        estado            TEXT NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente','confirmado','rechazado','reemplazado')),
        confirmado_por    UUID REFERENCES profiles(id),  -- operador que registró la confirmación
        confirmado_at     TIMESTAMPTZ,
        observaciones     TEXT,
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ sa_convocatoria');

    // 7. Presentismo: registro post-servicio
    await client.query(`
      CREATE TABLE IF NOT EXISTS sa_presentismo (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        servicio_id       UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
        agente_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
        presente          BOOLEAN NOT NULL,
        modulos_acreditados INTEGER,         -- default = modulos_calculados del servicio, editable
        registrado_por    UUID REFERENCES profiles(id),
        registrado_at     TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(servicio_id, agente_id)
      );
    `);
    console.log('✓ sa_presentismo');

    // 8. Historial de módulos por agente (alimentado por el presentismo)
    // Permite calcular el scoring por período sin recorrer todo el presentismo
    await client.query(`
      CREATE TABLE IF NOT EXISTS sa_modulos_agente (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agente_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
        servicio_id    UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
        periodo        TEXT NOT NULL,   -- formato: 'YYYY-MM' (mes)
        modulos        INTEGER NOT NULL DEFAULT 0,
        created_at     TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(agente_id, servicio_id)
      );
    `);
    console.log('✓ sa_modulos_agente');

    // 9. Penalizaciones por agente
    await client.query(`
      CREATE TABLE IF NOT EXISTS sa_penalizaciones (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agente_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
        servicio_id    UUID REFERENCES servicios_adicionales(id) ON DELETE SET NULL,
        tipo           TEXT NOT NULL CHECK (tipo IN ('ausencia','sancion','otro')),
        puntos         INTEGER NOT NULL DEFAULT 0,
        periodo_inicio TEXT NOT NULL,   -- 'YYYY-MM'
        periodo_fin    TEXT NOT NULL,   -- 'YYYY-MM' (calculado según config)
        activa         BOOLEAN DEFAULT true,
        observaciones  TEXT,
        creado_por     UUID REFERENCES profiles(id),
        created_at     TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ sa_penalizaciones');

    // 10. Configuración del scoring (parámetros editables por el área)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sa_scoring_config (
        clave        TEXT PRIMARY KEY,
        valor        TEXT NOT NULL,
        tipo         TEXT NOT NULL CHECK (tipo IN ('number','text','select')),
        descripcion  TEXT NOT NULL,
        opciones     TEXT[],   -- para tipo 'select'
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ sa_scoring_config');

    // 11. Seed de configuración por defecto
    await client.query(`
      INSERT INTO sa_scoring_config (clave, valor, tipo, descripcion) VALUES
        ('reset_periodo',                 'mensual',  'select', 'Período de reseteo de módulos acumulados'),
        ('penalizacion_ausencia_meses',   '2',        'number', 'Meses que dura la penalización por ausencia (mes en curso + N siguientes)'),
        ('penalizacion_ausencia_puntos',  '20',       'number', 'Puntos de penalización por ausencia injustificada'),
        ('penalizacion_sancion_puntos',   '30',       'number', 'Puntos de penalización por sanción disciplinaria'),
        ('modulo_duracion_horas',         '2',        'number', 'Duración en horas de un módulo'),
        ('scoring_formula',               'esperados_menos_acumulados', 'select', 'Fórmula de cálculo de prioridad')
      ON CONFLICT (clave) DO NOTHING;
    `);
    console.log('✓ sa_scoring_config: seed de parámetros por defecto');

    // 12. Índices útiles
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sa_postulantes_servicio ON sa_postulantes(servicio_id);
      CREATE INDEX IF NOT EXISTS idx_sa_estructura_servicio ON sa_estructura(servicio_id);
      CREATE INDEX IF NOT EXISTS idx_sa_modulos_agente_periodo ON sa_modulos_agente(agente_id, periodo);
      CREATE INDEX IF NOT EXISTS idx_sa_penalizaciones_agente ON sa_penalizaciones(agente_id, activa);
      CREATE INDEX IF NOT EXISTS idx_servicios_adicionales_estado ON servicios_adicionales(estado);
    `);
    console.log('✓ índices');

    console.log('\n✅ Migración Servicios Adicionales completada exitosamente.');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
