import express from 'express';
import {
  crearPqrs,
  listarPqrs,
  obtenerPqrsPorId,
  obtenerRespuestaDePqrs,
  responderPqrs,
  actualizarEstado,
  actualizarPqrs,
  eliminarPqrs
} from '../../controller/pqrs/pqrs.controller.js';

const router = express.Router();

router.post('/', crearPqrs);
router.get('/', listarPqrs);
router.get('/:id', obtenerPqrsPorId);
router.put('/:id', actualizarPqrs);
router.delete('/:id', eliminarPqrs);
router.patch('/:id/estado', actualizarEstado);
router.get('/:id/respuesta', obtenerRespuestaDePqrs);
router.post('/:id/respuesta', responderPqrs);



export default router;
