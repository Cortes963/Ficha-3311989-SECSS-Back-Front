/**
 * Backend module: routes/vehicle.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import { Router } from 'express';

import {
  destroyVehicle,
  indexVehicle,
  storeVehicle,
  updateVehicle
} from '../controller/vehicle.controller.js';
import { allowRoles } from '../middleware/auth.js';
import { ROLES } from '../lib.js';

const router = Router();

// Owners can view their vehicles, submit a new one, update it, or inactivate it.
router.get('/me', allowRoles(ROLES.APRENDIZ, ROLES.INVITADO), indexVehicle);
router.post('/', allowRoles(ROLES.APRENDIZ, ROLES.INVITADO), storeVehicle);
router.patch('/:id', allowRoles(ROLES.APRENDIZ, ROLES.INVITADO), updateVehicle);
router.patch('/:id/inactivar', allowRoles(ROLES.APRENDIZ, ROLES.INVITADO), destroyVehicle);

export default router;

