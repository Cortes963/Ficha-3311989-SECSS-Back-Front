/**
 * Backend module: routes/core.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import { Router } from 'express';
import db from '../db.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { ROLES, integer } from '../lib.js';

const router = Router();

router.get('/health', async (_req, res, next) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true, estado: 'operational' });
  } catch (e) {
    next(e);
  }
});

router.get('/centros', requireAuth, allowRoles(ROLES.ADMIN), async (_req, res, next) => {
  try {
    const [data] = await db.query('SELECT id, nombre_centro FROM centro ORDER BY nombre_centro ASC');
    res.json({ ok: true, datos: data });
  } catch (e) {
    next(e);
  }
});

router.get('/centros-publicos', async (_req, res, next) => {
  try {
    const [data] = await db.query('SELECT id, nombre_centro FROM centro ORDER BY nombre_centro ASC');
    return res.json({ ok: true, datos: data });
  } catch (e) {
    return next(e);
  }
});

router.post('/centros', requireAuth, allowRoles(ROLES.ADMIN), async (req, res, next) => {
  try {
    const nombre_centro = String(req.body?.nombre_centro ?? '').trim();
    if (!nombre_centro) {
      return res.status(400).json({ ok: false, mensaje: 'Falta el campo obligatorio: nombre_centro.' });
    }
    const [result] = await db.query('INSERT INTO centro (nombre_centro) VALUES (?)', [nombre_centro]);
    return res.status(201).json({ ok: true, mensaje: 'Centro registrado.', datos: { id: result.insertId, nombre_centro } });
  } catch (e) {
    next(e);
  }
});

router.patch('/centros/:id', requireAuth, allowRoles(ROLES.ADMIN), async (req, res, next) => {
  try {
    const id = integer(req.params.id, 'id');
    const nombre_centro = String(req.body?.nombre_centro ?? '').trim();
    if (!nombre_centro) {
      return res.status(400).json({ ok: false, mensaje: 'Falta el campo obligatorio: nombre_centro.' });
    }
    const [result] = await db.query('UPDATE centro SET nombre_centro = ? WHERE id = ?', [nombre_centro, id]);
    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, mensaje: 'Centro no encontrado.' });
    }
    return res.json({ ok: true, mensaje: 'Centro actualizado.', datos: { id, nombre_centro } });
  } catch (e) {
    next(e);
  }
});

export default router;

