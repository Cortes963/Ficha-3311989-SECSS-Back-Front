const express = require('express');
const router = express.Router();
const { obtenerCupos, asignarCupo } = require('../controller/quotacontroller');

router.get('/', obtenerCupos);
router.post('/', asignarCupo);

module.exports = router;