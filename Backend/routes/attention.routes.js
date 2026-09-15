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
  updateReport,
  destroyReport,
  indexPqrs,
  showPqrsId,
  storePqrs,
  updatePqrs,
  destroyPqrs,
  storePqrsAnswer,
  showPqrsAnswer,
  updatePqrsState,
  indexAnswer,
  updateAnswer,
  destroyAnswer,
} from '../controller/attention.controller.js';

const router = Router();

// Reports: celadores create and manage their own reports; the chief only consults.
router.get('/reportes', allowRoles(ROLES.CELADOR, ROLES.JEFE), indexReport);
router.post('/reportes', allowRoles(ROLES.CELADOR), storeReport);
router.get('/reportes/:id', allowRoles(ROLES.CELADOR, ROLES.JEFE), showReportId);
router.put('/reportes/:id', allowRoles(ROLES.CELADOR), updateReport);

// PQRS: el propio dueño la radica/edita/retira (el controller valida dueño internamente);
// solo un administrador puede responderla, cambiar su estado, o tocar la respuesta.
router.get('/pqrs', indexPqrs);
router.get('/pqrs/:id', showPqrsId);
router.post('/pqrs', allowRoles(ROLES.JEFE, ROLES.CELADOR, ROLES.APRENDIZ, ROLES.INVITADO), storePqrs);
router.put('/pqrs/:id', updatePqrs);
router.delete('/pqrs/:id', destroyPqrs);
router.get('/pqrs/:id/respuesta', showPqrsAnswer);
router.post('/pqrs/:id/respuesta', allowRoles(ROLES.ADMIN), storePqrsAnswer);
router.patch('/pqrs/:id/estado', allowRoles(ROLES.ADMIN), updatePqrsState);

// Respuestas: de solo lectura/edición para administradores. updateAnswer y
// destroyAnswer no validan rol por dentro (a diferencia de showPqrsId/updatePqrs/
// destroyPqrs, que sí verifican dueño), así que el guard de aquí es la ÚNICA
// protección — no quitarlo sin agregar la validación dentro del controller.
router.get('/respuestas', allowRoles(ROLES.ADMIN), indexAnswer);
router.put('/respuestas/:id', allowRoles(ROLES.ADMIN), updateAnswer);
router.delete('/respuestas/:id', allowRoles(ROLES.ADMIN), destroyAnswer);

export default router;
