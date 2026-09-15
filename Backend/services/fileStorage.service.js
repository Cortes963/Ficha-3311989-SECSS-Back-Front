import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(process.env.LOCAL_STORAGE_PATH || 'storage');

export async function saveUploadedFile(file, userId) {
  if (!file) return null;
  const directory = path.join(root, String(userId));
  await fs.mkdir(directory, { recursive: true });
  const extension = path.extname(file.originalname).toLowerCase();
  const filename = `${crypto.randomUUID()}${extension}`;
  const destination = path.join(directory, filename);
  await fs.rename(file.path, destination);
  return {
    nombre_original: file.originalname,
    nombre_almacenado: filename,
    mime_type: file.mimetype,
    tamano: file.size,
    ruta: path.relative(root, destination).replaceAll(path.sep, '/')
  };
}
