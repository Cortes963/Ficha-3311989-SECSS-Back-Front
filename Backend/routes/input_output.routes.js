/**
 * Backend module: routes/input_output.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import { Router } from 'express';

import {
  indexInputOutput,
  storeInputOutput,
  updateInputOutputExit
} from '../controller/input_output.controller.js';

import { allowRoles } from '../middleware/auth.js';
import { ROLES } from '../lib.js';

const router = Router();

router.get(
  '/',
  allowRoles(ROLES.ADMIN, ROLES.JEFE, ROLES.CELADOR),
  indexInputOutput
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
