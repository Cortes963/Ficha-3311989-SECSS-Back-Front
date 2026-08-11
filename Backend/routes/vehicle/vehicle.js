import express from 'express';
import router from express.Router();
import db from require('../../db.js');
import { crearDetalleMoto,  } from require('../controller/vehicle/motorcycle.js');
import { crearDetalleBicicleta } from require('../controller/vehicle/bicycle.js');
import { crearRegistroVehiculo } from require('../controller/vehicle/vehicle.js');

router.get('/', crearDetalleBicicleta);
router.post('/', crearDetalleMoto);
router.post('/registro', crearRegistroVehiculo);

module.exports = router;