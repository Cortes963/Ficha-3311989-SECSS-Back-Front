/**
 * Backend module: routes/core.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import { Router } from 'express';
import db from '../db.js';
const router = Router();
router.get('/health', async (_req,res,next) => { try { await db.query('SELECT 1'); res.json({ ok:true, estado:'operational' }); } catch (e) { next(e); } });
router.get('/centros', async (_req,res,next) => { try { const [data] = await db.query('SELECT id, nombre_centro FROM centro ORDER BY nombre_centro ASC'); res.json({ ok:true, datos:data }); } catch (e) { next(e); } });


export default router;

