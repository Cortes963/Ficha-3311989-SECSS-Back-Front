/**
 * Backend module: lib.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

export const ROLES = Object.freeze({ ADMIN: 'ADMINISTRADOR', JEFE: 'JEFE_SEGURIDAD', CELADOR: 'CELADOR', APRENDIZ: 'APRENDIZ', INVITADO: 'INVITADO' });
export const PQRS = Object.freeze({ RADICADO: 1, EN_TRAMITE: 2, RESUELTO: 3, CERRADO: 4 });

export function integer(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw Object.assign(new Error(`${name} debe ser un entero positivo.`), { status: 400 });
  return parsed;
}
export function page(query) {
  const pagina = query.pagina === undefined ? 1 : integer(query.pagina, 'pagina');
  const limite = query.limite === undefined ? 20 : integer(query.limite, 'limite');
  if (limite > 100) throw Object.assign(new Error('limite no puede superar 100.'), { status: 400 });
  return { pagina, limite, offset: (pagina - 1) * limite };
}
export function required(body, fields) {
  for (const field of fields) if (body[field] === undefined || body[field] === null || body[field] === '') throw Object.assign(new Error(`Falta el campo obligatorio: ${field}.`), { status: 400 });
}
export function error(res, err) {
  if (err?.code === 'ER_DUP_ENTRY') return res.status(409).json({ ok: false, mensaje: 'El registro ya existe.' });
  if (err?.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ ok: false, mensaje: 'Una referencia indicada no existe.' });
  console.error(err);
  return res.status(err?.status || 500).json({ ok: false, mensaje: err?.status ? err.message : 'Error interno del servidor.' });
}
export const actorId = (req) => integer(req.user.id, 'usuario del token');

