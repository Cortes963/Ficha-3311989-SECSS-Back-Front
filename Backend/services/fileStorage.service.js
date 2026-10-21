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
  // Multer writes to os.tmpdir(), which can be on a different volume from
  // LOCAL_STORAGE_PATH on Windows. rename then fails with EPERM/EXDEV there.
  try {
    await fs.copyFile(file.path, destination);
    await fs.rm(file.path, { force: true });
  } catch (err) {
    await fs.rm(destination, { force: true });
    throw err;
  }
  return {
    nombre_original: file.originalname,
    nombre_almacenado: filename,
    mime_type: file.mimetype,
    tamano: file.size,
    ruta: path.relative(root, destination).replaceAll(path.sep, '/')
  };
}

export async function removeUploadedFile(relativePath) {
  if (!relativePath) return;
  await fs.rm(path.join(root, relativePath), { force: true });
}
