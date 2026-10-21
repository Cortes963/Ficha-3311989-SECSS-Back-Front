import jwt from 'jsonwebtoken';
import db from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { mockReq, mockRes } from './helpers/http.js';

jest.mock('../db.js', () => ({ __esModule: true, default: { query: jest.fn() } }));

const SECRET = 'x'.repeat(32);
beforeAll(() => { process.env.JWT_SECRET = SECRET; });
beforeEach(() => db.query.mockReset());

const sessionDb = ({ account = [{ usuario_estado: 1, cuenta_estado: 1 }], roles = [{ nombre_rol: 'APRENDIZ' }] } = {}) => {
  db.query.mockResolvedValueOnce([account]).mockResolvedValueOnce([roles]);
};
const requestWith = (roles = ['APRENDIZ']) => {
  const token = jwt.sign({ id: 1, roles }, SECRET);
  return mockReq({ headers: { authorization: `Bearer ${token}` } });
};

describe('requireAuth', () => {
  test.each([
    ['sin header', undefined],
    ['esquema distinto de Bearer', 'Basic abc'],
    ['Bearer sin token', 'Bearer'],
  ])('401 %s', async (_n, header) => {
    const req = mockReq({ headers: { authorization: header } });
    const res = mockRes(); const next = jest.fn();
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });

  test('token válido y estado de cuenta/rol activo: hidrata roles vigentes', async () => {
    sessionDb({ roles: [{ nombre_rol: 'APRENDIZ' }, { nombre_rol: 'CELADOR' }] });
    const req = requestWith(['APRENDIZ', 'CELADOR']);
    const res = mockRes(); const next = jest.fn();
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ id: 1, roles: ['APRENDIZ', 'CELADOR'] });
  });

  test('cuenta o usuario desactivado después del login → 403', async () => {
    db.query.mockResolvedValueOnce([[{ usuario_estado: 0, cuenta_estado: 1 }]]);
    const res = mockRes(); const next = jest.fn();
    await requireAuth(requestWith(), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('rol desactivado después del login → 403 y no autoriza con JWT obsoleto', async () => {
    sessionDb({ roles: [] });
    const res = mockRes(); const next = jest.fn();
    await requireAuth(requestWith(), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('JWT con esquema distinto de Bearer → 401', async () => {
    const token = jwt.sign({ id: 1, roles: ['ADMINISTRADOR'] }, SECRET);
    const res = mockRes(); const next = jest.fn();
    await requireAuth(mockReq({ headers: { authorization: `Basic ${token}` } }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('token firmado con otro secreto → 401', async () => {
    const token = jwt.sign({ id: 1 }, 'otro-secreto-distinto-de-32-caracteres!!');
    const res = mockRes(); const next = jest.fn();
    await requireAuth(mockReq({ headers: { authorization: `Bearer ${token}` } }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('token expirado → 401', async () => {
    const token = jwt.sign({ id: 1 }, SECRET, { expiresIn: -10 });
    const res = mockRes();
    await requireAuth(mockReq({ headers: { authorization: `Bearer ${token}` } }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('allowRoles', () => {
  const guard = allowRoles('ADMINISTRADOR', 'CELADOR');
  test('permite si el usuario tiene al menos un rol autorizado', () => {
    const next = jest.fn();
    guard(mockReq({ user: { roles: ['APRENDIZ', 'CELADOR'] } }), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });
  test('403 si ningún rol coincide', () => {
    const res = mockRes(); const next = jest.fn();
    guard(mockReq({ user: { roles: ['APRENDIZ'] } }), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
  test('403 si req.user no existe o no tiene roles', () => {
    const res = mockRes();
    guard({ user: undefined }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    const res2 = mockRes();
    guard({ user: {} }, res2, jest.fn());
    expect(res2.status).toHaveBeenCalledWith(403);
  });
});
