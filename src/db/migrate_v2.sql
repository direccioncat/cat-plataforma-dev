-- ─────────────────────────────────────────────────────────────
-- Migración: nuevos roles, tipo de OS, vigencia, grupos
-- ─────────────────────────────────────────────────────────────

-- 1. Actualizar CHECK de roles en profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('gerencia','jefe_base','coordinador','supervisor','agente','admin','director','planeamiento','jefe_cgm','coordinador_cgm'));

-- 2. Agregar columnas a ordenes_servicio
ALTER TABLE ordenes_servicio
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'ordinaria'
    CHECK (tipo IN ('ordinaria','adicional','alcoholemia')),
  ADD COLUMN IF NOT EXISTS vigencia_inicio TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vigencia_fin TIMESTAMPTZ;

-- 3. Tabla de fechas para OS adicional (fechas salteadas)
CREATE TABLE IF NOT EXISTS os_fechas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES ordenes_servicio(id) ON DELETE CASCADE NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de grupos (genérica, multi-módulo)
CREATE TABLE IF NOT EXISTS grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  modulo TEXT DEFAULT '*',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reglas de cada grupo (dinámicas)
CREATE TABLE IF NOT EXISTS grupo_reglas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('base','role','profile')),
  valor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Accesos a OS de alcoholemia
CREATE TABLE IF NOT EXISTS os_alcoholemia_accesos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES ordenes_servicio(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('base','role','profile','grupo')),
  valor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
