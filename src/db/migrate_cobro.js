/**
 * migrate_cobro.js
 * Módulo de Cobro / Liquidaciones — Banca Electrónica
 *
 * Crea:
 *  - profiles.loys (boolean)
 *  - profiles.cbu  (varchar)
 *  - valor_uf_historico
 *  - liquidaciones
 *  - liquidacion_detalle
 *  - sa_presentismo.liquidacion_id
 *
 * Ejecutar: node src/db/migrate_cobro.js (desde C:\cat-plataforma\backend)
 */
require('dotenv').config();
const pool = require('./pool');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. profiles: loys y cbu ──────────────────────────────
    await client.query(`
      ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS loys BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS cbu  VARCHAR(22)
    `);
    console.log('✓ profiles: loys, cbu');

    // ── 2. valor_uf_historico ────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS valor_uf_historico (
        id            SERIAL PRIMARY KEY,
        valor         NUMERIC(12,2) NOT NULL CHECK (valor > 0),
        vigente_desde DATE NOT NULL,
        creado_por    UUID REFERENCES profiles(id),
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_uf_vigente_desde
        ON valor_uf_historico (vigente_desde)
    `);
    console.log('✓ valor_uf_historico');

    // ── 3. liquidaciones ─────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS liquidaciones (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fecha_desde     DATE NOT NULL,
        fecha_hasta     DATE NOT NULL,
        valor_uf        NUMERIC(12,2) NOT NULL,
        total_agentes   INTEGER,
        total_modulos   NUMERIC(10,2),
        total_monto     NUMERIC(14,2),
        generado_por    UUID REFERENCES profiles(id),
        generado_at     TIMESTAMPTZ DEFAULT NOW(),
        txt_archivo     VARCHAR(255),
        observaciones   TEXT,
        CONSTRAINT liq_rango_valido CHECK (fecha_hasta >= fecha_desde)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_liquidaciones_rango
        ON liquidaciones (fecha_desde, fecha_hasta)
    `);
    console.log('✓ liquidaciones');

    // ── 4. liquidacion_detalle ───────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS liquidacion_detalle (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        liquidacion_id  UUID NOT NULL REFERENCES liquidaciones(id) ON DELETE CASCADE,
        profile_id      UUID REFERENCES profiles(id),
        cuil            VARCHAR(11) NOT NULL,
        cbu             VARCHAR(22) NOT NULL,
        nombre_completo TEXT NOT NULL,
        modulos         NUMERIC(10,2) NOT NULL,
        monto           NUMERIC(14,2) NOT NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_liq_detalle_liq
        ON liquidacion_detalle (liquidacion_id)
    `);
    console.log('✓ liquidacion_detalle');

    // ── 5. sa_presentismo.liquidacion_id ─────────────────────
    await client.query(`
      ALTER TABLE sa_presentismo
        ADD COLUMN IF NOT EXISTS liquidacion_id UUID REFERENCES liquidaciones(id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_presentismo_liquidacion
        ON sa_presentismo (liquidacion_id)
    `);
    console.log('✓ sa_presentismo.liquidacion_id');

    await client.query('COMMIT');
    console.log('\n✅ Migración cobro completada');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
