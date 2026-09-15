/**
 * Backend module: routes/user.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import { Router } from 'express';
import { allowRoles } from '../middleware/auth.js';
import { ROLES } from '../lib.js';
import { indexUser, indexEligibleUsers, showUserId, updateUser, updateUserState, storeSecurityChiefGuard, storeCelador, storeJefe, updateMyPassword } from '../controller/user.controller.js';
const r = Router();
r.get('/me', (req, _res, next) => { req.params.id = req.user.id; next(); }, showUserId);
r.patch('/me', allowRoles(ROLES.APRENDIZ, ROLES.INVITADO, ROLES.CELADOR, ROLES.JEFE, ROLES.ADMIN), updateUser);
r.patch('/me/estado', allowRoles(ROLES.APRENDIZ, ROLES.INVITADO, ROLES.CELADOR, ROLES.JEFE, ROLES.ADMIN), (req, _res, next) => { req.params.id = req.user.id; next(); }, updateUserState);
r.patch('/me/password', allowRoles(ROLES.APRENDIZ, ROLES.INVITADO, ROLES.CELADOR, ROLES.JEFE, ROLES.ADMIN), updateMyPassword);
r.get('/elegibles', allowRoles(ROLES.ADMIN, ROLES.JEFE), indexEligibleUsers);
r.get('/', allowRoles(ROLES.ADMIN, ROLES.JEFE), indexUser);
r.get('/:id', allowRoles(ROLES.ADMIN, ROLES.JEFE), showUserId);
r.patch('/:id/estado', allowRoles(ROLES.ADMIN, ROLES.JEFE), updateUserState);
r.post('/celador', allowRoles(ROLES.JEFE), storeCelador);
r.post('/jefe', allowRoles(ROLES.ADMIN), storeJefe);
r.post('/asignar-celador', allowRoles(ROLES.ADMIN, ROLES.JEFE), storeSecurityChiefGuard);
export default r;
