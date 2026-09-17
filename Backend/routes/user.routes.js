/**
 * Backend module: routes/user.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import { Router } from 'express';
import { allowRoles } from '../middleware/auth.js';
import { ROLES } from '../lib.js';
import {
  indexUser,
  indexEligibleUsers,
  showUserId,
  updateUser,
  updateUserState,
  storeSecurityChiefGuard,
  storeCelador,
  storeJefe,
  updateMyPassword,
  showAcademicDetail,
  updateAcademicDetail
} from '../controller/user.controller.js';
import { uploadAcademicEvidence } from '../middleware/upload.js';

const r = Router();

r.get('/me', (req, _res, next) => { req.params.id = req.user.id; next(); }, showUserId);
r.get('/me/aprendiz', allowRoles(ROLES.APRENDIZ, ROLES.ADMIN, ROLES.JEFE, ROLES.CELADOR), (req, _res, next) => { req.params.id = req.user.id; next(); }, showAcademicDetail);
r.patch('/me/aprendiz', allowRoles(ROLES.APRENDIZ, ROLES.ADMIN, ROLES.JEFE, ROLES.CELADOR), uploadAcademicEvidence, (req, _res, next) => { req.params.id = req.user.id; next(); }, updateAcademicDetail);
r.patch('/me', allowRoles(ROLES.APRENDIZ, ROLES.CELADOR, ROLES.JEFE, ROLES.ADMIN), updateUser);
r.patch('/me/estado', allowRoles(ROLES.APRENDIZ, ROLES.INVITADO, ROLES.CELADOR, ROLES.JEFE, ROLES.ADMIN), (req, _res, next) => { req.params.id = req.user.id; next(); }, updateUserState);
r.patch('/me/password', allowRoles(ROLES.APRENDIZ, ROLES.INVITADO, ROLES.CELADOR, ROLES.JEFE, ROLES.ADMIN), updateMyPassword);
r.get('/elegibles', allowRoles(ROLES.ADMIN, ROLES.JEFE), indexEligibleUsers);
r.get('/', allowRoles(ROLES.ADMIN, ROLES.JEFE, ROLES.CELADOR), indexUser);
r.get('/:id/aprendiz', allowRoles(ROLES.ADMIN, ROLES.JEFE, ROLES.CELADOR), showAcademicDetail);
r.patch('/:id/aprendiz', allowRoles(ROLES.ADMIN, ROLES.JEFE, ROLES.CELADOR), uploadAcademicEvidence, updateAcademicDetail);
r.get('/:id', allowRoles(ROLES.ADMIN, ROLES.JEFE, ROLES.CELADOR), showUserId);
r.patch('/:id/estado', allowRoles(ROLES.ADMIN, ROLES.JEFE), updateUserState);
r.post('/celador', allowRoles(ROLES.JEFE), storeCelador);
r.post('/jefe', allowRoles(ROLES.ADMIN), storeJefe);
r.post('/asignar-celador', allowRoles(ROLES.ADMIN, ROLES.JEFE), storeSecurityChiefGuard);

export default r;
