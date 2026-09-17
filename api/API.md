# Documentación de las APIs SECSS

## Datos generales

- **API web:** `http://localhost:4000/api`
- **API móvil:** `http://localhost:4100/api/mobile/v1`
- **Formato:** JSON, excepto los endpoints que reciben archivos.
- **Autenticación:** JWT en `Authorization: Bearer <token>`.
- **Archivos:** los endpoints de carga usan `multipart/form-data`.
- **Salud web:** `GET /api/core/health`.
- **Salud móvil:** `GET /api/mobile/v1/core/health`.

Las dos APIs tienen código, dependencias y procesos independientes. Ambas
usan la misma base de datos MySQL.

## Puesta en marcha

API web:

```powershell
cd Backend
npm install
Copy-Item .env.example .env
npm start
```

API móvil, en otra terminal:

```powershell
cd api
npm install
Copy-Item .env.example .env
npm start
```

## Flujo recomendado en Postman

1. Ejecutar `GET /api/mobile/v1/core/health` o `GET /api/core/health`.
2. Ejecutar el login correspondiente.
3. Guardar el JWT en la variable de entorno del rol autenticado.
4. En solicitudes protegidas enviar `Authorization: Bearer {{token}}`.

Para probar la API móvil, usa `http://localhost:4100` como `baseUrl` y el
prefijo `/api/mobile/v1`. Para la web usa `http://localhost:4000` y `/api`.

La colección puede publicarse en Postman mediante **Collections → ... → View
documentation → Publish**.

## Endpoints públicos

| Método | Web | Móvil | Uso |
|---|---|---|---|
| GET | `/api/core/health` | `/api/mobile/v1/core/health` | Comprueba la conexión con MySQL. |
| GET | `/api/core/centros-publicos` | `/api/mobile/v1/core/centros-publicos` | Lista centros para registro de aprendiz. |
| POST | `/api/auth/storeAuthLogin` | `/api/mobile/v1/auth/storeAuthLogin` | Inicia sesión y devuelve JWT. |
| POST | `/api/auth/storeAuthRegister` | `/api/mobile/v1/auth/storeAuthRegister` | Registra aprendiz con soportes multipart. |
| POST | `/api/auth/forgot-password` | `/api/mobile/v1/auth/forgot-password` | Solicita recuperación. |
| POST | `/api/auth/reset-password` | `/api/mobile/v1/auth/reset-password` | Cambia contraseña con token. |

## Recursos protegidos

Las rutas siguientes existen con el prefijo web `/api` y el prefijo móvil
`/api/mobile/v1`, conservando los mismos métodos, cuerpos y roles:

- **Usuarios:** `/users/me`, `/users`, `/users/elegibles`,
  `/users/:id`, `/users/:id/aprendiz`, `/users/celador`,
  `/users/jefe`, `/users/asignar-celador`.
- **Vehículos:** `/vehicle/me`, `/vehicle/:id`, `/vehicle`,
  `/vehicle/:id/inactivar`.
- **Cupos:** `/quota`, `/quota/me`, `/quota/usuario/:idUsuario`,
  `/quota/detalle/:idUsuario/:idVehiculo`,
  `/quota/:idUsuario/:idVehiculo`.
- **Entrada y salida:** `/input_output/me`, `/input_output`,
  `/input_output/:id`, `/input_output/entrada`,
  `/input_output/invitado`, `/input_output/salida/:id`.
- **Reportes:** `/reportes`, `/reportes/:id`.
- **PQRS:** `/pqrs`, `/pqrs/:id`, `/pqrs/:id/respuesta`,
  `/respuestas`, `/respuestas/:id`.

El registro de vehículos admite tarjeta de propiedad para bicicletas mediante
`imagen_url_tarjeta_propiedad`.

## Respuestas y archivos

Respuesta exitosa habitual:

```json
{
  "ok": true,
  "datos": {}
}
```

Respuesta de error:

```json
{
  "ok": false,
  "mensaje": "Descripción del error."
}
```

Los archivos web se consultan con
`http://localhost:4000/storage/<ruta>`. Los archivos móviles con
`http://localhost:4100/storage/<ruta>`.

## Independencia operativa

Detener `Backend/` no detiene `api/`, y detener `api/` no detiene `Backend/`.
La independencia aplica al código, las dependencias y los procesos HTTP.
Como ambas versiones consultan la misma base de datos, una caída o
indisponibilidad de MySQL sí afecta a las dos.
