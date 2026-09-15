/**
 * Backend module: routes/quota.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import { Router } from 'express';
import { allowRoles } from '../middleware/auth.js';
import { ROLES } from '../lib.js';
import { indexQuota, showQuotaByUser, showMyQuota, showQuotaDetail, updateQuotaState } from '../controller/quota.controller.js';
const r = Router();
r.get('/', allowRoles(ROLES.ADMIN, ROLES.JEFE, ROLES.CELADOR, ROLES.APRENDIZ, ROLES.INVITADO), indexQuota);
r.get('/me', allowRoles(ROLES.ADMIN, ROLES.JEFE, ROLES.CELADOR, ROLES.APRENDIZ, ROLES.INVITADO), showMyQuota);
r.get('/usuario/:idUsuario', showQuotaByUser);
r.get('/detalle/:idUsuario/:idVehiculo', showQuotaDetail);
r.patch('/:idUsuario/:idVehiculo', allowRoles(ROLES.ADMIN), updateQuotaState);
export default r;
