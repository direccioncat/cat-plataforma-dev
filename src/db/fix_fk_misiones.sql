-- Cambia la FK de misiones.os_item_id a ON DELETE SET NULL
-- Así al borrar un ítem de OS las misiones ya generadas no se pierden
ALTER TABLE misiones
  DROP CONSTRAINT misiones_os_item_id_fkey,
  ADD CONSTRAINT misiones_os_item_id_fkey
    FOREIGN KEY (os_item_id) REFERENCES os_items(id) ON DELETE SET NULL;
