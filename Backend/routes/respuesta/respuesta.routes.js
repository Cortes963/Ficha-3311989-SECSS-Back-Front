import express from 'express';
import { listarRespuestas } from '../../controller/respuesta/respuestaList.js';
import { obtenerRespuestaPorId } from '../../controller/respuesta/respuestaSearchList.js';
import { actualizarRespuesta } from '../../controller/respuesta/respuestaUpdate.js';
import { eliminarRespuesta } from '../../controller/respuesta/respuestaDelete.js';

const router = express.Router();

router.get('/', listarRespuestas);
router.get('/:id', obtenerRespuestaPorId);
router.put('/:id', actualizarRespuesta);
router.delete('/:id', eliminarRespuesta);

export default router;
