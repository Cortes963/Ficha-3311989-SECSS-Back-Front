import multer from 'multer';
import os from 'node:os';
import path from 'node:path';

const allowed = new Map([
  ['image/jpeg', new Set(['.jpg', '.jpeg'])],
  ['image/png', new Set(['.png'])],
  ['image/webp', new Set(['.webp'])]
]);

const uploadFactory = () => multer({
  dest: os.tmpdir(),
  limits: { files: 10, fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extensions = allowed.get(file.mimetype);
    const extension = path.extname(file.originalname).toLowerCase();
    if (!extensions || !extensions.has(extension)) {
      return callback(new Error('Solo se permiten imágenes JPG, PNG o WEBP.'));
    }
    return callback(null, true);
  }
});

const upload = uploadFactory().fields([
  { name: 'imagen_url_vehiculo', maxCount: 1 },
  { name: 'imagen_url_identificacion_vehiculo', maxCount: 1 },
  { name: 'imagen_url_tarjeta_propiedad', maxCount: 1 },
  { name: 'imagen_url_soat', maxCount: 1 },
  { name: 'imagen_url_tecnomecanica_vigente', maxCount: 1 },
  { name: 'imagen_url_aprendiz', maxCount: 1 },
  { name: 'imagen_url_identificacion', maxCount: 1 },
  { name: 'imagen_url_carnet_sena', maxCount: 1 }
]);

export const uploadGuestEvidence = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, mensaje: err.message });
    return next();
  });
};

export const uploadVehicleEvidence = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, mensaje: err.message });
    return next();
  });
};

export const uploadAcademicEvidence = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, mensaje: err.message });
    return next();
  });
};
