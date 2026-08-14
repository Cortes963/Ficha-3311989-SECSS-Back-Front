import express from 'express';
import {
  crearPqrs,
  listarPqrs,
  obtenerPqrsPorId,
  responderPqrs,
  actualizarEstado
} from '../../controller/pqr/pqrscontroller.js';

const router = express.Router();

router.post('/', crearPqrs);
router.get('/', listarPqrs);
router.get('/:id', obtenerPqrsPorId);
router.post('/:id/respuesta', responderPqrs);
router.patch('/:id/estado', actualizarEstado);

export default router;
