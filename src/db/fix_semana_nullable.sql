-- Fix: semana_inicio y semana_fin pasan a nullable (OS adicional no las usa)
ALTER TABLE ordenes_servicio
  ALTER COLUMN semana_inicio DROP NOT NULL,
  ALTER COLUMN semana_fin DROP NOT NULL;
