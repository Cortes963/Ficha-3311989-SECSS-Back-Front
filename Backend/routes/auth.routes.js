/**
 * Backend module: routes/auth.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import { Router } from 'express';
import { storeAuthLogin, storeAuthRegister } from '../controller/auth.controller.js';
const router = Router();
router.post('/storeAuthLogin', storeAuthLogin);
router.post('/storeAuthRegister', storeAuthRegister);
export default router;

