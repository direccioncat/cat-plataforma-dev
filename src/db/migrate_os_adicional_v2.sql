-- migrate_os_adicional_v2.sql
-- Elementos van directo a la fase (sin zona obligatoria)

ALTER TABLE os_adicional_elementos
  ADD COLUMN IF NOT EXISTS fase_id UUID REFERENCES os_adicional_fases(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_elementos_fase_id ON os_adicional_elementos(fase_id);

ALTER TABLE os_adicional_elementos
  ALTER COLUMN zona_id DROP NOT NULL;
