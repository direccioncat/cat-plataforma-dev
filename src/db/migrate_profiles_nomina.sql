-- Migración: campos de nómina en profiles
-- Ejecutar una sola vez en la base de datos

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cuit              TEXT,
  ADD COLUMN IF NOT EXISTS cargo             TEXT,
  ADD COLUMN IF NOT EXISTS funcion           TEXT,
  ADD COLUMN IF NOT EXISTS funcion_especifica TEXT,
  ADD COLUMN IF NOT EXISTS tipo_contrato     TEXT,
  ADD COLUMN IF NOT EXISTS fecha_nacimiento  DATE,
  ADD COLUMN IF NOT EXISTS hora_entrada      TIME,
  ADD COLUMN IF NOT EXISTS hora_salida       TIME,
  ADD COLUMN IF NOT EXISTS telefono          TEXT,
  ADD COLUMN IF NOT EXISTS telefono_ht       TEXT;

-- Índice para búsquedas por CUIT (útil para módulo RRHH futuro)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cuit_unique ON profiles (cuit) WHERE cuit IS NOT NULL;
