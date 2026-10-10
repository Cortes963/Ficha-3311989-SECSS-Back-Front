import jwt from 'jsonwebtoken';

// Token real firmado con el JWT_SECRET de pruebas (para ejercitar requireAuth de verdad).
export const tokenFor = (roles = [], id = 7, options = {}) => jwt.sign({ id, roles }, process.env.JWT_SECRET, options);
export const bearer = (roles, id, options) => `Bearer ${tokenFor(roles, id, options)}`;
