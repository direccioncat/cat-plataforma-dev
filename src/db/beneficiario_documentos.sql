-- Documentos adjuntos a beneficiarios (estatutos, constancias, etc.)
CREATE TABLE IF NOT EXISTS beneficiario_documentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id UUID NOT NULL REFERENCES beneficiarios(id) ON DELETE CASCADE,
  nombre          VARCHAR(255) NOT NULL,   -- nombre descriptivo ingresado por el usuario
  nombre_archivo  VARCHAR(255) NOT NULL,   -- nombre en disco (UUID + ext)
  tipo_mime       VARCHAR(100),
  tamanio         INTEGER,                 -- bytes
  subido_por      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beneficiario_documentos_benef ON beneficiario_documentos(beneficiario_id);
