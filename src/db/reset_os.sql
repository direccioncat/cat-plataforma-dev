-- Limpia OS y sus ítems, y actualiza el constraint de estados
DELETE FROM os_items;
DELETE FROM ordenes_servicio;
ALTER TABLE ordenes_servicio DROP CONSTRAINT IF EXISTS ordenes_servicio_estado_check;
ALTER TABLE ordenes_servicio ADD CONSTRAINT ordenes_servicio_estado_check CHECK (estado IN ('borrador','validacion','vigente','cumplida'));
