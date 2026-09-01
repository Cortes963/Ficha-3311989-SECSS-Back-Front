import express from 'express';
import { crearRegistroVehiculo } from '../../controller/vehicle/vehicle.js';

const router = express.Router();

// TODO: falta un endpoint de listado (GET /) — hoy no existe una función
// "listarVehiculos" en el controller. Lo dejamos pendiente en vez de inventar
// un handler falso.
router.post('/', crearRegistroVehiculo);

export default router;