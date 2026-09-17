# Mobile API SECSS

`api/` es el proceso independiente para aplicaciones móviles. Tiene sus
propias rutas, controladores, servicios, middleware, dependencias y conexión
MySQL. No importa archivos desde `Backend/`.

## Inicio

```powershell
cd api
npm install
Copy-Item .env.example .env
npm run dev
```

Por defecto escucha en `http://localhost:4100`.

La API móvil usa rutas versionadas:

```text
http://localhost:4100/api/mobile/v1
```

La aplicación web usa `Backend/` y puede detenerse sin detener este proceso.
Ambos procesos consultan la misma base de datos, por lo que una caída de
MySQL sí afecta a los dos.

Consulta `API.md` para el catálogo general de endpoints. La colección Postman
para móvil debe usar `baseUrl=http://localhost:4100` y anteponer
`/api/mobile/v1` a sus rutas.
