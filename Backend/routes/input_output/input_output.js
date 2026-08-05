const express = require('express');
const router = express.Router();
const { obtenerRegistros, crearRegistro } = require('../controller/input_outputcontroller');

router.get('/', obtenerRegistros);
router.post('/', crearRegistro);

module.exports = router;

