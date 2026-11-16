# Pruebas de negocio consolidadas

Las reglas de negocio SECSS02 se validan ahora mediante las rutas HTTP. Los nombres `DEFECTO · [SECSS02-…]` identifican resultados que el backend todavía incumple, así Jest los muestra como fallos normales en la tabla.

| Dominio | Suite de rutas | Requisitos principales |
| --- | --- | --- |
| Autenticación y contraseñas | `auth.routes.test.js` | SECSS02-2, 11, 24, 36, 38 |
| Usuarios y roles | `user.routes.test.js` | SECSS02-12, 13, 27, 30, 36, 37, 38, 41 |
| Reportes y PQRS | `attention.routes.test.js` | SECSS02-9, 16, 19, 20, 32, 34, 42 |
| Centros | `core.routes.test.js` | SECSS02-15, 18, 33, 43, 46 |
| Cupos | `quota.routes.test.js` | SECSS02-26 |
| Invitados y entradas | `input_output.routes.test.js` | SECSS02-10, 14, 41 |
| Archivos de usuario | `user.routes.test.js` y `input_output.routes.test.js` | SECSS02-44 |

Los plazos exactos de invitado y la propiedad de la carpeta de almacenamiento se mantienen pendientes de definición; no se marcan como defectos hasta confirmar esas reglas.
