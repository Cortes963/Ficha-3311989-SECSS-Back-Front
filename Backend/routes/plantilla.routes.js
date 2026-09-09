// Backend/routes/<modulo>/nombre.routes.js
import express from 'express';
import { listar, obtenerPorId, crear, actualizar, inactivar } from '../../controller/<modulo>/nombre.controller.js';

const router = express.Router();

router.get('/', listar);
router.get('/:id', obtenerPorId);
router.post('/', crear);
router.patch('/:id', actualizar);
router.patch('/:id/inactivar', inactivar); // ruta separada para dejar explícito qué hace

export default router;