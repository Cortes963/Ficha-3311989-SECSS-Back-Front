const express = require('express');
const cors = require('cors');
require('dotenv').config();

const input_output = require('./routes/input_output/input_output.js');
const quota = require('./routes/quota/quota.js');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Declaración de Rutas de la API    
app.use('/api/register', input_output);
app.use('/api/quota', quota);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});