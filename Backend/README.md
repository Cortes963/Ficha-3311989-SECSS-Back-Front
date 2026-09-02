# Backend — SECSS

API en Node.js (Express 5) + MySQL para el sistema de control vehicular SECSS.

## Requisitos

- Node.js 18 o superior
- MySQL corriendo (local o remoto) con la base de datos ya creada

## Cómo levantar el proyecto

```bash
cd Backend
npm install
cp .env.example .env
```

Edita `.env` con tus credenciales reales de MySQL. Luego:

```bash
npm start
```

Si todo está bien, deberías ver:

```
Servidor ejecutándose en http://localhost:4000
```

## Si acabas de hacer `git pull` y te aparece `Cannot find package '...'`

`node_modules/` no está versionado (a propósito — nunca debe subirse a git). Eso significa que **cada vez que clonas el repo por primera vez, o cambias de rama, tienes que correr `npm install` de nuevo** para regenerarlo. No es un error del código, es un paso de instalación que falta.

## Variables de entorno

Ver `.env.example` para la lista completa. Ninguna variable tiene un valor por defecto sensible hardcodeado en el código — todas se leen desde `.env`.

## Estructura

```
Backend/
├── controller/     # Lógica de negocio por módulo
├── routes/         # Definición de endpoints Express, uno por módulo
├── db.js           # Pool de conexión a MySQL
└── index.js        # Punto de entrada del servidor
```
