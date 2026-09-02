import express from 'express';
import { obtenerRegistros, registrarEntrada, registrarSalida } from '../../controller/input_output/input_output.controller.js';

const router = express.Router();

router.get('/', obtenerRegistros);
router.post('/entrada', registrarEntrada);
router.patch('/salida/:id', registrarSalida);

export default router;
