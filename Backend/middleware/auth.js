/**
 * Backend module: middleware/auth.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ ok: false, mensaje: 'Token requerido.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (e) {
    console.error('JWT ERROR:', e.name, '-', e.message);
    return res.status(401).json({ ok: false, mensaje: 'Token inválido o expirado.' });
  }
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user?.roles?.some((role) => roles.includes(role))) {
    return res.status(403).json({ ok: false, mensaje: 'No tiene permisos para esta operación.' });
  }
  return next();
};

