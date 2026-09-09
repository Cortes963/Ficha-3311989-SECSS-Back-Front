/**
 * Backend module: routes/attention.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import { Router } from 'express';
import { allowRoles } from '../middleware/auth.js';
import { ROLES } from '../lib.js';
import {
  indexReport,
  storeReport,
  showReportId,
  indexPqrs,
  storePqrs,
  storePqrsAnswer,
  updatePqrsState,
  indexAnswer
} from '../controller/attention.controller.js';

const router = Router();

// Reports: guards create them; administrators and security chiefs review them.
router.get('/reportes', allowRoles(ROLES.ADMIN, ROLES.JEFE), indexReport);
router.post('/reportes', allowRoles(ROLES.CELADOR), storeReport);
router.get('/reportes/:id', allowRoles(ROLES.ADMIN, ROLES.JEFE), showReportId);

// PQRS: the owner submits it; only administrators can answer or change its state.
router.get('/pqrs', indexPqrs);
router.post('/pqrs', allowRoles(ROLES.APRENDIZ, ROLES.INVITADO), storePqrs);
router.post('/pqrs/:id/respuesta', allowRoles(ROLES.ADMIN), storePqrsAnswer);
router.patch('/pqrs/:id/estado', allowRoles(ROLES.ADMIN), updatePqrsState);

// Answers are readable only by administrators.
router.get('/respuestas', allowRoles(ROLES.ADMIN), indexAnswer);

export default router;

