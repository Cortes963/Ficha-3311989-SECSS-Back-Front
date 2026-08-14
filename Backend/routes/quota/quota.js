import express from 'express';
import { obtenerCupos, asignarCupo } from '../../controller/quota/quotacontroller.js';

const router = express.Router();

router.get('/', obtenerCupos);
router.post('/', asignarCupo);

export default router;

