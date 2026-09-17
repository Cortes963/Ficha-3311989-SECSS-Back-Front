# Documentación de la API SECSS

## Datos generales

- **URL local:** `http://localhost:4000`
- **Prefijo:** `/api`
- **Formato:** JSON, excepto los endpoints que reciben archivos.
- **Autenticación:** JWT en `Authorization: Bearer <token>`.
- **Archivos:** los endpoints de carga usan `multipart/form-data`.
- **Salud:** `GET /api/core/health`.

La API es la única capa que expone HTTP. Los controladores y las consultas SQL
se encuentran en `Backend/`.

## Puesta en marcha

```powershell
cd api
npm install
cd ../Backend
npm install
cd ../api
npm start
```

Antes de iniciar, configura `api/.env` con `JWT_SECRET` de al menos 32
caracteres y las credenciales de MySQL.

## Flujo recomendado en Postman

1. Ejecutar `GET /api/core/health`.
2. Ejecutar `POST /api/auth/storeAuthLogin`.
3. Guardar el JWT devuelto en la variable de entorno `tokenAdmin`,
   `tokenJefe`, `tokenCelador`, `tokenAprendizSemilla` o
   `tokenInvitadoSemilla`, según el usuario autenticado.
4. En las solicitudes protegidas enviar
   `Authorization: Bearer {{token}}`.

La colección adaptada de Postman contiene pruebas y scripts para guardar
tokens y los identificadores creados. En Postman se puede publicar mediante
**Collections → ... → View documentation → Publish**. La documentación
publicada se genera a partir de los nombres, descripciones, ejemplos y
respuestas guardados en la colección.

## Endpoints públicos

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/core/health` | Comprueba la conexión con MySQL. |
| GET | `/api/core/centros-publicos` | Lista los centros disponibles para el registro público de aprendiz. |
| POST | `/api/auth/storeAuthLogin` | Inicia sesión y devuelve un JWT. |
| POST | `/api/auth/storeAuthRegister` | Registra públicamente un aprendiz. Recibe datos y soportes académicos en multipart. |
| POST | `/api/auth/forgot-password` | Solicita recuperación de contraseña. |
| POST | `/api/auth/reset-password` | Cambia la contraseña usando el token de recuperación. |

## Usuarios y perfiles — requieren JWT

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/users/me` | Usuario autenticado. |
| PATCH | `/api/users/me` | Aprendiz, invitado, celador, jefe o administrador. |
| PATCH | `/api/users/me/password` | Todos los roles autenticados. |
| PATCH | `/api/users/me/estado` | Todos los roles autenticados. |
| GET | `/api/users/me/aprendiz` | Aprendiz, administrador, jefe o celador. |
| PATCH | `/api/users/me/aprendiz` | Actualiza datos y soportes académicos. |
| GET | `/api/users` | Administrador, jefe o celador. |
| GET | `/api/users/elegibles` | Administrador o jefe. |
| GET | `/api/users/:id` | Administrador, jefe o celador. |
| GET | `/api/users/:id/aprendiz` | Administrador, jefe o celador. |
| PATCH | `/api/users/:id/aprendiz` | Actualiza datos académicos. |
| PATCH | `/api/users/:id/estado` | Administrador o jefe. |
| POST | `/api/users/celador` | Jefe. |
| POST | `/api/users/jefe` | Administrador. |
| POST | `/api/users/asignar-celador` | Administrador o jefe. |

## Vehículos — requieren JWT

| Método | Ruta | Rol | Tipo |
|---|---|---|---|
| GET | `/api/vehicle/me` | Aprendiz o invitado | JSON |
| GET | `/api/vehicle/:id` | Aprendiz o invitado | JSON |
| POST | `/api/vehicle` | Aprendiz | multipart |
| PATCH | `/api/vehicle/:id` | Aprendiz o invitado | multipart |
| PATCH | `/api/vehicle/:id/inactivar` | Aprendiz o invitado | JSON |

El registro multipart admite los soportes requeridos por el tipo de vehículo.
Para bicicletas también debe enviarse la foto de la tarjeta de propiedad:
`imagen_url_tarjeta_propiedad`.

## Cupos

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/quota` | Administrador, jefe o celador. |
| GET | `/api/quota/me` | Todos los roles operativos. |
| GET | `/api/quota/usuario/:idUsuario` | JWT válido. |
| GET | `/api/quota/detalle/:idUsuario/:idVehiculo` | JWT válido. |
| PATCH | `/api/quota/:idUsuario/:idVehiculo` | Administrador. |

## Entrada y salida de vehículos

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/input_output/me` | Invitado o aprendiz. |
| GET | `/api/input_output` | Administrador, jefe o celador. |
| GET | `/api/input_output/:id` | Invitado, aprendiz, celador o jefe. |
| POST | `/api/input_output/entrada` | Celador. |
| POST | `/api/input_output/invitado` | Celador; recibe multipart. |
| PATCH | `/api/input_output/salida/:id` | Celador. |

## Reportes y PQRS

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/reportes` | Celador o jefe. |
| POST | `/api/reportes` | Celador. |
| GET | `/api/reportes/:id` | Celador o jefe. |
| PUT | `/api/reportes/:id` | Celador. |
| GET | `/api/pqrs` | JWT válido. |
| POST | `/api/pqrs` | Jefe, celador, aprendiz o invitado. |
| GET | `/api/pqrs/:id` | JWT válido. |
| PUT | `/api/pqrs/:id` | JWT válido; el controlador valida el propietario. |
| GET | `/api/pqrs/:id/respuesta` | JWT válido. |
| POST | `/api/pqrs/:id/respuesta` | Administrador. |
| GET | `/api/respuestas` | Administrador. |
| PUT | `/api/respuestas/:id` | Administrador. |

## Respuestas y errores

Las respuestas exitosas normalmente tienen esta forma:

```json
{
  "ok": true,
  "datos": {}
}
```

Los errores de validación, autorización o ruta utilizan:

```json
{
  "ok": false,
  "mensaje": "Descripción del error."
}
```

Los archivos almacenados se consultan mediante:
`http://localhost:4000/storage/<ruta-devuelta-por-la-api>`.

