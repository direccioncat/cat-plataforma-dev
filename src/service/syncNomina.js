/**
 * syncNomina.js
 * Sincronización de nómina desde la DB de RR.HH. (presentismo)
 * hacia la tabla profiles de cat_plataforma.
 */
const { Pool } = require('pg');
const bcrypt   = require('bcrypt');
const pool     = require('../db/pool');

// ── Conexión a RR.HH. ────────────────────────────────────────
const RRHH_CONFIG = {
  host:                   '10.78.7.23',
  database:               'presentismo',
  user:                   'consulta',
  password:               'consulta1202',
  port:                   5432,
  connectionTimeoutMillis: 10000,
  ssl:                    false,
};

const QUERY_RRHH = `
  SELECT
    a.id                                            AS rrhh_id,
    TRIM(a.apellido) || ' ' || TRIM(a.nombre)       AS nombre_completo,
    a.cuit,
    LOWER(COALESCE(NULLIF(TRIM(a.email_gobierno),''), NULLIF(TRIM(a.email),''))) AS email,
    a.telefono_particular                           AS telefono,
    a.telefono_ht,
    a.fecha_nacimiento,
    c.numero_cat                                    AS legajo,
    tc.descripcion                                  AS tipo_contrato,
    b.nombre                                        AS base,
    t.codigo                                        AS turno,
    h.hora_entrada::text,
    h.hora_salida::text,
    f.nombre                                        AS funcion,
    ca.nombre                                       AS cargo,
    o.funcion_especifica,
    ar.nombre                                       AS area
  FROM agentes a
  JOIN contratos c          ON c.id_agente = a.id   AND c.deleted_at IS NULL
  JOIN estado_contratos ec  ON ec.id = c.id_estado_contrato
  JOIN tipo_contratos tc    ON tc.id = c.id_tipo_contrato
  JOIN (
    SELECT DISTINCT ON (id_agente) *
    FROM operativos
    WHERE deleted_at IS NULL
    ORDER BY id_agente, updated_at DESC
  ) o ON o.id_agente = a.id
  JOIN bases   b  ON b.id  = o.id_base
  JOIN turnos  t  ON t.id  = o.id_turno
  LEFT JOIN horarios  h  ON h.id  = o.id_horario
  LEFT JOIN funciones f  ON f.id  = o.id_funcion
  LEFT JOIN cargos    ca ON ca.id = o.id_cargo
  LEFT JOIN areas     ar ON ar.id = o.id_area
  WHERE a.deleted_at IS NULL
    AND ec.estado = 'ACTIVO'
    AND c.numero_cat IS NOT NULL AND TRIM(c.numero_cat) != ''
`;

// Limpia valores de hora: "00:00hs" → "00:00", "8:30" → "08:30"
function sanitizeTime(t) {
  if (!t) return null;
  const clean = String(t).replace(/[^0-9:]/g, '').trim();
  return clean || null;
}

// Limpia entidades HTML simples (ej: "Locaci&oacute;n" → "Locación")
function decodeHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&aacute;/gi,'á').replace(/&eacute;/gi,'é').replace(/&iacute;/gi,'í')
    .replace(/&oacute;/gi,'ó').replace(/&uacute;/gi,'ú').replace(/&ntilde;/gi,'ñ')
    .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&nbsp;/gi,' ')
    .replace(/\s+/g, ' ').trim();
}

/**
 * Obtiene los agentes desde RR.HH. y los devuelve procesados.
 */
async function fetchAgentesRRHH() {
  const rrhhPool = new Pool(RRHH_CONFIG);
  try {
    const { rows } = await rrhhPool.query(QUERY_RRHH);
    return rows.map(r => ({
      ...r,
      tipo_contrato: decodeHtmlEntities(r.tipo_contrato),
      nombre_completo: decodeHtmlEntities(r.nombre_completo),
    }));
  } finally {
    await rrhhPool.end();
  }
}

/**
 * Genera un preview sin modificar nada.
 * Devuelve { nuevos, actualizados, bajas, total_rrhh }
 */
async function previewSync() {
  const agentesRRHH = await fetchAgentesRRHH();
  const cuits = agentesRRHH.map(a => a.cuit).filter(Boolean);

  const { rows: existentes } = await pool.query(
    'SELECT cuit, legajo, nombre_completo, activo FROM profiles WHERE role = $1',
    ['agente']
  );

  const cuitsExistentes = new Set(existentes.map(e => e.cuit));
  const cuitsRRHH       = new Set(cuits);

  const nuevos       = agentesRRHH.filter(a => a.cuit && !cuitsExistentes.has(a.cuit));
  const actualizados = agentesRRHH.filter(a => a.cuit &&  cuitsExistentes.has(a.cuit));
  const bajas        = existentes.filter(e => e.cuit && !cuitsRRHH.has(e.cuit) && e.activo);

  return {
    total_rrhh:   agentesRRHH.length,
    nuevos:       nuevos.length,
    actualizados: actualizados.length,
    bajas:        bajas.length,
    muestra_nuevos:       nuevos.slice(0, 5).map(a => ({ legajo: a.legajo, nombre: a.nombre_completo, base: a.base })),
    muestra_bajas:        bajas.slice(0, 5).map(a => ({ legajo: a.legajo, nombre: a.nombre_completo })),
  };
}

/**
 * Ejecuta la sincronización completa.
 * Devuelve { creados, actualizados, desactivados, errores }
 */
async function ejecutarSync() {
  const agentesRRHH = await fetchAgentesRRHH();

  // ── Sincronizar bases desde RR.HH. ──────────────────────────────────────────
  // Si una base de RR.HH. no existe en cat_plataforma, se crea automáticamente.
  const basesRRHH = [...new Set(agentesRRHH.map(a => a.base).filter(Boolean))];
  const { rows: basesCAT } = await pool.query('SELECT id, nombre FROM bases');
  const baseMap = new Map(basesCAT.map(b => [b.nombre.trim().toLowerCase(), b.id]));

  for (const nombreBase of basesRRHH) {
    const key = nombreBase.trim().toLowerCase();
    if (!baseMap.has(key)) {
      const { rows } = await pool.query(
        'INSERT INTO bases (nombre) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id, nombre',
        [nombreBase.trim()]
      );
      if (rows[0]) {
        baseMap.set(key, rows[0].id);
        console.log(`[syncNomina] Base creada: ${rows[0].nombre}`);
      }
    }
  }

  // ── Limpieza previa ──────────────────────────────────────────────────────────
  // Eliminar perfiles agente sin CUIT (son datos de seed/prueba sin historial real).
  // Los que tienen CUIT son de importaciones previas y pueden tener FK — se dejan.
  const { rows: sinCuit } = await pool.query(
    "SELECT id FROM profiles WHERE role = 'agente' AND (cuit IS NULL OR cuit = '')"
  );
  let eliminados = 0;
  for (const p of sinCuit) {
    try {
      await pool.query('DELETE FROM profiles WHERE id = $1', [p.id]);
      eliminados++;
    } catch (_) {
      // Tiene referencias FK — no se puede borrar, se deja para el UPSERT normal
    }
  }
  console.log(`[syncNomina] Limpieza previa: ${eliminados} perfiles sin CUIT eliminados`);

  // ── Cargar estado actual post-limpieza ───────────────────────────────────────
  const { rows: existentes } = await pool.query(
    'SELECT id, cuit, legajo, activo FROM profiles WHERE role = $1',
    ['agente']
  );
  const porCuit = new Map(existentes.map(e => [e.cuit, e]));
  const cuitsRRHH = new Set(agentesRRHH.map(a => a.cuit).filter(Boolean));

  // Índice de legajos en TODOS los perfiles (para detectar colisiones con no-agentes)
  const { rows: todosLegajos } = await pool.query(
    'SELECT id, cuit, legajo, activo, role FROM profiles WHERE legajo IS NOT NULL'
  );
  const porLegajo = new Map(todosLegajos.map(e => [e.legajo, e]));

  let creados = 0, actualizados = 0, desactivados = 0;
  const errores = [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const a of agentesRRHH) {
      if (!a.cuit) continue;

      // Buscar base_id en cat_plataforma por nombre
      const base_id = baseMap.get((a.base || '').trim().toLowerCase()) || null;

      // Buscar existente por CUIT primero, luego por legajo como fallback
      const porCuitMatch  = a.cuit ? porCuit.get(a.cuit) : null;
      const porLegajoMatch = a.legajo ? porLegajo.get(a.legajo) : null;

      // Si el legajo está tomado por un perfil no-agente, saltar este agente
      if (!porCuitMatch && porLegajoMatch && porLegajoMatch.role !== 'agente') {
        errores.push({
          legajo: a.legajo,
          nombre: a.nombre_completo,
          error: `El legajo ya está asignado a un perfil con rol "${porLegajoMatch.role}" — actualizalo manualmente`,
        });
        continue;
      }

      const existente = porCuitMatch || (porLegajoMatch?.role === 'agente' ? porLegajoMatch : null);

      await client.query('SAVEPOINT sp_agente');
      try {

        const horaEntrada = sanitizeTime(a.hora_entrada);
        const horaSalida  = sanitizeTime(a.hora_salida);

        if (existente) {
          // UPDATE — no sobreescribe role ni password
          await client.query(`
            UPDATE profiles SET
              nombre_completo    = $1,  email           = $2,  legajo          = $3,
              cuit               = $4,  tipo_contrato   = $5,  turno           = $6,
              base_id            = $7,  hora_entrada    = $8,  hora_salida     = $9,
              telefono           = $10, telefono_ht     = $11, fecha_nacimiento = $12,
              funcion            = $13, cargo           = $14, funcion_especifica = $15,
              area               = $16,
              activo = true, updated_at = NOW()
            WHERE id = $17
          `, [
            a.nombre_completo, a.email, a.legajo,
            a.cuit, a.tipo_contrato, a.turno, base_id,
            horaEntrada, horaSalida,
            a.telefono, a.telefono_ht, a.fecha_nacimiento,
            a.funcion, a.cargo || null, a.funcion_especifica || null,
            a.area || null,
            existente.id,
          ]);
          actualizados++;
        } else {
          // INSERT nuevo agente — contraseña temporal = CUIT sin guiones
          const tempPass = (a.cuit || '').replace(/[-]/g, '');
          const passHash = await bcrypt.hash(tempPass, 10);
          await client.query(`
            INSERT INTO profiles
              (email, password_hash, role, nombre_completo, cuit, legajo,
               tipo_contrato, turno, base_id, hora_entrada, hora_salida,
               telefono, telefono_ht, fecha_nacimiento,
               funcion, cargo, funcion_especifica, area, activo)
            VALUES ($1,$2,'agente',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,true)
            ON CONFLICT (email) DO UPDATE SET
              nombre_completo    = EXCLUDED.nombre_completo,
              cuit               = EXCLUDED.cuit,
              legajo             = EXCLUDED.legajo,
              tipo_contrato      = EXCLUDED.tipo_contrato,
              turno              = EXCLUDED.turno,
              base_id            = EXCLUDED.base_id,
              hora_entrada       = EXCLUDED.hora_entrada,
              hora_salida        = EXCLUDED.hora_salida,
              telefono           = EXCLUDED.telefono,
              telefono_ht        = EXCLUDED.telefono_ht,
              fecha_nacimiento   = EXCLUDED.fecha_nacimiento,
              funcion            = EXCLUDED.funcion,
              cargo              = EXCLUDED.cargo,
              funcion_especifica = EXCLUDED.funcion_especifica,
              area               = EXCLUDED.area,
              activo             = true,
              updated_at         = NOW()
          `, [
            a.email, passHash, a.nombre_completo, a.cuit, a.legajo,
            a.tipo_contrato, a.turno, base_id,
            horaEntrada, horaSalida,
            a.telefono, a.telefono_ht, a.fecha_nacimiento,
            a.funcion, a.cargo || null, a.funcion_especifica || null, a.area || null,
          ]);
          creados++;
        }
        await client.query('RELEASE SAVEPOINT sp_agente');
      } catch (e) {
        await client.query('ROLLBACK TO SAVEPOINT sp_agente');
        errores.push({ legajo: a.legajo, nombre: a.nombre_completo, error: e.message });
      }
    }

    // Desactivar agentes que ya no están en RR.HH.
    const cuitsInactivos = existentes
      .filter(e => e.cuit && !cuitsRRHH.has(e.cuit) && e.activo)
      .map(e => e.cuit);

    if (cuitsInactivos.length > 0) {
      const res = await client.query(
        'UPDATE profiles SET activo = false, updated_at = NOW() WHERE cuit = ANY($1) AND role = $2',
        [cuitsInactivos, 'agente']
      );
      desactivados = res.rowCount;
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return { creados, actualizados, desactivados, errores };
}

/**
 * Resetea toda la data operacional y deja solo perfiles no-agente (admin, jefe, etc.)
 * Usar antes de una carga inicial desde RR.HH.
 */
async function resetearDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener todas las tablas existentes en el schema public
    const { rows: tablasExistentes } = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    const existe = new Set(tablasExistentes.map(r => r.tablename));

    // Todas las tablas operacionales que queremos limpiar
    const TABLAS_OPERACIONALES = [
      // Misiones y OS
      'mision_agentes', 'interrupciones', 'actividad',
      'misiones', 'os_item_fechas', 'os_items', 'os_fechas',
      'os_alcoholemia_accesos', 'ordenes_servicio',
      'grupos', 'grupo_reglas',
      // SS.AA.
      'sa_presentismo', 'sa_recursos', 'sa_convocatoria_tokens',
      'sa_convocatoria', 'sa_armado', 'sa_postulantes',
      'sa_turnos', 'servicios_adicionales',
      // OS Adicional
      'os_adicional_items', 'os_adicional',
      // Finanzas
      'liquidaciones', 'cobros', 'facturacion',
      // Otros
      'sa_sanciones', 'sanciones', 'refresh_tokens', 'revoked_tokens',
    ];

    // Truncar solo las que existen (evita errores de tabla no encontrada)
    const tablasALimpiar = TABLAS_OPERACIONALES.filter(t => existe.has(t));
    if (tablasALimpiar.length > 0) {
      await client.query(`TRUNCATE TABLE ${tablasALimpiar.join(', ')} CASCADE`);
    }

    // Eliminar todos los perfiles agente
    await client.query(`DELETE FROM profiles WHERE role = 'agente'`);

    // Limpiar legajo Y cuit de perfiles no-agente para evitar colisiones al reimportar
    // (admins, jefes, etc. no necesitan legajo ni CUIT del sistema de agentes)
    await client.query(`UPDATE profiles SET legajo = NULL, cuit = NULL WHERE role != 'agente'`);

    await client.query('COMMIT');
    console.log(`[syncNomina] Reset completado — ${tablasALimpiar.length} tablas limpiadas`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { previewSync, ejecutarSync, resetearDB };
