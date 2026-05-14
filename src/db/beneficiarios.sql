-- Tabla de beneficiarios de Servicios Adicionales
-- Ejecutar una vez en la base de datos

CREATE TABLE IF NOT EXISTS beneficiarios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social VARCHAR(255) NOT NULL,
  nombre       VARCHAR(255),        -- nombre del contacto
  email        VARCHAR(255),
  telefono     VARCHAR(50),
  cuit         VARCHAR(20),
  activo       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- FK en presupuestos (nullable — los presupuestos viejos no tienen beneficiario_id)
ALTER TABLE presupuestos
  ADD COLUMN IF NOT EXISTS beneficiario_id UUID REFERENCES beneficiarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_presupuestos_beneficiario_id ON presupuestos(beneficiario_id);
