// Debe ser el primer import: en ES Modules las dependencias se ejecutan
// antes que el cuerpo de este archivo, así que si dotenv.config() se llama
// más abajo, db.js ya habría leído process.env vacío. Este import con efecto
// secundario carga el .env antes de que cualquier otro módulo lo necesite.
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Rutas
import input_output from './routes/input_output/input_output.routes.js';
import quota from './routes/quota/quota.routes.js';
import vehicle from './routes/vehicle/vehicle.routes.js';
import pqrs from './routes/pqrs/pqrs.routes.js';
import auth from './routes/auth/auth.routes.js';
import user  from './routes/user/user.routes.js';
import dashboard from './routes/dashboard/dashboard.routes.js';
import core from './routes/core/core.routes.js';

// Configuración equivalente a __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Declaración de Rutas de la API
app.use('/api/input_output', input_output);
app.use('/api/quota', quota);
app.use('/api/vehicle', vehicle);
app.use('/api/pqrs', pqrs);
app.use('/api/auth', auth);
app.use('/api/user', user);
app.use('/api/dashboard', dashboard);
app.use('/api/core', core);

// Manejador para rutas de la API 
app.use('/api', (req, res) => {
    res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

// Inicio del servidor
const PORT = process.env.PORT || 4000;
// Nota: 3306 (el valor anterior) es el puerto por defecto de MySQL — usarlo
// aquí también generaba riesgo de choque con el propio motor de base de datos.
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});