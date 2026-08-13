import express from 'express';
import db from '../../db.js';
import { crearDetalleMoto,  } from '../../controller/vehicle/motorcycle.js';
import { crearDetalleBicicleta } from '../../controller/vehicle/bicycle.js';
import { crearRegistroVehiculo } from '../../controller/vehicle/vehicle.js';

router.get('/', crearDetalleBicicleta);
router.post('/', crearDetalleMoto);
router.post('/registro', crearRegistroVehiculo);

module.exports = router;