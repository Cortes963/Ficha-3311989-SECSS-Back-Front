# Backend de datos — SECSS

Esta carpeta contiene la lógica de negocio y persistencia de SECSS. No abre un
puerto HTTP por sí sola: la capa `api/` expone las rutas y delega en estos
controladores.

Instala sus dependencias desde esta carpeta cuando se configure el proyecto:

```bash
cd Backend
npm install
```

Las variables de entorno y el proceso HTTP se configuran desde `api/`; el
Backend consume esas variables cuando sus controladores son invocados.

```text
Backend/
├── controller/   # Acciones invocadas por las rutas HTTP
├── services/     # Operaciones reutilizables
├── middleware/   # JWT, roles y carga de archivos
├── db.js         # Pool MySQL
├── lib.js        # Validación y utilidades
├── migrations/   # Cambios de base de datos
└── storage/      # Archivos persistidos
```

Las variables de entorno se cargan al iniciar `api/server.js`. Las conexiones
MySQL son utilizadas por los controladores de esta carpeta.
