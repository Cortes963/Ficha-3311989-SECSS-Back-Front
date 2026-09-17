/**
 * Backend module: routes/auth.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import { Router } from 'express';
import { storeAuthLogin, storeAuthRegister, requestPasswordReset, resetPassword } from '../../Backend/controller/auth.controller.js';
import { uploadAcademicEvidence } from '../../Backend/middleware/upload.js';
const router = Router();
router.post('/storeAuthLogin', storeAuthLogin);
router.post('/storeAuthRegister', uploadAcademicEvidence, storeAuthRegister);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
export default router;
