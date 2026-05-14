/**
 * migrate_facturacion.js
 * Módulo de Facturación LOYS
 *
 * Crea:
 *  - facturacion_solicitudes (una por servicio, disparada por operador)
 *  - facturacion_items       (una por agente, con token único para el form público)
 *
 * Ejecutar: node src/db/migrate_facturacion.js (desde C:\cat-plataforma\backend)
 */
require('dotenv').config();
const pool = require('./pool');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. facturacion_solicitudes ───────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS facturacion_solicitudes (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        servicio_id           UUID REFERENCES servicios_adicionales(id) ON DELETE SET NULL,
        concepto              TEXT NOT NULL,
        periodo_desde         DATE NOT NULL,
        periodo_hasta         DATE NOT NULL,
        fecha_vencimiento     DATE NOT NULL,
        cuit_receptor         VARCHAR(11) NOT NULL,
        razon_social_receptor VARCHAR(100) NOT NULL,
        valor_uf              NUMERIC(12,2),
        generado_por          UUID REFERENCES profiles(id),
        generado_at           TIMESTAMPTZ DEFAULT NOW(),
        estado                VARCHAR(20) DEFAULT 'enviada',
        observaciones         TEXT,
        CONSTRAINT fac_sol_rango CHECK (periodo_hasta >= periodo_desde)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fac_sol_servicio
        ON facturacion_solicitudes (servicio_id)
    `);
    console.log('✓ facturacion_solicitudes');

    // ── 2. facturacion_items ─────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS facturacion_items (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        solicitud_id      UUID NOT NULL REFERENCES facturacion_solicitudes(id) ON DELETE CASCADE,
        profile_id        UUID REFERENCES profiles(id),
        token             UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        tipo              VARCHAR(10) DEFAULT 'loys',
        nombre_completo   TEXT,
        cuil              VARCHAR(11),
        email             TEXT,
        datos_enviados    JSONB,
        estado            VARCHAR(30) DEFAULT 'pendiente',
        -- Factura remitida por el agente
        factura_numero    VARCHAR(100),
        factura_fecha     DATE,
        factura_archivo   VARCHAR(255),
        factura_datos     JSONB,
        -- Gestión RRHH
        observaciones_rrhh TEXT,
        mail_enviado_at   TIMESTAMPTZ,
        presentada_at     TIMESTAMPTZ,
        revisada_at       TIMESTAMPTZ,
        revisada_por      UUID REFERENCES profiles(id),
        CONSTRAINT fac_item_estado CHECK (
          estado IN ('pendiente','presentada','aprobada','rechazada','subsanacion')
        )
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fac_item_solicitud
        ON facturacion_items (solicitud_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fac_item_token
        ON facturacion_items (token)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fac_item_profile
        ON facturacion_items (profile_id)
    `);
    console.log('✓ facturacion_items');

    await client.query('COMMIT');
    console.log('\n✅ Migración facturacion completada');
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
