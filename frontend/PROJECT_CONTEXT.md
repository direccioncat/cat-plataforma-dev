# CAT Plataforma — Estado del desarrollo (actualizado sesión actual)

## Estado de la BD
- OS-012: estado `validacion`
- OS-013: estado `borrador` — es la OS de trabajo actual
- Base única: "Base Central" (id: `6677c27b-a0cf-43d9-b17c-f6638d54c5bc`)
- OS-013 id: `4f601149-7990-454d-9c5b-5a481811fb06`
- Columna `poligono_coords JSONB` agregada a `os_items`

## APIs Google Cloud (proyecto "Partes Servicio") — todas habilitadas
- Maps JavaScript API ✅
- Places API ✅
- Geocoding API ✅

## Módulo OS — estado actual (todo funciona)

### Archivos clave
- `src/components/OSItemPanel.jsx` — v3: cards enriquecidas, ViewPanel + EditPanel, ContadorAgentes
- `src/components/UbicacionInput.jsx` — campo único libre con Georef + Google Geocoding para entre calles
- `src/components/MapaPoligono.jsx` — mapa con DrawingManager
- `src/components/DetalleOS.jsx` — wrapper con padding 20px 28px

### Funcionalidades implementadas
- **Cards de ítems**: nombre, turnos pills, modo ubicación + dirección, base principal 🏢, eje PSV badge azul, link Maps ↗
- **Panel Vista** (read-only): mini mapa Google Maps (pin o polígono), ubicación, eje PSV, cadena de turnos, instrucciones, botón Editar
- **Panel Edición**: form completo, botón Guardar/Cancelar
- **Contador de agentes por turno**: barra superior muestra `TM 5 · TI 5 · TN 2 · FSN 4` etc.
- **Búsqueda de ubicación**:
  - Altura e intersección: Georef API (apis.datos.gob.ar/georef, `provincia=02`)
  - Entre calles: Google Geocoding API — geocodifica las 2 intersecciones y calcula punto medio
  - Polígono: Google Maps DrawingManager + mini mapa con buscador + modal ampliado + nombre zona + calles de referencia automáticas (reverse geocoding)
- **Layout**: padding 28px horizontal en DetalleOS, cards con borde izquierdo de color, botones + Servicio / + Misión con espacio

### Lógica entre calles (técnica CAD real)
Geocodifica "Calle y Desde" → punto A, "Calle y Hasta" → punto B → lat/lng = (A+B)/2

### Polígono
- MiniMapaPoligono: mapa chico con buscador, botón "Trazar zona" abre modal grande
- Al trazar: detecta calles de referencia automáticamente via Georef `/ubicacion`
- Campo de nombre de zona manual (si no, usa calles detectadas)
- ViewPanel muestra el polígono con fitBounds

## Pendiente de esta sesión
- Crear 5 ítems de ejemplo en OS-013 (SQL en `crear_items_ejemplo.js` o script SQL)
- Continuar con lo que defina Agus en el próximo chat

## Próximos temas posibles
- Flujo de validación/aprobación de OS
- Generación de misiones del día ("Generar hoy")
- Panel admin / gestión de usuarios
- Módulo de misiones (vista coordinador)
