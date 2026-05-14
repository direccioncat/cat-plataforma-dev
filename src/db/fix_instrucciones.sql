-- Agrega columna instrucciones a os_items
ALTER TABLE os_items ADD COLUMN IF NOT EXISTS instrucciones TEXT;
