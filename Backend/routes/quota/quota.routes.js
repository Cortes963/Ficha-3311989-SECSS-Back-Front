import express from 'express';
import {
  obtenerCupos,
  obtenerCupoPorUsuario,
  asignarCupo,
  actualizarEstadoCupo
} from '../../controller/quota/quota.controller.js';

const router = express.Router();

router.get('/', obtenerCupos);
router.get('/usuario/:id', obtenerCupoPorUsuario);
router.post('/', asignarCupo);
router.patch('/:idUsuario/:idVehiculo', actualizarEstadoCupo);

export default router;
