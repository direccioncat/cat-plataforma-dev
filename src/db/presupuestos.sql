-- Módulo Presupuestos de Servicios Adicionales
-- Ejecutar: node -e "require('./src/db/run_sql')('presupuestos.sql')" desde backend/

CREATE TABLE IF NOT EXISTS presupuestos (
  id            SERIAL PRIMARY KEY,
  numero        VARCHAR(20) UNIQUE NOT NULL,
  beneficiario  VARCHAR(255) NOT NULL,
  evento        VARCHAR(255) NOT NULL,
  estado        VARCHAR(20) NOT NULL DEFAULT 'borrador',
  -- borrador | enviado | aprobado | rechazado | vencido
  valor_modulo  NUMERIC(12,2) NOT NULL DEFAULT 71249.25,
  validez_dias  INT NOT NULL DEFAULT 3,
  items         JSONB NOT NULL DEFAULT '[]',
  -- items: [{dia, cobertura, horario, personal, modulos}]
  observaciones TEXT,
  creado_por    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Función para generar número correlativo por año
CREATE OR REPLACE FUNCTION fn_generar_numero_presupuesto()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  anio INT := EXTRACT(YEAR FROM NOW());
  seq  INT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(numero, '-', 3) AS INT)
  ), 0) + 1
  INTO seq
  FROM presupuestos
  WHERE numero LIKE 'PRES-' || anio || '-%';

  NEW.numero := 'PRES-' || anio || '-' || LPAD(seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_presupuesto_numero ON presupuestos;
CREATE TRIGGER trg_presupuesto_numero
  BEFORE INSERT ON presupuestos
  FOR EACH ROW EXECUTE FUNCTION fn_generar_numero_presupuesto();
