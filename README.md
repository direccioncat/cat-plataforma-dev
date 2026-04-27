
```
backend
├─ package-lock.json
├─ package.json
├─ schema.sql
├─ src
│  ├─ config.js
│  ├─ controller
│  │  ├─ actividad.js
│  │  ├─ auth.js
│  │  ├─ bases.js
│  │  ├─ misiones.js
│  │  ├─ os.js
│  │  ├─ os_adicional.js
│  │  ├─ postular.js
│  │  ├─ profiles.js
│  │  ├─ sanciones.js
│  │  ├─ servicios_adicionales.js
│  │  └─ upload.js
│  ├─ db
│  │  ├─ add-estado-turno.js
│  │  ├─ buscador_temp.js
│  │  ├─ drawer_temp.js
│  │  ├─ fix-schema.js
│  │  ├─ fix_fk_misiones.sql
│  │  ├─ fix_instrucciones.sql
│  │  ├─ fix_poligono_coords.sql
│  │  ├─ fix_semana_nullable.sql
│  │  ├─ limpiar_ejemplos.js
│  │  ├─ migrate.js
│  │  ├─ migrate_convocatoria_tokens.js
│  │  ├─ migrate_dotacion_motorizados.js
│  │  ├─ migrate_dotacion_nuevos_roles.js
│  │  ├─ migrate_estructura_unique.js
│  │  ├─ migrate_os_adicional.js
│  │  ├─ migrate_os_adicional_estados.js
│  │  ├─ migrate_os_adicional_turnos.js
│  │  ├─ migrate_os_adicional_v2.js
│  │  ├─ migrate_os_adicional_v2.sql
│  │  ├─ migrate_recursos_categoria.js
│  │  ├─ migrate_sanciones.js
│  │  ├─ migrate_sa_flyer.js
│  │  ├─ migrate_sa_recursos_estado.js
│  │  ├─ migrate_sa_turnos.js
│  │  ├─ migrate_sa_turnos_nombre.js
│  │  ├─ migrate_sa_turnos_rename.js
│  │  ├─ migrate_servicios_adicionales.js
│  │  ├─ migrate_v2.sql
│  │  ├─ migrate_v3.sql
│  │  ├─ migrations
│  │  │  └─ add_comuna_to_os_items.sql
│  │  ├─ pool.js
│  │  ├─ reset-passwords.js
│  │  ├─ reset_os.sql
│  │  ├─ seed.js
│  │  └─ seed_equipo.js
│  ├─ index.js
│  ├─ middleware
│  │  └─ auth.js
│  ├─ model
│  │  ├─ actividad.js
│  │  ├─ auth.js
│  │  ├─ bases.js
│  │  ├─ misiones.js
│  │  ├─ os.js
│  │  ├─ os_adicional.js
│  │  ├─ postular.js
│  │  ├─ profiles.js
│  │  ├─ sanciones.js
│  │  ├─ servicios_adicionales.js
│  │  └─ upload.js
│  ├─ router
│  │  ├─ actividad.js
│  │  ├─ auth.js
│  │  ├─ bases.js
│  │  ├─ misiones.js
│  │  ├─ os.js
│  │  ├─ os_adicional.js
│  │  ├─ postular.js
│  │  ├─ profiles.js
│  │  ├─ sanciones.js
│  │  ├─ servicios_adicionales.js
│  │  └─ upload.js
│  └─ service
│     ├─ actividad.js
│     ├─ auth.js
│     ├─ bases.js
│     ├─ misiones.js
│     ├─ os.js
│     ├─ os_adicional.js
│     ├─ postular.js
│     ├─ profiles.js
│     ├─ sanciones.js
│     ├─ servicios_adicionales.js
│     ├─ upload.js
│     └─ validaciones
│        ├─ actividad.js
│        ├─ auth.js
│        ├─ bases.js
│        ├─ misiones.js
│        ├─ os.js
│        ├─ os_adicional.js
│        ├─ postular.js
│        ├─ profiles.js
│        ├─ sanciones.js
│        ├─ servicios_adicionales.js
│        └─ upload.js
├─ subir_a_github.bat
├─ subir_frontend_github.js
└─ xcopy_exclude.txt

```
```
backend
├─ package-lock.json
├─ package.json
├─ README.md
├─ schema.sql
├─ src
│  ├─ config.js
│  ├─ controller
│  │  ├─ actividad.js
│  │  ├─ auth.js
│  │  ├─ bases.js
│  │  ├─ misiones.js
│  │  ├─ os.js
│  │  ├─ os_adicional.js
│  │  ├─ postular.js
│  │  ├─ profiles.js
│  │  ├─ sanciones.js
│  │  ├─ servicios_adicionales.js
│  │  └─ upload.js
│  ├─ db
│  │  ├─ add-estado-turno.js
│  │  ├─ buscador_temp.js
│  │  ├─ drawer_temp.js
│  │  ├─ fix-schema.js
│  │  ├─ fix_fk_misiones.sql
│  │  ├─ fix_instrucciones.sql
│  │  ├─ fix_poligono_coords.sql
│  │  ├─ fix_semana_nullable.sql
│  │  ├─ limpiar_ejemplos.js
│  │  ├─ migrate.js
│  │  ├─ migrate_convocatoria_tokens.js
│  │  ├─ migrate_dotacion_motorizados.js
│  │  ├─ migrate_dotacion_nuevos_roles.js
│  │  ├─ migrate_estructura_unique.js
│  │  ├─ migrate_os_adicional.js
│  │  ├─ migrate_os_adicional_estados.js
│  │  ├─ migrate_os_adicional_turnos.js
│  │  ├─ migrate_os_adicional_v2.js
│  │  ├─ migrate_os_adicional_v2.sql
│  │  ├─ migrate_recursos_categoria.js
│  │  ├─ migrate_sanciones.js
│  │  ├─ migrate_sa_flyer.js
│  │  ├─ migrate_sa_recursos_estado.js
│  │  ├─ migrate_sa_turnos.js
│  │  ├─ migrate_sa_turnos_nombre.js
│  │  ├─ migrate_sa_turnos_rename.js
│  │  ├─ migrate_servicios_adicionales.js
│  │  ├─ migrate_v2.sql
│  │  ├─ migrate_v3.sql
│  │  ├─ migrations
│  │  │  └─ add_comuna_to_os_items.sql
│  │  ├─ pool.js
│  │  ├─ reset-passwords.js
│  │  ├─ reset_os.sql
│  │  ├─ seed.js
│  │  └─ seed_equipo.js
│  ├─ index.js
│  ├─ middleware
│  │  └─ auth.js
│  ├─ model
│  │  ├─ actividad.js
│  │  ├─ auth.js
│  │  ├─ bases.js
│  │  ├─ misiones.js
│  │  ├─ os.js
│  │  ├─ os_adicional.js
│  │  ├─ postular.js
│  │  ├─ profiles.js
│  │  ├─ sanciones.js
│  │  ├─ servicios_adicionales.js
│  │  └─ upload.js
│  ├─ router
│  │  ├─ actividad.js
│  │  ├─ auth.js
│  │  ├─ bases.js
│  │  ├─ misiones.js
│  │  ├─ os.js
│  │  ├─ os_adicional.js
│  │  ├─ postular.js
│  │  ├─ profiles.js
│  │  ├─ sanciones.js
│  │  ├─ servicios_adicionales.js
│  │  └─ upload.js
│  └─ service
│     ├─ actividad.js
│     ├─ auth.js
│     ├─ bases.js
│     ├─ misiones.js
│     ├─ os.js
│     ├─ os_adicional.js
│     ├─ postular.js
│     ├─ profiles.js
│     ├─ sanciones.js
│     ├─ servicios_adicionales.js
│     ├─ upload.js
│     └─ validaciones
│        ├─ actividad.js
│        ├─ auth.js
│        ├─ bases.js
│        ├─ misiones.js
│        ├─ os.js
│        ├─ os_adicional.js
│        ├─ postular.js
│        ├─ profiles.js
│        ├─ sanciones.js
│        ├─ servicios_adicionales.js
│        └─ upload.js
├─ subir_a_github.bat
├─ subir_frontend_github.js
└─ xcopy_exclude.txt

```
```
backend
├─ package-lock.json
├─ package.json
├─ public
│  ├─ assets
│  │  ├─ chunk-DECur_0Z.js
│  │  ├─ index-C41LTomV.js
│  │  ├─ index-DyqJ0tBl.css
│  │  ├─ index.es-D50Py2j3.js
│  │  ├─ logo-cat-DjaJa7VN.png
│  │  └─ purify.es-DFivPf1X.js
│  ├─ favicon.svg
│  ├─ icons.svg
│  └─ index.html
├─ README.md
├─ schema.sql
├─ src
│  ├─ config.js
│  ├─ controller
│  │  ├─ actividad.js
│  │  ├─ auth.js
│  │  ├─ bases.js
│  │  ├─ misiones.js
│  │  ├─ os.js
│  │  ├─ os_adicional.js
│  │  ├─ postular.js
│  │  ├─ profiles.js
│  │  ├─ sanciones.js
│  │  ├─ servicios_adicionales.js
│  │  └─ upload.js
│  ├─ db
│  │  ├─ add-estado-turno.js
│  │  ├─ buscador_temp.js
│  │  ├─ drawer_temp.js
│  │  ├─ fix-schema.js
│  │  ├─ fix_fk_misiones.sql
│  │  ├─ fix_instrucciones.sql
│  │  ├─ fix_poligono_coords.sql
│  │  ├─ fix_semana_nullable.sql
│  │  ├─ limpiar_ejemplos.js
│  │  ├─ migrate.js
│  │  ├─ migrate_convocatoria_tokens.js
│  │  ├─ migrate_dotacion_motorizados.js
│  │  ├─ migrate_dotacion_nuevos_roles.js
│  │  ├─ migrate_estructura_unique.js
│  │  ├─ migrate_os_adicional.js
│  │  ├─ migrate_os_adicional_estados.js
│  │  ├─ migrate_os_adicional_turnos.js
│  │  ├─ migrate_os_adicional_v2.js
│  │  ├─ migrate_os_adicional_v2.sql
│  │  ├─ migrate_recursos_categoria.js
│  │  ├─ migrate_sanciones.js
│  │  ├─ migrate_sa_flyer.js
│  │  ├─ migrate_sa_recursos_estado.js
│  │  ├─ migrate_sa_turnos.js
│  │  ├─ migrate_sa_turnos_nombre.js
│  │  ├─ migrate_sa_turnos_rename.js
│  │  ├─ migrate_servicios_adicionales.js
│  │  ├─ migrate_v2.sql
│  │  ├─ migrate_v3.sql
│  │  ├─ migrations
│  │  │  └─ add_comuna_to_os_items.sql
│  │  ├─ pool.js
│  │  ├─ reset-passwords.js
│  │  ├─ reset_os.sql
│  │  ├─ seed.js
│  │  └─ seed_equipo.js
│  ├─ index.js
│  ├─ middleware
│  │  └─ auth.js
│  ├─ model
│  │  ├─ actividad.js
│  │  ├─ auth.js
│  │  ├─ bases.js
│  │  ├─ misiones.js
│  │  ├─ os.js
│  │  ├─ os_adicional.js
│  │  ├─ postular.js
│  │  ├─ profiles.js
│  │  ├─ sanciones.js
│  │  ├─ servicios_adicionales.js
│  │  └─ upload.js
│  ├─ router
│  │  ├─ actividad.js
│  │  ├─ auth.js
│  │  ├─ bases.js
│  │  ├─ misiones.js
│  │  ├─ os.js
│  │  ├─ os_adicional.js
│  │  ├─ postular.js
│  │  ├─ profiles.js
│  │  ├─ sanciones.js
│  │  ├─ servicios_adicionales.js
│  │  └─ upload.js
│  └─ service
│     ├─ actividad.js
│     ├─ auth.js
│     ├─ bases.js
│     ├─ misiones.js
│     ├─ os.js
│     ├─ os_adicional.js
│     ├─ postular.js
│     ├─ profiles.js
│     ├─ sanciones.js
│     ├─ servicios_adicionales.js
│     ├─ upload.js
│     └─ validaciones
│        ├─ actividad.js
│        ├─ auth.js
│        ├─ bases.js
│        ├─ misiones.js
│        ├─ os.js
│        ├─ os_adicional.js
│        ├─ postular.js
│        ├─ profiles.js
│        ├─ sanciones.js
│        ├─ servicios_adicionales.js
│        └─ upload.js
├─ subir_a_github.bat
├─ subir_frontend_github.js
└─ xcopy_exclude.txt

```