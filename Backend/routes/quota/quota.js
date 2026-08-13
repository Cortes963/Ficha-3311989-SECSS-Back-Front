import express from 'express';
import { obtenerCupos, asignarCupo } from '../../controller/quota/quotacontroller.js';

router.get('/', obtenerCupos);
router.post('/', asignarCupo);

module.exports = router;

