/**
 * Backend module: middleware/auth.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import jwt from 'jsonwebtoken';
import db from '../db.js';

export async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  if (!match) return res.status(401).json({ ok: false, mensaje: 'Token requerido.' });
  const [, token] = match;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!Number.isInteger(Number(payload.id)) || Number(payload.id) < 1 || !Array.isArray(payload.roles)) {
      return res.status(401).json({ ok: false, mensaje: 'Token inválido o expirado.' });
    }
    const [accounts] = await db.query(
      'SELECT u.estado AS usuario_estado,c.estado AS cuenta_estado FROM usuario u JOIN cuenta c ON c.id_usuario=u.id WHERE u.id=?',
      [Number(payload.id)]
    );
    if (!accounts.length || !accounts[0].usuario_estado || !accounts[0].cuenta_estado) {
      return res.status(403).json({ ok: false, mensaje: 'Cuenta inactiva.' });
    }
    const [roleRows] = await db.query(
      'SELECT r.nombre_rol FROM usuario_rol ur JOIN rol r ON r.id=ur.id_rol WHERE ur.id_usuario=? AND ur.estado=1',
      [Number(payload.id)]
    );
    const activeRoles = roleRows.map(({ nombre_rol }) => nombre_rol);
    if (!activeRoles.length || payload.roles.some((role) => !activeRoles.includes(role))) {
      return res.status(403).json({ ok: false, mensaje: 'El usuario ya no tiene los roles activos del token.' });
    }
    req.user = { ...payload, id: Number(payload.id), roles: activeRoles.filter((role) => payload.roles.includes(role)) };
    return next();
  } catch (e) {
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError' || e.name === 'NotBeforeError') {
      return res.status(401).json({ ok: false, mensaje: 'Token inválido o expirado.' });
    }
    console.error(e);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor.' });
  }
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user?.roles?.some((role) => roles.includes(role))) {
    return res.status(403).json({ ok: false, mensaje: 'No tiene permisos para esta operación.' });
  }
  return next();
};
