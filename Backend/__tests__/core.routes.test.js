import request from 'supertest';
import app from '../app.js';
import db from '../db.js';
import { bearer } from './helpers/auth.js';
import { freshDb } from './helpers/db.js';
import { mockSql } from './helpers/sql.js';

// /core se prueba a través de la app REAL (app.js): así también se verifica el montaje, requireAuth real y el manejador de errores.
jest.mock('../db.js', () => ({ __esModule: true, default: { query: jest.fn(), getConnection: jest.fn() } }));

beforeEach(() => { freshDb(db); jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => console.error.mockRestore());

const ADMIN = bearer(['ADMINISTRADOR']);
const PREFIJOS = ['/api/core', '/api/web/v1/core'];

describe.each(PREFIJOS)('Rutas públicas de %s', (base) => {
  test('GET /health → 200 operational si la BD responde', async () => {
    db.query.mockResolvedValueOnce([[{ 1: 1 }]]);
    const res = await request(app).get(`${base}/health`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, estado: 'operational' });
  });
  test('GET /health con la BD caída → 500 genérico (pasa por el manejador de errores de app.js)', async () => {
    db.query.mockRejectedValueOnce(new Error('ECONNREFUSED secreto'));
    const res = await request(app).get(`${base}/health`);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ ok: false, mensaje: 'Error interno del servidor.' });
  });
  test('GET /centros-publicos NO requiere token (se usa en el registro)', async () => {
    db.query.mockResolvedValueOnce([[{ id: 1, nombre_centro: 'CTPI' }]]);
    const res = await request(app).get(`${base}/centros-publicos`);
    expect(res.status).toBe(200);
    expect(res.body.datos).toEqual([{ id: 1, nombre_centro: 'CTPI' }]);
  });
  test('GET /centros-publicos con la BD caída → 500', async () => {
    db.query.mockRejectedValueOnce(new Error('x'));
    expect((await request(app).get(`${base}/centros-publicos`)).status).toBe(500);
  });
});

describe('Rutas protegidas /centros (solo ADMINISTRADOR)', () => {
  const base = '/api/core/centros';

  test.each([['get', ''], ['post', ''], ['patch', '/1']])('%s %s sin token → 401', async (m, sufijo) => {
    const res = await request(app)[m](base + sufijo).send({ nombre_centro: 'x' });
    expect(res.status).toBe(401);
    expect(db.query).not.toHaveBeenCalled();
  });
  test.each([['get', ''], ['post', ''], ['patch', '/1']])('%s %s con rol distinto de ADMIN → 403', async (m, sufijo) => {
    for (const rol of ['JEFE_SEGURIDAD', 'CELADOR', 'APRENDIZ', 'INVITADO']) {
      const res = await request(app)[m](base + sufijo).set('Authorization', bearer([rol])).send({ nombre_centro: 'x' });
      expect(res.status).toBe(403);
    }
    expect(db.query).not.toHaveBeenCalled();
  });
  test('GET lista ordenada por nombre', async () => {
    db.query.mockResolvedValueOnce([[{ id: 1, nombre_centro: 'A' }]]);
    const res = await request(app).get(base).set('Authorization', ADMIN);
    expect(res.status).toBe(200);
    expect(db.query.mock.calls[0][0]).toContain('ORDER BY nombre_centro ASC');
  });
  test('GET con la BD caída → 500', async () => {
    db.query.mockRejectedValueOnce(new Error('x'));
    expect((await request(app).get(base).set('Authorization', ADMIN)).status).toBe(500);
  });

  describe('POST /centros', () => {
    const post = (b) => request(app).post(base).set('Authorization', ADMIN).send(b);
    test.each([[{}], [{ nombre_centro: '' }], [{ nombre_centro: '   ' }], [{ nombre_centro: null }]])('nombre vacío o en blanco %j → 400', async (body) => {
      expect((await post(body)).status).toBe(400);
      expect(db.query).not.toHaveBeenCalled();
    });
    test('crea el centro con el nombre recortado → 201', async () => {
      db.query.mockResolvedValueOnce([{ insertId: 4 }]);
      const res = await post({ nombre_centro: '  Centro Nuevo  ' });
      expect(res.status).toBe(201);
      expect(res.body.datos).toEqual({ id: 4, nombre_centro: 'Centro Nuevo' });
      expect(db.query.mock.calls[0][1]).toEqual(['Centro Nuevo']);
    });
    test('falla la BD → 500', async () => {
      db.query.mockRejectedValueOnce(new Error('x'));
      expect((await post({ nombre_centro: 'A' })).status).toBe(500);
    });
    test('petición SIN cuerpo → 400 (aquí sí se usa req.body?. y no revienta)', async () => {
      expect((await request(app).post(base).set('Authorization', ADMIN)).status).toBe(400);
    });
  });

  describe('PATCH /centros/:id', () => {
    const patch = (id, b) => request(app).patch(`${base}/${id}`).set('Authorization', ADMIN).send(b);
    // HALLAZGO: `next(e)` envía el error 400 de integer() al manejador global, que responde 500.
    test.failing('id inválido debería responder 400 (core.routes usa next(e) en vez de error(res, e))', async () => {
      expect((await patch('x', { nombre_centro: 'A' })).status).toBe(400);
    });
    test('nombre vacío → 400', async () => { expect((await patch(1, { nombre_centro: ' ' })).status).toBe(400); });
    test('centro inexistente → 404', async () => {
      db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
      expect((await patch(1, { nombre_centro: 'A' })).status).toBe(404);
    });
    test('actualiza → 200 con datos', async () => {
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
      const res = await patch(3, { nombre_centro: ' Nuevo ' });
      expect(res.body.datos).toEqual({ id: 3, nombre_centro: 'Nuevo' });
      expect(db.query.mock.calls[0][1]).toEqual(['Nuevo', 3]);
    });
    test('falla la BD → 500', async () => {
      db.query.mockRejectedValueOnce(new Error('x'));
      expect((await patch(1, { nombre_centro: 'A' })).status).toBe(500);
    });
  });
});
