/**
 * Backend module: index.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import auth from './routes/auth.routes.js';
import attention from './routes/attention.routes.js';
import core from './routes/core.routes.js';
import inputOutput from './routes/input_output.routes.js';
import quotas from './routes/quota.routes.js';
import users from './routes/user.routes.js';
import vehicles from './routes/vehicle.routes.js';
import { requireAuth } from './middleware/auth.js';

// A secret is mandatory because it signs and verifies every JWT.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET debe configurarse y tener al menos 32 caracteres.');
}

const app = express();

// Middleware shared by public and protected endpoints.
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || false }));
app.use(express.json({ limit: '1mb' }));

// These resources are public because users need them before owning a token.
app.use('/api/core', core);
app.use('/api/auth', auth);

// Every resource registered below this middleware requires Bearer <token>.
app.use('/api', requireAuth);
app.use('/api/users', users);
app.use('/api/vehicle', vehicles);
app.use('/api/quota', quotas);
app.use('/api/input_output', inputOutput);
app.use('/api', attention);

// Return a uniform error when no API route matches the request.
app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada.' });
});

// Avoid exposing internal errors such as SQL details to API consumers.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok: false, mensaje: 'Error interno del servidor.' });
});

const port = Number(process.env.PORT || 4000);

// Start the HTTP server after all routes have been configured.
app.listen(port, () => {
  console.log(`SECSS API en puerto ${port}`);
});

