import express from 'express';
import {
  indexPqrs,
  storePqrs,
  showPqrsId,
  updatePqrs,
  destroyPqrs,
  obtenerRespuestaDePqrs,
  responderPqrs,
  actualizarEstado
} from '../../controller/pqrs/pqrs.controller.js';

const router = express.Router();

router.post('/', storePqrs);
router.get('/', indexPqrs);
router.get('/:id', showPqrsId);
router.put('/:id', updatePqrs);
router.delete('/:id', destroyPqrs);
router.patch('/:id/estado', actualizarEstado);
router.get('/:id/respuesta', obtenerRespuestaDePqrs);
router.post('/:id/respuesta', responderPqrs);

export default router;