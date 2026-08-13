import express from 'express';
import { obtenerRegistros, crearRegistro } from '../../controller/input_output/input_outputcontroller.js';

router.get('/', obtenerRegistros);
router.post('/', crearRegistro);

module.exports = router;

