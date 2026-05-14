-- Agrega columna para coordenadas del polígono
ALTER TABLE os_items ADD COLUMN IF NOT EXISTS poligono_coords JSONB;
