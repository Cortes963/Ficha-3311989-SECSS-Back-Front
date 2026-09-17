import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import auth from './routes/auth.routes.js';
import attention from './routes/attention.routes.js';
import core from './routes/core.routes.js';
import inputOutput from './routes/input_output.routes.js';
import quotas from './routes/quota.routes.js';
import users from './routes/user.routes.js';
import vehicles from './routes/vehicle.routes.js';
import { requireAuth } from '../Backend/middleware/auth.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET debe configurarse y tener al menos 32 caracteres.');
}

const app = express();
const origins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: origins.length ? origins : false }));
app.use(express.json({ limit: '1mb' }));
const apiDirectory = path.dirname(fileURLToPath(import.meta.url));
const storagePath = process.env.LOCAL_STORAGE_PATH
  ? path.resolve(process.env.LOCAL_STORAGE_PATH)
  : path.resolve(apiDirectory, '../Backend/storage');

app.use('/storage', express.static(storagePath));

app.use('/api/core', core);
app.use('/api/auth', auth);

app.use('/api', requireAuth);
app.use('/api/users', users);
app.use('/api/vehicle', vehicles);
app.use('/api/quota', quotas);
app.use('/api/input_output', inputOutput);
app.use('/api', attention);

app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada.' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok: false, mensaje: 'Error interno del servidor.' });
});

export default app;
