/*/ app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const pqrsRoutes = require('./routes/pqrsRoutes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/pqrs', pqrsRoutes);

// Manejador simple para rutas de la API que no existen
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
  console.log(`Servidor escuchando en http://localhost:${PUERTO}`);
}); */
