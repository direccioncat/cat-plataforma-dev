-- Migracion: agregar columna comuna y barrio a os_items
-- Ejecutar en psql:
-- "C:\Program Files\PostgreSQL\18\bin\psql" -U postgres -d cat_plataforma -f "C:\cat-api\src\db\migrations\add_comuna_to_os_items.sql"

ALTER TABLE os_items ADD COLUMN IF NOT EXISTS comuna text;
ALTER TABLE os_items ADD COLUMN IF NOT EXISTS barrio text;
