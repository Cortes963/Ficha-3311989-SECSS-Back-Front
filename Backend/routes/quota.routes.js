/**
 * Backend module: routes/quota.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import {Router} from 'express';import {allowRoles} from '../middleware/auth.js';import {ROLES} from '../lib.js';import {indexQuota,updateQuotaState} from '../controller/quota.controller.js';const r=Router();r.get('/',allowRoles(ROLES.ADMIN),indexQuota);r.patch('/:idUsuario/:idVehiculo',allowRoles(ROLES.ADMIN),updateQuotaState);export default r;

