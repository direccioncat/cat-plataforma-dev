-- Nuevas tablas para cadena de turnos en os_items
-- os_item_turnos: cada eslabón de la cadena
CREATE TABLE IF NOT EXISTS os_item_turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_item_id UUID REFERENCES os_items(id) ON DELETE CASCADE NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  turno TEXT NOT NULL,
  base_id UUID REFERENCES bases(id),
  cantidad_agentes INTEGER NOT NULL DEFAULT 1,
  coordinador_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- os_item_relevos: conector entre eslabón N y N+1
CREATE TABLE IF NOT EXISTS os_item_relevos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_item_id UUID REFERENCES os_items(id) ON DELETE CASCADE NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'Normal' CHECK (tipo IN ('Normal','En zona')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_os_item_turnos_item ON os_item_turnos(os_item_id);
CREATE INDEX IF NOT EXISTS idx_os_item_relevos_item ON os_item_relevos(os_item_id);
