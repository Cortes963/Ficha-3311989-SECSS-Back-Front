import { Router } from 'express';
import { getDashboardSummary } from '../../controller/dashboard/dashboard.controller.js';

const router = Router();

router.get('/summary', getDashboardSummary);

export default router;