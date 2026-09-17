# API — SECSS

API HTTP en Node.js (Express 5) para el sistema de control vehicular SECSS.
La lógica de negocio y el acceso SQL viven en la carpeta hermana `Backend/`.

## Requisitos

- Node.js 18 o superior
- MySQL corriendo (local o remoto) con la base de datos ya creada

## Cómo levantar el proyecto

```bash
cd api
npm install
cd ../Backend
npm install
cd ../api
cp .env.example .env
```

Edita `.env` con tus credenciales reales de MySQL. Luego:

```bash
npm start
```

Si todo está bien, deberías ver:

```
SECSS API en puerto 4000
```

## Si acabas de hacer `git pull` y te aparece `Cannot find package '...'`

`node_modules/` no está versionado (a propósito — nunca debe subirse a git). Eso significa que **cada vez que clonas el repo por primera vez, o cambias de rama, tienes que correr `npm install` en `api/` y `Backend/`** para regenerarlo. No es un error del código, es un paso de instalación que falta.

## Variables de entorno

Ver `.env.example` para la lista completa. Ninguna variable tiene un valor por defecto sensible hardcodeado en el código — todas se leen desde `.env`.

La referencia de endpoints, roles, autenticación y uso con Postman está en
[`API.md`](./API.md).

## Inicio de sesión

`POST /api/auth/storeAuthLogin` recibe `numero_documento` y `password`. La API nunca recibe ni expone `password_hash`: ese valor bcrypt se conserva únicamente en la tabla `cuenta`.

## Estructura

```
api/
├── routes/         # Adaptadores HTTP y definición de endpoints
├── app.js          # Aplicación Express exportable, sin abrir puerto
├── server.js       # Arranque HTTP para desarrollo/producción
├── index.js        # Compatibilidad con el punto de entrada anterior
└── package.json    # Dependencias del proceso API

Backend/
├── controller/     # Acciones de negocio y consultas SQL
├── services/       # Servicios reutilizables
├── middleware/     # Autenticación y carga de archivos
├── db.js           # Pool de conexión MySQL
├── lib.js          # Validadores y utilidades de dominio
├── migrations/     # Cambios de esquema
└── storage/        # Archivos cargados
```

## API independiente

La API es la capa compartida por el frontend web y futuras aplicaciones móviles.
El frontend no se ejecuta ni se importa desde este proyecto. Las rutas de `api/`
delegan sus acciones a los controladores de `Backend/`, responsables de la lógica
y las instrucciones SQL.

- API base local: `http://localhost:4000/api`
- Salud pública: `GET /api/core/health`
- Autenticación: `Authorization: Bearer <JWT>`
- Archivos públicos: `http://localhost:4000/storage/<ruta>`

Para ejecutar la aplicación Express desde otro proceso de Node, se puede importar
`app.js` sin iniciar un listener:

```js
import app from './app.js';
app.listen(4000);
```

Configura `CORS_ORIGIN` con una lista separada por comas para los clientes web.
Las aplicaciones móviles nativas normalmente no requieren CORS, pero deben usar
la URL accesible del servidor, no `localhost` del dispositivo.
