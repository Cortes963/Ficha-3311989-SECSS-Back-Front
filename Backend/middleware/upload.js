import multer from 'multer';
import os from 'node:os';

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const uploadGuestEvidence = multer({
  dest: os.tmpdir(),
  limits: { files: 3, fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, allowed.has(file.mimetype));
  }
}).fields([
  { name: 'imagen_url_vehiculo', maxCount: 1 },
  { name: 'imagen_url_identificacion_vehiculo', maxCount: 1 },
  { name: 'imagen_url_tarjeta_propiedad', maxCount: 1 }
]);
