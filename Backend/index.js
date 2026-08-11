import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Rutas
import input_output from './routes/input_output/input_output.js';
import quota from './routes/quota/quota.js';
import vehicle from './routes/vehicle/vehicle.js';
import pqrsRoutes from './routes/pqrs/pqrsRoutes.js'; // Ajusta la ruta si es necesario

// Configuración de variables de entorno
dotenv.config();

// Configuración equivalente a __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Declaración de Rutas de la API
app.use('/api/register', input_output);
app.use('/api/quota', quota);
app.use('/api/vehiculo', vehicle);
app.use('/api/pqrs', pqrsRoutes);

// Manejador para rutas de la API que no existen
app.use('/api', (req, res) => {
    res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

// Inicio del servidor
const PORT = process.env.PORT || 3306;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});