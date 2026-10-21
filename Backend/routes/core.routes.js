/**
 * Backend module: routes/core.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import { Router } from 'express';
import db from '../db.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { error, ROLES, integer } from '../lib.js';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    return res.json({ ok: true, estado: 'operational' });
  } catch (e) {
    return error(res, e);
  }
});

router.get('/centros', requireAuth, allowRoles(ROLES.ADMIN), async (_req, res) => {
  try {
    const [data] = await db.query('SELECT id, nombre_centro, estado FROM centro ORDER BY nombre_centro ASC');
    return res.json({ ok: true, datos: data });
  } catch (e) {
    return error(res, e);
  }
});

router.get('/centros-publicos', async (_req, res) => {
  try {
    const [data] = await db.query('SELECT id, nombre_centro FROM centro WHERE estado=1 ORDER BY nombre_centro ASC');
    return res.json({ ok: true, datos: data });
  } catch (e) {
    return error(res, e);
  }
});

router.post('/centros', requireAuth, allowRoles(ROLES.ADMIN), async (req, res) => {
  try {
    const nombre_centro = String(req.body?.nombre_centro ?? '').trim();
    if (!nombre_centro) {
      return res.status(400).json({ ok: false, mensaje: 'Falta el campo obligatorio: nombre_centro.' });
    }
    const [result] = await db.query('INSERT INTO centro (nombre_centro, estado) VALUES (?, 1)', [nombre_centro]);
    return res.status(201).json({ ok: true, mensaje: 'Centro registrado.', datos: { id: result.insertId, nombre_centro } });
  } catch (e) {
    return error(res, e);
  }
});

router.patch('/centros/:id', requireAuth, allowRoles(ROLES.ADMIN), async (req, res) => {
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
    return error(res, e);
  }
});

router.patch('/centros/:id/estado', requireAuth, allowRoles(ROLES.ADMIN), async (req, res) => {
  try {
    const id = integer(req.params.id, 'id');
    const rawState = req.body?.estado;
    if (![0, 1, '0', '1'].includes(rawState)) {
      return res.status(400).json({ ok: false, mensaje: 'estado debe ser 0 o 1.' });
    }

    const estado = Number(rawState);
    const [result] = await db.query('UPDATE centro SET estado = ? WHERE id = ?', [estado, id]);
    if (!result.affectedRows) {
      const [centers] = await db.query('SELECT id FROM centro WHERE id = ?', [id]);
      if (!centers.length) return res.status(404).json({ ok: false, mensaje: 'Centro no encontrado.' });
    }

    return res.json({ ok: true, mensaje: estado ? 'Centro activado.' : 'Centro desactivado.' });
  } catch (e) {
    return error(res, e);
  }
});

export default router;
