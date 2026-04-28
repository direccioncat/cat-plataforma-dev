# CHANGELOG — rama `agustin`

Cambios incluidos en la rama `agustin` respecto al estado previo del repositorio (`master` de `cat-plataforma-dev`).

---

## ⚠️ Acciones requeridas antes de testear

> Estas dos acciones son **obligatorias** del lado del dev/servidor para que la rama funcione correctamente en Render.

### 1. Ejecutar migración SQL en Supabase

El módulo de Presupuestos requiere una tabla nueva en la base de datos. Sin esto, cualquier operación sobre presupuestos devuelve error 500.

Ejecutar en la consola SQL de Supabase el contenido del archivo:
```
backend/src/db/presupuestos.sql
```

Crea la tabla `presupuestos` con trigger de auto-numeración (`P-001/2026`).

### 2. Configurar `VITE_API_URL` en el build del frontend

En `frontend/src/lib/api.js` la URL base del backend se define así:
```js
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
```

Si `VITE_API_URL` está vacío al momento del build, el frontend en producción apunta a `http://localhost:3000` y **no puede conectarse al backend en Render**.

Antes de buildear el frontend, asegurarse de que `VITE_API_URL` esté seteado con la URL del servicio backend en Render. Ejemplo:
```
VITE_API_URL=https://cat-plataforma-api.onrender.com
```

---

## [2026-04-28] — feat: Módulo Presupuestos + Trazabilidad OS Adicional + Fixes Producción

### 🆕 Módulo Presupuestos (nuevo, completo)

Nuevo submodulo bajo Servicios Adicionales que permite generar, gestionar y exportar presupuestos institucionales de servicios adicionales.

#### Backend

| Archivo | Tipo | Descripción |
|---|---|---|
| `backend/src/db/presupuestos.sql` | NUEVO | Tabla `presupuestos` con trigger de auto-numeración formato `P-001/2026`. Columna `items` JSONB, FK a `profiles.id` (UUID). |
| `backend/src/controller/presupuestos.js` | NUEVO | CRUD completo: `getPresupuestos`, `getPresupuesto`, `postPresupuesto`, `putPresupuesto`, `deletePresupuesto`. |
| `backend/src/router/presupuestos.js` | NUEVO | Rutas REST para presupuestos. Roles permitidos: `admin`, `operador_adicionales`, `gerencia`, `director`, `jefe_cgm`. |
| `backend/src/index.js` | MODIFICADO | Línea ~63: agregado `app.use('/api/presupuestos', require('./router/presupuestos'))`. |

#### Frontend

| Archivo | Tipo | Descripción |
|---|---|---|
| `frontend/src/pages/PresupuestosPage.jsx` | NUEVO | Page wrapper que monta `PresupuestosLista`. |
| `frontend/src/components/Presupuestos/PresupuestosLista.jsx` | NUEVO | Lista de presupuestos con tabs de estado (borrador/enviado/aprobado/rechazado/vencido). Acciones: Enviar, Aprobar, Rechazar, Modificar (negociación). |
| `frontend/src/components/Presupuestos/ModalNuevoPresupuesto.jsx` | NUEVO | Modal de creación y edición. Tabla de ítems dinámica con columnas: Día, Cobertura, Horario, Personal, Módulos, Tot.Mód. (calculado), Total (calculado). Campo global `valorModulo`. Modo edición: resetea estado a `borrador` para renegociación. |
| `frontend/src/components/Presupuestos/PresupuestoPDF.jsx` | NUEVO | Generador de PDF institucional. Header navy con logos CAT + BA Ciudad, número de presupuesto, datos del servicio, tabla de ítems, cláusula legal y pie. Usa `window.open()` + `document.write()` para impresión. |
| `frontend/src/assets/logo-ba-ciudad.svg` | NUEVO | Logo oficial BA Ciudad (monograma vectorial). |
| `frontend/src/App.jsx` | MODIFICADO | Líneas ~10-15: import `PresupuestosPage`, constante `ROLES_PRESUPUESTOS`, componente `RutaPresupuestos`, ruta `/presupuestos`. |

#### Migración de base de datos requerida
> ⚠️ **El dev debe ejecutar este SQL en la base Supabase antes de testear el módulo:**
```sql
-- Ejecutar contenido de: backend/src/db/presupuestos.sql
```

---

### 🔄 Trazabilidad OS Adicional → Presupuesto

Al crear una nueva OS Adicional, en lugar de seleccionar fechas manualmente en un calendario, ahora se selecciona un **presupuesto aprobado** y las fechas se extraen automáticamente de sus ítems.

| Archivo | Tipo | Descripción |
|---|---|---|
| `frontend/src/pages/OSAdicionalPage.jsx` | MODIFICADO | Reemplaza componente `ModalFechas` (calendario) por `ModalPresupuestoSelector`. El nuevo modal: fetcha `GET /api/presupuestos`, filtra `estado === 'aprobado'`, tiene buscador por número/beneficiario/evento, extrae fechas únicas de `items[].dia`. La URL de creación pasa además `?presupuesto_id=<id>` para trazabilidad futura. |

---

### 🗂️ Sidebar — reorden Servicios Adicionales

| Archivo | Tipo | Descripción |
|---|---|---|
| `frontend/src/components/AppShell.jsx` | MODIFICADO | Líneas 127-149 (array `children` del grupo `ssaa`): Presupuestos movido a **primera posición**, antes de OS Adicional y Gestión SS.AA. Agregado icono `IcoPresupuesto` (líneas 69-77). |

---

### 🐛 Fixes de producción (Render + Supabase)

| Archivo | Tipo | Descripción |
|---|---|---|
| `backend/src/db/pool.js` | MODIFICADO | Líneas 4-7: SSL condicional activado cuando `NODE_ENV === 'production'` o el host contiene `supabase`. Requerido para conectar a Supabase desde Render. |
| `backend/src/index.js` | MODIFICADO | Líneas 22-27: `https://cat-plataforma-dev.onrender.com` y `process.env.FRONTEND_URL` agregados a `origenesPermitidos`. Resuelve errores CORS en producción. |

---

### 🔧 Sistema de Scoring SS.AA. (sesión anterior)

| Archivo | Tipo | Descripción |
|---|---|---|
| `frontend/src/components/ServiciosAdicionales/SAConfigScoring.jsx` | MODIFICADO | Correcciones en configuración y visualización del algoritmo de scoring. |
| `frontend/src/components/ServiciosAdicionales/SADetalle.jsx` | MODIFICADO | Integración de scoring en detalle del servicio adicional. |
| `frontend/src/components/ServiciosAdicionales/SATabArmado.jsx` | MODIFICADO | Mejoras en tab de armado de dotación. |
| `frontend/src/components/ServiciosAdicionales/SATabPresentismo.jsx` | MODIFICADO | Soporte para marcación justificada. |
| `backend/src/controller/servicios_adicionales.js` | MODIFICADO | Lógica de scoring y estados de presentismo. |
| `backend/src/model/servicios_adicionales.js` | MODIFICADO | Queries actualizadas para scoring y presentismo justificado. |
| `backend/src/service/servicios_adicionales.js` | MODIFICADO | Servicio de cálculo de scoring. |
| `backend/src/service/validaciones/servicios_adicionales.js` | MODIFICADO | Validaciones actualizadas. |
| `backend/src/db/migrate_config_justificado.js` | NUEVO | Migración: campo config justificado en SA. |
| `backend/src/db/migrate_presentismo_justificado.js` | NUEVO | Migración: estado justificado en presentismo. |

---

### ⚙️ Variables de entorno necesarias en Render

El archivo `.env` provisto por el dev debe tener:
- `DATABASE_URL` / `DB_HOST` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` — conexión Supabase ✅
- `JWT_SECRET` ✅
- `FRONTEND_URL` — URL del frontend en Render (para CORS dinámico)
- `VITE_API_URL` — URL del backend en Render (para el build del frontend)

> **Nota:** `VITE_API_URL` debe estar configurado al momento del build de Vite. Si está vacío, el frontend cae a `http://localhost:3000` y no funciona en producción.
