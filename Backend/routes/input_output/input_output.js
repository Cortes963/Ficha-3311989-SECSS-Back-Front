import express from 'express';
import { obtenerRegistros, crearRegistro } from '../../controller/input_output/input_outputcontroller.js';

const router = express.Router();

router.get('/', obtenerRegistros);
router.post('/', crearRegistro);

export default router;

