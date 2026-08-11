import express from 'express';
import router from express.Router();
import { obtenerCupos, asignarCupo } from require('../controller/quotacontroller');

router.get('/', obtenerCupos);
router.post('/', asignarCupo);

module.exports = router;