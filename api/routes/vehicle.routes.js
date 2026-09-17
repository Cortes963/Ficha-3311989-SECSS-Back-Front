/**
 * Backend module: routes/vehicle.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import { Router } from 'express';

import {
  destroyVehicle,
  indexVehicle,
  showVehicle,
  storeVehicle,
  updateVehicle
} from '../../Backend/controller/vehicle.controller.js';
import { allowRoles } from '../../Backend/middleware/auth.js';
import { ROLES } from '../../Backend/lib.js';
import { uploadVehicleEvidence } from '../../Backend/middleware/upload.js';

const router = Router();

// Owners can view their vehicles, submit a new one, update it, or inactivate it.
router.get('/me', allowRoles(ROLES.APRENDIZ, ROLES.INVITADO), indexVehicle);
router.get('/:id', allowRoles(ROLES.APRENDIZ, ROLES.INVITADO), showVehicle);
router.post('/', allowRoles(ROLES.APRENDIZ), uploadVehicleEvidence, storeVehicle);
router.patch('/:id', allowRoles(ROLES.APRENDIZ, ROLES.INVITADO), uploadVehicleEvidence, updateVehicle);
router.patch('/:id/inactivar', allowRoles(ROLES.APRENDIZ, ROLES.INVITADO), destroyVehicle);

export default router;
