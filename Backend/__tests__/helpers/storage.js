import fs from 'node:fs';
import path from 'node:path';

// Lista (recursivamente) los archivos que el servicio de almacenamiento dejó en la carpeta temporal de pruebas.
export function storedFiles() {
  const root = process.env.LOCAL_STORAGE_PATH;
  const out = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p) : out.push(path.relative(root, p).replaceAll(path.sep, '/'));
  });
  if (fs.existsSync(root)) walk(root);
  return out;
}
export const clearStorage = () => fs.rmSync(process.env.LOCAL_STORAGE_PATH, { recursive: true, force: true, maxRetries: 2 }) || fs.mkdirSync(process.env.LOCAL_STORAGE_PATH, { recursive: true });
