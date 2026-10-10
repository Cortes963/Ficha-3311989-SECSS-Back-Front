// Se ejecuta ANTES de cada archivo de prueba (jest.config.cjs → setupFiles).
// Define el entorno que app.js y los servicios leen al importarse.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.JWT_SECRET = 'jwt-secret-solo-para-pruebas-0123456789';
// Carpeta temporal: las subidas de archivos de las pruebas NO ensucian Backend/storage.
process.env.LOCAL_STORAGE_PATH = fs.mkdtempSync(path.join(os.tmpdir(), 'secss-test-storage-'));
delete process.env.CORS_ORIGIN;
