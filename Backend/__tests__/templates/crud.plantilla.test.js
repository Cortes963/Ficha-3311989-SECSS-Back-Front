/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  PLANTILLA DE PRUEBAS CRUD A TRAVÉS DE RUTAS (caja blanca, BD simulada)   ║
 * ║                                                                            ║
 * ║  Cómo usarla:                                                              ║
 * ║   1. Copia este archivo a  __tests__/<recurso>.routes.test.js              ║
 * ║   2. Borra el bloque "RUTAS DEMO" y descomenta el import de tu router      ║
 * ║      (ej.: import router from '../routes/vehicle.routes.js').              ║
 * ║   3. Cambia el prefijo, los roles y las regex de SQL por los de tu recurso. ║
 * ║   4. Por cada if / catch / ?? del controlador, escribe UN test.            ║
 * ║                                                                            ║
 * ║  Esta plantilla SÍ se ejecuta (usa un router demo) para que veas que el    ║
 * ║  esqueleto funciona. Bórrala cuando ya no la necesites.                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import request from 'supertest';
import { Router } from 'express';
import db from '../../db.js';
// import router from '../../routes/<recurso>.routes.js';
import { allowRoles } from '../../middleware/auth.js';
import { error, integer, required, page } from '../../lib.js';
import { appWith } from '../helpers/app.js';
import { freshDb } from '../helpers/db.js';
import { mockSql, sqlsOf } from '../helpers/sql.js';

// ─── 1) AISLAR la BD: ninguna prueba toca MySQL ───────────────────────────────
jest.mock('../../db.js', () => ({ __esModule: true, default: { query: jest.fn(), getConnection: jest.fn() } }));

// ─── RUTAS DEMO (bórralas y usa el import real de arriba) ─────────────────────
const router = Router();
router.get('/', allowRoles('ADMINISTRADOR', 'CELADOR'), async (req, res) => {
  try {
    const { pagina, limite, offset } = page(req.query);
    const [[{ total }]] = await db.query('SELECT COUNT(*) total FROM item');
    const [datos] = await db.query('SELECT * FROM item ORDER BY id DESC LIMIT ? OFFSET ?', [limite, offset]);
    return res.json({ ok: true, pagina, limite, total, datos });
  } catch (e) { return error(res, e); }
});
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM item WHERE id=? AND estado=1', [integer(req.params.id, 'id')]);
    if (!rows.length) return res.status(404).json({ ok: false, mensaje: 'No encontrado.' });
    return res.json({ ok: true, datos: rows[0] });
  } catch (e) { return error(res, e); }
});
router.post('/', allowRoles('ADMINISTRADOR'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    required(req.body ?? {}, ['nombre']);
    await connection.beginTransaction();
    const [r] = await connection.query('INSERT INTO item (nombre) VALUES (?)', [req.body.nombre]);
    await connection.commit();
    return res.status(201).json({ ok: true, id: r.insertId });
  } catch (e) { await connection.rollback(); return error(res, e); }
  finally { connection.release(); }
});
router.put('/:id', allowRoles('ADMINISTRADOR'), async (req, res) => {
  try {
    required(req.body ?? {}, ['nombre']);
    const [r] = await db.query('UPDATE item SET nombre=? WHERE id=?', [req.body.nombre, integer(req.params.id, 'id')]);
    if (!r.affectedRows) return res.status(404).json({ ok: false, mensaje: 'No encontrado.' });
    return res.json({ ok: true });
  } catch (e) { return error(res, e); }
});
router.patch('/:id/inactivar', allowRoles('ADMINISTRADOR'), async (req, res) => {
  try {
    const [r] = await db.query('UPDATE item SET estado=0 WHERE id=? AND estado=1', [integer(req.params.id, 'id')]);
    if (!r.affectedRows) return res.status(404).json({ ok: false, mensaje: 'No encontrado o ya inactivo.' });
    return res.json({ ok: true });
  } catch (e) { return error(res, e); }
});
// ─── fin de las rutas demo ────────────────────────────────────────────────────

// ─── 2) HELPERS DE LA PRUEBA ──────────────────────────────────────────────────
//  api(usuario) = mini-app Express con SOLO tu router; `usuario` simula al autenticado (id y roles del token)
const ADMIN = { id: 7, roles: ['ADMINISTRADOR'] };
const CELADOR = { id: 8, roles: ['CELADOR'] };
const api = (user) => request(appWith(router, user, '/api/items'));   // ← cambia el prefijo
let conn;
beforeEach(() => {
  conn = freshDb(db);                                                 // BD limpia + conexión transaccional nueva
  jest.spyOn(console, 'error').mockImplementation(() => {});          // silencia el console.error de lib.error()
});
afterEach(() => console.error.mockRestore());

// ─── 3) AUTORIZACIÓN: un test por (ruta × rol no permitido) ───────────────────
describe('Autorización', () => {
  test.each([
    ['post', '/api/items', CELADOR],
    ['put', '/api/items/1', CELADOR],
    ['patch', '/api/items/1/inactivar', CELADOR],
  ])('%s %s con rol no permitido → 403 y la BD no se toca', async (metodo, url, usuario) => {
    const res = await api(usuario)[metodo](url).send({ nombre: 'x' });
    expect(res.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
    expect(db.getConnection).not.toHaveBeenCalled();
  });
});

// ─── 4) UN describe POR OPERACIÓN CRUD ────────────────────────────────────────
describe('CREATE  POST /', () => {
  test('✔ camino feliz: 201, commit y conexión liberada', async () => {
    conn.query.mockResolvedValueOnce([{ insertId: 10 }]);
    const res = await api(ADMIN).post('/api/items').send({ nombre: 'Casco' });

    expect(res.status).toBe(201);                                      // código HTTP
    expect(res.body).toEqual({ ok: true, id: 10 });                    // cuerpo
    expect(conn.query.mock.calls[0][1]).toEqual(['Casco']);            // parámetros que llegaron al SQL
    expect(conn.commit).toHaveBeenCalled();                            // efecto transaccional
    expect(conn.release).toHaveBeenCalledTimes(1);                     // sin fugas de conexión
  });
  test('✘ validación: falta un campo → 400 y NO se abre transacción', async () => {
    const res = await api(ADMIN).post('/api/items').send({});
    expect(res.status).toBe(400);
    expect(conn.beginTransaction).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test('✘ duplicado (ER_DUP_ENTRY) → 409 y rollback', async () => {
    conn.query.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    const res = await api(ADMIN).post('/api/items').send({ nombre: 'Casco' });
    expect(res.status).toBe(409);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
  });
  test('✘ error inesperado → 500 genérico (no filtra el detalle interno)', async () => {
    conn.query.mockRejectedValueOnce(new Error('detalle secreto del motor'));
    const res = await api(ADMIN).post('/api/items').send({ nombre: 'x' });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secreto');
  });
});

describe('READ  GET / (lista)', () => {
  test('✔ pagina y entrega total + datos', async () => {
    // mockSql: la BD responde según el SQL recibido, sin depender del orden de las llamadas
    mockSql(db.query, [
      [/^SELECT COUNT/, [[{ total: 2 }]]],
      [/^SELECT \*/, [[{ id: 2 }, { id: 1 }]]],
    ]);
    const res = await api(ADMIN).get('/api/items?pagina=2&limite=5');
    expect(res.body).toMatchObject({ total: 2, pagina: 2, limite: 5 });
    expect(db.query.mock.calls[1][1]).toEqual([5, 5]);                 // limite, offset = (2-1)*5
  });
  test('✘ limite fuera de rango → 400', async () => {
    expect((await api(ADMIN).get('/api/items?limite=101')).status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('READ  GET /:id (uno)', () => {
  test('✔ existe → 200', async () => {
    db.query.mockResolvedValueOnce([[{ id: 3, nombre: 'A' }]]);
    const res = await api(ADMIN).get('/api/items/3');
    expect(res.body).toEqual({ ok: true, datos: { id: 3, nombre: 'A' } });
  });
  test('✘ no existe → 404', async () => {
    db.query.mockResolvedValueOnce([[]]);
    expect((await api(ADMIN).get('/api/items/3')).status).toBe(404);
  });
  test.each([['abc'], ['0'], ['-1'], ['1.5'], ['1%20OR%201=1']])('✘ id inválido %p → 400 sin tocar la BD', async (id) => {
    expect((await api(ADMIN).get(`/api/items/${id}`)).status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('UPDATE  PUT /:id', () => {
  test('✔ existe → 200 y el UPDATE lleva los parámetros correctos', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await api(ADMIN).put('/api/items/3').send({ nombre: 'Nuevo' });
    expect(res.body).toEqual({ ok: true });
    expect(db.query.mock.calls[0][1]).toEqual(['Nuevo', 3]);
  });
  test('✘ affectedRows = 0 → 404', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    expect((await api(ADMIN).put('/api/items/3').send({ nombre: 'x' })).status).toBe(404);
  });
  test('✘ body sin campos → 400', async () => {
    expect((await api(ADMIN).put('/api/items/3').send({})).status).toBe(400);
  });
});

describe('DELETE lógico  PATCH /:id/inactivar', () => {
  test('✔ activo → inactiva y el SQL exige estado=1 (no se puede inactivar dos veces)', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await api(ADMIN).patch('/api/items/3/inactivar');
    expect(sqlsOf(db.query)[0]).toContain('AND estado=1');
    expect(res.body).toEqual({ ok: true });
  });
  test('✘ ya inactivo / inexistente → 404', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    expect((await api(ADMIN).patch('/api/items/3/inactivar')).status).toBe(404);
  });
});

// ─── 5) FLUJO CRUD ENCADENADO sobre una "BD" en memoria ───────────────────────
describe('Flujo completo create → read → update → delete → read', () => {
  test('el recurso cambia de estado en cada paso', async () => {
    const tabla = new Map(); let seq = 0;                              // "base de datos" en memoria
    mockSql(db.query, [
      [/^SELECT \* FROM item WHERE id/, (_s, [id]) => [tabla.has(id) && tabla.get(id).estado ? [tabla.get(id)] : []]],
      [/^UPDATE item SET nombre/, (_s, [nombre, id]) => { if (!tabla.has(id)) return [{ affectedRows: 0 }]; tabla.get(id).nombre = nombre; return [{ affectedRows: 1 }]; }],
      [/^UPDATE item SET estado=0/, (_s, [id]) => { const it = tabla.get(id); if (!it || !it.estado) return [{ affectedRows: 0 }]; it.estado = 0; return [{ affectedRows: 1 }]; }],
    ]);
    mockSql(conn.query, [[/^INSERT INTO item/, (_s, [nombre]) => { tabla.set(++seq, { id: seq, nombre, estado: 1 }); return [{ insertId: seq }]; }]]);

    const app = api(ADMIN);
    const { body: { id } } = await app.post('/api/items').send({ nombre: 'Casco' });                       // CREATE
    expect((await app.get(`/api/items/${id}`)).body.datos.nombre).toBe('Casco');                           // READ
    await app.put(`/api/items/${id}`).send({ nombre: 'Casco Pro' });                                       // UPDATE
    expect((await app.get(`/api/items/${id}`)).body.datos.nombre).toBe('Casco Pro');
    expect((await app.patch(`/api/items/${id}/inactivar`)).status).toBe(200);                              // DELETE lógico
    expect((await app.get(`/api/items/${id}`)).status).toBe(404);                                          // ya no aparece
    expect((await app.patch(`/api/items/${id}/inactivar`)).status).toBe(404);                              // no se inactiva dos veces
  });
});
