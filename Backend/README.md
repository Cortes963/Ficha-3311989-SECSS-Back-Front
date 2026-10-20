# Web API y Backend SECSS

`Backend/` contiene ahora el proceso completo de la plataforma web:

- `server.js` y `app.js`: API HTTP web.
- `routes/`: rutas web.
- `controller/`, `services/`, `middleware/`: lógica y seguridad web.
- `db.js`: conexión propia a MySQL.
- `storage/`: archivos usados por la API web.

La web conserva las rutas `/api/*` para no romper el frontend actual y también
publica la versión explícita `/api/web/v1/*`.

## Inicio

```powershell
cd Backend
npm install
Copy-Item .env.example .env
npm run dev
```

Por defecto escucha en `http://localhost:4000`.

La API móvil de `api/` es un proceso separado, con sus propias copias de
controladores, middleware, dependencias y conexión MySQL. Ambos procesos
pueden usar la misma base de datos sin que uno importe el código del otro.

## Datos de Cypress para cuota

En PowerShell, desde `Backend/`, ejecuta lo siguiente contra una base local de
pruebas:

```powershell
$env:CYPRESS_SEED_CONFIRM = '1'
npm run seed:cypress
```

El sembrador lee las cuentas directamente de `frontend/cypress.config.js`,
prepara los datos de ficha de los aprendices, reserva el usuario inactivo y los
IDs de vehículo esperados, y deja `aprendiz3` sin cupos para las pruebas de
usuario sin vehículo. Se puede ejecutar más de una vez. No lo ejecutes contra
una base de producción: sincroniza las contraseñas de esas cuentas con la
contraseña de prueba de Cypress y modifica sus roles/estados.
