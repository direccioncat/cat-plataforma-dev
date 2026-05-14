const pool = require('../db/pool');
const fs   = require('fs');
const path = require('path');

// ── Helpers ───────────────────────────────────────────────────

function uploadsDir() {
  return path.join(process.cwd(), process.env.UPLOADS_DIR || 'uploads');
}

/** Quita tildes, n~, caracteres especiales para el TXT bancario.
 *  Usa escapes \u para evitar problemas de codificacion del archivo fuente.
 *  Bloque Combining Diacritical Marks: U+0300 - U+036F
 */
function sanitizarNombre(nombre) {
  return (nombre || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // elimina todas las marcas de tilde/dieresis
    .replace(/ñ/g, 'N')           // n~ minuscula que no se descompuso
    .replace(/Ñ/g, 'N')           // N~ mayuscula que no se descompuso
    .replace(/[^A-Za-z0-9 ]/g, '')     // quita cualquier otro caracter especial
    .toUpperCase()
    .trim()
    .substring(0, 40);
}

/** Genera el contenido TXT para Banca Electronica */
function generarTXT(detalle) {
  const lines = detalle.map(row => {
    const nombre = sanitizarNombre(row.nombre_completo);
    const cbu    = (row.cbu  || '').replace(/\D/g, '');
    const cuil   = (row.cuil || '').replace(/\D/g, '');
    const monto  = Number(row.monto).toFixed(2);
    return `${nombre};${cbu};${cuil};${monto}`;
  });
  return lines.join('\r\n');
}

// ── Query base de preview ─────────────────────────────────────
const PREVIEW_SQL = `
  SELECT
    p.id              AS profile_id,
    p.nombre_completo,
    p.cuit            AS cuil,
    p.cbu,
    p.loys,
    COALESCE(SUM(COALESCE(pr.modulos_acreditados, t.modulos, 0)), 0)::NUMERIC      AS modulos,
    COALESCE(SUM(COALESCE(pr.modulos_acreditados, t.modulos, 0)), 0)::NUMERIC * $3 AS monto,
    array_agg(pr.id)                  AS presentismo_ids,
    array_agg(DISTINCT t.servicio_id) AS servicios_ids
  FROM sa_presentismo pr
  JOIN sa_turnos  t ON t.id = pr.turno_id
  JOIN profiles   p ON p.id = pr.agente_id
  WHERE pr.presente             = true
    AND pr.ausencia_justificada = false
    AND t.fecha BETWEEN $1 AND $2
    AND pr.liquidacion_id IS NULL
    AND p.loys = true
  GROUP BY p.id, p.nombre_completo, p.cuit, p.cbu, p.loys
  ORDER BY p.nombre_completo
`;

// ── UF ────────────────────────────────────────────────────────

async function getUFVigente() {
  const { rows } = await pool.query(`
    SELECT * FROM valor_uf_historico
    WHERE vigente_desde <= CURRENT_DATE
    ORDER BY vigente_desde DESC
    LIMIT 1
  `);
  return rows[0] || null;
}

async function getUFHistorial() {
  const { rows } = await pool.query(`
    SELECT * FROM valor_uf_historico ORDER BY vigente_desde DESC
  `);
  return rows;
}

async function crearUF({ valor, vigente_desde, creado_por }) {
  const { rows: [r] } = await pool.query(`
    INSERT INTO valor_uf_historico (valor, vigente_desde, creado_por)
    VALUES ($1, $2, $3) RETURNING *
  `, [valor, vigente_desde, creado_por]);
  return r;
}

// ── Liquidaciones ─────────────────────────────────────────────

async function getLista() {
  const { rows } = await pool.query(`
    SELECT l.*, p.nombre_completo AS generado_por_nombre
    FROM liquidaciones l
    LEFT JOIN profiles p ON p.id = l.generado_por
    ORDER BY l.generado_at DESC
  `);
  return rows;
}

async function getById(id) {
  const { rows: [liq] } = await pool.query(`
    SELECT l.*, p.nombre_completo AS generado_por_nombre
    FROM liquidaciones l
    LEFT JOIN profiles p ON p.id = l.generado_por
    WHERE l.id = $1
  `, [id]);
  if (!liq) return null;

  const { rows: detalle } = await pool.query(`
    SELECT * FROM liquidacion_detalle
    WHERE liquidacion_id = $1
    ORDER BY nombre_completo
  `, [id]);

  return { ...liq, detalle };
}

/** Devuelve el preview sin confirmar nada */
async function preview(fecha_desde, fecha_hasta, valor_uf) {
  const { rows } = await pool.query(PREVIEW_SQL, [fecha_desde, fecha_hasta, valor_uf]);

  const totalModulos = rows.reduce((s, r) => s + Number(r.modulos), 0);
  const totalMonto   = rows.reduce((s, r) => s + Number(r.monto),   0);

  return {
    agentes:       rows,
    total_agentes: rows.length,
    total_modulos: totalModulos,
    total_monto:   totalMonto,
  };
}

/** Confirma la liquidacion, genera el TXT y persiste todo */
async function crearLiquidacion({ fecha_desde, fecha_hasta, valor_uf, generado_por, observaciones }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Re-ejecutar la misma query dentro de la transaccion
    const { rows: detalle } = await client.query(PREVIEW_SQL, [fecha_desde, fecha_hasta, valor_uf]);

    if (detalle.length === 0) {
      throw new Error('No hay modulos LOYS pendientes de liquidar en el rango seleccionado');
    }

    // Validar CUIL y CBU
    const sinCUIL = detalle.filter(r => !r.cuil || !r.cuil.trim());
    if (sinCUIL.length > 0) {
      throw new Error(
        `Agentes sin CUIL cargado: ${sinCUIL.map(r => r.nombre_completo).join(', ')}`
      );
    }
    const sinCBU = detalle.filter(r => !r.cbu || !r.cbu.trim());
    if (sinCBU.length > 0) {
      throw new Error(
        `Agentes sin CBU cargado: ${sinCBU.map(r => r.nombre_completo).join(', ')}`
      );
    }

    const total_agentes = detalle.length;
    const total_modulos = detalle.reduce((s, r) => s + Number(r.modulos), 0);
    const total_monto   = detalle.reduce((s, r) => s + Number(r.monto),   0);

    // 2. Generar y guardar TXT
    const txtContent  = generarTXT(detalle);
    const txtFileName = `liq_${fecha_desde}_${fecha_hasta}_${Date.now()}.txt`;
    const dir = uploadsDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, txtFileName), txtContent, 'utf8');

    // 3. Insertar liquidacion
    const { rows: [liq] } = await client.query(`
      INSERT INTO liquidaciones
        (fecha_desde, fecha_hasta, valor_uf, total_agentes, total_modulos, total_monto,
         generado_por, txt_archivo, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [fecha_desde, fecha_hasta, valor_uf,
        total_agentes, total_modulos, total_monto,
        generado_por, txtFileName, observaciones || null]);

    // 4. Insertar detalle y marcar presentismo como liquidado
    for (const row of detalle) {
      await client.query(`
        INSERT INTO liquidacion_detalle
          (liquidacion_id, profile_id, cuil, cbu, nombre_completo, modulos, monto)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [liq.id, row.profile_id,
          row.cuil, row.cbu, row.nombre_completo,
          row.modulos, row.monto]);

      // Marcar los registros de presentismo incluidos
      if (row.presentismo_ids && row.presentismo_ids.length > 0) {
        await client.query(`
          UPDATE sa_presentismo
          SET liquidacion_id = $1
          WHERE id = ANY($2::uuid[])
        `, [liq.id, row.presentismo_ids]);
      }
    }

    await client.query('COMMIT');
    return { ...liq, detalle, txt_contenido: txtContent };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getUFVigente, getUFHistorial, crearUF,
  getLista, getById, preview, crearLiquidacion,
};
