import jwt from 'jsonwebtoken';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { mockReq, mockRes } from './helpers/http.js';

const SECRET = 'x'.repeat(32);
beforeAll(() => { process.env.JWT_SECRET = SECRET; });

describe('requireAuth', () => {
  let spy;
  beforeEach(() => { spy = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => spy.mockRestore());

  test.each([
    ['sin header', undefined],
    ['esquema distinto de Bearer', 'Basic abc'],
    ['Bearer sin token', 'Bearer'],
  ])('401 %s', (_n, header) => {
    const req = mockReq({ headers: { authorization: header } });
    const res = mockRes(); const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('un JWT VÁLIDO enviado con esquema "Basic" también se rechaza (solo se acepta Bearer)', () => {
    const token = jwt.sign({ id: 1, roles: ['ADMINISTRADOR'] }, SECRET);
    const res = mockRes(); const next = jest.fn();
    requireAuth(mockReq({ headers: { authorization: `Basic ${token}` } }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('token válido: llena req.user y llama next()', () => {
    const token = jwt.sign({ id: 1, roles: ['APRENDIZ'] }, SECRET);
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes(); const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ id: 1, roles: ['APRENDIZ'] });
  });

  test('token firmado con otro secreto → 401', () => {
    const token = jwt.sign({ id: 1 }, 'otro-secreto-distinto-de-32-caracteres!!');
    const res = mockRes(); const next = jest.fn();
    requireAuth(mockReq({ headers: { authorization: `Bearer ${token}` } }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('token expirado → 401', () => {
    const token = jwt.sign({ id: 1 }, SECRET, { expiresIn: -10 });
    const res = mockRes();
    requireAuth(mockReq({ headers: { authorization: `Bearer ${token}` } }), res, jest.fn());
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
  test('403 si req.user no existe o no tiene roles (optional chaining)', () => {
    const res = mockRes();
    guard({ user: undefined }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    const res2 = mockRes();
    guard({ user: {} }, res2, jest.fn());
    expect(res2.status).toHaveBeenCalledWith(403);
  });
});
