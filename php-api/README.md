# PHP mobile API

This folder is an independent PHP 8.1 implementation of the existing
`/api/mobile/v1` service. It uses the same MySQL schema and response field
names as `api/`, and does not replace or alter the JavaScript API.

## Run

```powershell
cd php-api
Copy-Item .env.example .env
composer install
composer serve
```

If Composer reports that dependencies are missing, run `composer install`
again from this folder. The project uses `firebase/php-jwt` 7.x to avoid the
security advisory affecting older releases.

The front controller is `public/index.php`; it supports the mobile health and
public-centre endpoints, login, public learner registration (JSON or
multipart), authenticated profiles, and vehicle listing/creation/detail and
inactivation. Send JWTs as `Authorization: Bearer <token>`.

Configure a random `JWT_SECRET` of at least 32 characters, MySQL credentials,
and comma-separated allowed `CORS_ORIGINS`. Uploaded files are stored below
`STORAGE_PATH`. The mobile application can use this service by changing its
base URL to `http://<servidor>:4200/api/mobile/v1`; the route names and JWT
contract remain compatible with the JavaScript mobile API.

The database tables (`usuario`, `cuenta`, `rol`,
`usuario_rol`, `detalle_aprendiz`, `centro`, `vehiculo`, `auth_vehiculo`,
`detalle_moto`, and `detalle_bicicleta`) are the existing SECSS tables.

## Endpoints implemented

- `GET /api/mobile/v1/core/health`
- `GET /api/mobile/v1/core/centros-publicos`
- `POST /api/mobile/v1/auth/storeAuthLogin`
- `POST /api/mobile/v1/auth/storeAuthRegister`
- `GET/PATCH /api/mobile/v1/users/me`
- `GET /api/mobile/v1/vehicle/me`
- `GET/PATCH /api/mobile/v1/vehicle/:id`
- `POST /api/mobile/v1/vehicle`
- `PATCH /api/mobile/v1/vehicle/:id/inactivar`

The PHP service and the JavaScript service can run against the same MySQL
database, but use different ports. The PHP service uses port `4200` and the
JavaScript mobile API uses port `4100`.
