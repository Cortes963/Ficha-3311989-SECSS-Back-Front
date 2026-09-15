/**
 * Backend module: routes/input_output.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import { Router } from 'express';

import {
  indexInputOutput,
  indexMyInputOutput,
  showInputOutput,
  storeInputOutput,
  storeGuestInputOutput,
  updateInputOutputExit
} from '../controller/input_output.controller.js';

import { allowRoles } from '../middleware/auth.js';
import { ROLES } from '../lib.js';
import { uploadGuestEvidence } from '../middleware/upload.js';

const router = Router();

router.get(
  '/me',
  allowRoles(ROLES.INVITADO, ROLES.APRENDIZ),
  indexMyInputOutput
);

router.post(
  '/invitado',
  allowRoles(ROLES.CELADOR),
  uploadGuestEvidence,
  storeGuestInputOutput
);

router.get(
  '/',
  allowRoles(ROLES.ADMIN, ROLES.JEFE, ROLES.CELADOR),
  indexInputOutput
);

router.get(
  '/:id',
  allowRoles(ROLES.INVITADO, ROLES.APRENDIZ, ROLES.CELADOR, ROLES.JEFE),
  showInputOutput
);

router.post(
  '/entrada',
  allowRoles(ROLES.CELADOR),
  storeInputOutput
);

router.patch(
  '/salida/:id',
  allowRoles(ROLES.CELADOR),
  updateInputOutputExit
);

export default router;
