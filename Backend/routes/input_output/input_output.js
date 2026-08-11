import express from 'express';
import router from express.Router();
import { obtenerRegistros, crearRegistro } from require('../controller/input_output/input_outputcontroller');

router.get('/', obtenerRegistros);
router.post('/', crearRegistro);

module.exports = router;

