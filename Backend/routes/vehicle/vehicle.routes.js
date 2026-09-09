import express from 'express';
import { storeVehicle } from '../../controller/vehicle/vehicle.js';

const router = express.Router();

// TODO: falta un endpoint de listado (GET /) — hoy no existe una función
// "listarVehiculos" en el controller. Lo dejamos pendiente en vez de inventar
// un handler falso.
router.post('/', storeVehicle);

export default router;