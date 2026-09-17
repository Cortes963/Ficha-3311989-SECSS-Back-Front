import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import auth from './routes/auth.routes.js';
import attention from './routes/attention.routes.js';
import core from './routes/core.routes.js';
import inputOutput from './routes/input_output.routes.js';
import quotas from './routes/quota.routes.js';
import users from './routes/user.routes.js';
import vehicles from './routes/vehicle.routes.js';
import { requireAuth } from './middleware/auth.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET debe configurarse y tener al menos 32 caracteres.');
}

const app = express();
const origins = (process.env.MOBILE_CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const apiDirectory = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: origins.length ? origins : false }));
app.use(express.json({ limit: '1mb' }));
app.use('/storage', express.static(path.resolve(process.env.MOBILE_STORAGE_PATH || path.join(apiDirectory, 'storage'))));

const prefix = '/api/mobile/v1';
app.use(`${prefix}/core`, core);
app.use(`${prefix}/auth`, auth);
app.use(prefix, requireAuth);
app.use(`${prefix}/users`, users);
app.use(`${prefix}/vehicle`, vehicles);
app.use(`${prefix}/quota`, quotas);
app.use(`${prefix}/input_output`, inputOutput);
app.use(prefix, attention);
app.use(prefix, (_req, res) => res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada.' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok: false, mensaje: 'Error interno del servidor.' });
});

export default app;
