import request from 'supertest';
import router from '../routes/attention.routes.js';
import db from '../db.js';
import { appWith } from './helpers/app.js';
import { freshDb } from './helpers/db.js';
import { mockSql, sqlsOf } from './helpers/sql.js';

jest.mock('../db.js', () => ({ __esModule: true, default: { query: jest.fn(), getConnection: jest.fn() } }));

const as = (...roles) => ({ id: 7, roles });
const ADMIN = as('ADMINISTRADOR'), JEFE = as('JEFE_SEGURIDAD'), CELADOR = as('CELADOR'), APRENDIZ = as('APRENDIZ'), INVITADO = as('INVITADO');
const api = (u) => request(appWith(router, u, '/api'));
let conn;
beforeEach(() => { conn = freshDb(db); jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => console.error.mockRestore());
const hace = (minutos) => new Date(Date.now() - minutos * 60_000);

// ═════════════════════ AUTORIZACIÓN POR ROL ═════════════════════
const TODOS = ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR', 'APRENDIZ', 'INVITADO'];
const MATRIZ = [
  ['get', '/api/reportes', ['CELADOR', 'JEFE_SEGURIDAD']],
  ['post', '/api/reportes', ['CELADOR']],
  ['get', '/api/reportes/1', ['CELADOR', 'JEFE_SEGURIDAD']],
  ['put', '/api/reportes/1', ['CELADOR']],
  ['post', '/api/pqrs', ['JEFE_SEGURIDAD', 'CELADOR', 'APRENDIZ', 'INVITADO']],
  ['post', '/api/pqrs/1/respuesta', ['ADMINISTRADOR']],
  ['get', '/api/respuestas', ['ADMINISTRADOR']],
  ['put', '/api/respuestas/1', ['ADMINISTRADOR']],
];
describe('Matriz de autorización (rol no permitido → 403 sin tocar la BD)', () => {
  const casos = MATRIZ.flatMap(([m, url, ok]) => TODOS.filter((r) => !ok.includes(r)).map((r) => [m, url, r]));
  test.each(casos)('%s %s con rol %s → 403', async (metodo, url, rol) => {
    const res = await api({ id: 7, roles: [rol] })[metodo](url).send({});
    expect(res.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
    expect(db.getConnection).not.toHaveBeenCalled();
  });
});

// ═════════════════════ REPORTES ═════════════════════
describe('GET /reportes', () => {
  const lista = () => mockSql(db.query, [[/^SELECT COUNT/, [[{ total: 1 }]]], [/^\s*SELECT r\.\*/, [[{ id: 1 }]]]]);

  test('CELADOR (sin JEFE) solo ve SUS reportes: WHERE + id del token', async () => {
    lista();
    const res = await api(CELADOR).get('/api/reportes');
    expect(res.status).toBe(200);
    expect(sqlsOf(db.query)[0]).toContain('WHERE r.id_usuario_celador=?');
    expect(db.query.mock.calls[0][1]).toEqual([7]);
    expect(db.query.mock.calls[1][1]).toEqual([7, 20, 0]);
  });
  test('JEFE ve todos: sin WHERE', async () => {
    lista();
    await api(JEFE).get('/api/reportes');
    expect(sqlsOf(db.query).join(' ')).not.toContain('WHERE');
    expect(db.query.mock.calls[1][1]).toEqual([20, 0]);
  });
  test('respuesta con paginación y total', async () => {
    lista();
    const res = await api(JEFE).get('/api/reportes?pagina=3&limite=10');
    expect(res.body).toMatchObject({ ok: true, pagina: 3, limite: 10, total: 1 });
    expect(db.query.mock.calls[1][1]).toEqual([10, 20]);
  });
  test('limite > 100 → 400', async () => {
    expect((await api(JEFE).get('/api/reportes?limite=500')).status).toBe(400);
  });
  test('falla la BD → 500 genérico', async () => {
    db.query.mockRejectedValue(new Error('secreto'));
    const res = await api(JEFE).get('/api/reportes');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secreto');
  });
});

describe('POST /reportes', () => {
  const ok = () => mockSql(db.query, [[/^SELECT id FROM usuario/, [[{ id: 7 }]]], [/^\s*INSERT INTO reporte/, [{ insertId: 90 }]]]);

  test.each([[{}], [{ asunto: 'a' }], [{ cuerpo: 'c' }], [{ asunto: '', cuerpo: 'c' }]])('campos obligatorios faltantes %j → 400', async (body) => {
    const res = await api(CELADOR).post('/api/reportes').send(body);
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('id_entrada_salida inválido → 400', async () => {
    const res = await api(CELADOR).post('/api/reportes').send({ asunto: 'a', cuerpo: 'c', id_entrada_salida: 'x' });
    expect(res.status).toBe(400);
  });
  test('el celador del token no existe en BD → 404', async () => {
    mockSql(db.query, [[/^SELECT id FROM usuario/, [[]]]]);
    const res = await api(CELADOR).post('/api/reportes').send({ asunto: 'a', cuerpo: 'c' });
    expect(res.status).toBe(404);
  });
  test('éxito sin id_entrada_salida → 201, estado=0 fijo en el SQL y NULL como entrada', async () => {
    ok();
    const res = await api(CELADOR).post('/api/reportes').send({ asunto: 'Ruido', cuerpo: 'Detalle' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, id_reporte: 90 });
    const insert = db.query.mock.calls.find(([s]) => s.includes('INSERT INTO reporte'));
    expect(insert[0]).toMatch(/NOW\(\), \?, \?, 0, \?/);          // estado=0 literal (nunca NULL: columna NOT NULL)
    expect(insert[1]).toEqual([7, 'Ruido', 'Detalle', null]);
  });
  test('id_entrada_salida null explícito se trata como ausente; número válido se envía como entero', async () => {
    ok();
    await api(CELADOR).post('/api/reportes').send({ asunto: 'a', cuerpo: 'c', id_entrada_salida: null });
    expect(db.query.mock.calls.find(([s]) => s.includes('INSERT'))[1][3]).toBeNull();
    ok();
    await api(CELADOR).post('/api/reportes').send({ asunto: 'a', cuerpo: 'c', id_entrada_salida: '12' });
    expect(db.query.mock.calls.find(([s]) => s.includes('INSERT'))[1][3]).toBe(12);
  });
  test('el celador SIEMPRE es el del token aunque el body intente otro', async () => {
    ok();
    await api(CELADOR).post('/api/reportes').send({ asunto: 'a', cuerpo: 'c', id_usuario_celador: 999 });
    expect(db.query.mock.calls.find(([s]) => s.includes('INSERT'))[1][0]).toBe(7);
  });
  test('FK de id_entrada_salida inexistente (ER_NO_REFERENCED_ROW_2) → 400', async () => {
    mockSql(db.query, [[/^SELECT id FROM usuario/, [[{ id: 7 }]]], [/INSERT/, Object.assign(new Error(), { code: 'ER_NO_REFERENCED_ROW_2' })]]);
    const res = await api(CELADOR).post('/api/reportes').send({ asunto: 'a', cuerpo: 'c', id_entrada_salida: 999 });
    expect(res.status).toBe(400);
  });
});

describe('GET /reportes/:id', () => {
  const reporte = (idCelador) => mockSql(db.query, [[/FROM reporte r/, [[{ id: 1, id_usuario_celador: idCelador }]]]]);

  test('id inválido → 400', async () => { expect((await api(JEFE).get('/api/reportes/abc')).status).toBe(400); });
  test('no existe → 404', async () => {
    mockSql(db.query, [[/FROM reporte r/, [[]]]]);
    expect((await api(JEFE).get('/api/reportes/1')).status).toBe(404);
  });
  test('CELADOR pidiendo reporte AJENO → 403', async () => {
    reporte(99);
    expect((await api(CELADOR).get('/api/reportes/1')).status).toBe(403);
  });
  test('CELADOR pidiendo el PROPIO → 200', async () => {
    reporte(7);
    const res = await api(CELADOR).get('/api/reportes/1');
    expect(res.status).toBe(200);
    expect(res.body.datos.id).toBe(1);
  });
  test('JEFE puede ver el reporte de cualquier celador → 200', async () => {
    reporte(99);
    expect((await api(JEFE).get('/api/reportes/1')).status).toBe(200);
  });
  // (Eliminada: un usuario tiene un solo rol activo; no existe CELADOR+JEFE)
});

describe('PUT /reportes/:id (ventana de edición de 5 min)', () => {
  const dueno = (idCelador, fecha) => mockSql(db.query, [
    [/^SELECT id_usuario_celador, fecha_hora/, [[{ id_usuario_celador: idCelador, fecha_hora: fecha }]]],
    [/^UPDATE reporte/, [{ affectedRows: 1 }]],
  ]);

  test('id inválido → 400', async () => { expect((await api(CELADOR).put('/api/reportes/x').send({ asunto: 'a' })).status).toBe(400); });
  test('no existe → 404', async () => {
    mockSql(db.query, [[/^SELECT id_usuario_celador/, [[]]]]);
    expect((await api(CELADOR).put('/api/reportes/1').send({ asunto: 'a' })).status).toBe(404);
  });
  test('reporte de otro celador → 403 y NO hace UPDATE', async () => {
    dueno(99, new Date());
    const res = await api(CELADOR).put('/api/reportes/1').send({ asunto: 'a' });
    expect(res.status).toBe(403);
    expect(sqlsOf(db.query).some((s) => s.startsWith('UPDATE'))).toBe(false);
  });
  test('fuera de la ventana (6 min) → 409', async () => {
    dueno(7, hace(6));
    const res = await api(CELADOR).put('/api/reportes/1').send({ asunto: 'a' });
    expect(res.status).toBe(409);
    expect(res.body.mensaje).toMatch(/primeros 5 minutos/);
  });
  test('dentro de la ventana (4 min) → 200', async () => {
    dueno(7, hace(4));
    expect((await api(CELADOR).put('/api/reportes/1').send({ asunto: 'a' })).status).toBe(200);
  });
  test('fecha ilegible → 500 ("No se puede validar la fecha")', async () => {
    dueno(7, 'no-es-fecha');
    expect((await api(CELADOR).put('/api/reportes/1').send({ asunto: 'a' })).status).toBe(500);
  });
  test('sin campos actualizables (solo estado/otros) → 400', async () => {
    dueno(7, new Date());
    const res = await api(CELADOR).put('/api/reportes/1').send({ estado: 1, id_usuario_celador: 5 });
    expect(res.status).toBe(400);
  });
  test('solo acepta asunto y cuerpo: SET dinámico con lista blanca + doble filtro por id y dueño', async () => {
    dueno(7, new Date());
    await api(CELADOR).put('/api/reportes/3').send({ asunto: 'N', cuerpo: 'M', estado: 1 });
    const upd = db.query.mock.calls.find(([s]) => s.startsWith('UPDATE reporte'));
    expect(upd[0]).toBe('UPDATE reporte SET asunto = ?, cuerpo = ? WHERE id = ? AND id_usuario_celador = ?');
    expect(upd[1]).toEqual(['N', 'M', 3, 7]);
  });
  test('solo cuerpo → SET con un campo', async () => {
    dueno(7, new Date());
    await api(CELADOR).put('/api/reportes/3').send({ cuerpo: 'M' });
    expect(db.query.mock.calls.find(([s]) => s.startsWith('UPDATE reporte'))[0]).toContain('SET cuerpo = ? WHERE');
  });
  test('UPDATE sin filas afectadas (borrado entre medio) → 404', async () => {
    mockSql(db.query, [[/^SELECT id_usuario_celador/, [[{ id_usuario_celador: 7, fecha_hora: new Date() }]]], [/^UPDATE/, [{ affectedRows: 0 }]]]);
    expect((await api(CELADOR).put('/api/reportes/1').send({ asunto: 'a' })).status).toBe(404);
  });
});

// ═════════════════════ PQRS ═════════════════════
describe('GET /pqrs', () => {
  const lista = () => mockSql(db.query, [[/^SELECT COUNT/, [[{ total: 2 }]]], [/^\s*SELECT p\.\*/, [[{ id: 1 }, { id: 2 }]]]]);

  test.each([['APRENDIZ', APRENDIZ], ['INVITADO', INVITADO], ['CELADOR', CELADOR], ['JEFE', JEFE]])('%s ve solo SUS PQRS (WHERE + id del token)', async (_n, user) => {
    lista();
    const res = await api(user).get('/api/pqrs');
    expect(res.status).toBe(200);
    expect(sqlsOf(db.query)[0]).toContain('WHERE p.id_usuario=?');
    expect(db.query.mock.calls[0][1]).toEqual([7]);
    expect(db.query.mock.calls[1][1]).toEqual([7, 20, 0]);
  });
  test('ADMIN ve todas: sin WHERE ni args extra', async () => {
    lista();
    const res = await api(ADMIN).get('/api/pqrs?limite=2');
    expect(sqlsOf(db.query).join(' ')).not.toContain('WHERE p.id_usuario'); // (el EXISTS interno sí tiene su propio WHERE)
    expect(db.query.mock.calls[0][1]).toEqual([]);
    expect(res.body).toMatchObject({ total: 2, limite: 2 });
  });
  test('pagina inválida → 400', async () => { expect((await api(ADMIN).get('/api/pqrs?pagina=0')).status).toBe(400); });
  test('error de BD → 500', async () => {
    db.query.mockRejectedValue(new Error('x'));
    expect((await api(ADMIN).get('/api/pqrs')).status).toBe(500);
  });
});

describe('GET /pqrs/:id', () => {
  const fila = (dueno) => mockSql(db.query, [[/FROM pqrs p JOIN usuario u/, [[{ id: 1, id_usuario: dueno }]]]]);
  test('id inválido → 400', async () => { expect((await api(ADMIN).get('/api/pqrs/x')).status).toBe(400); });
  test('no existe → 404', async () => {
    mockSql(db.query, [[/FROM pqrs p/, [[]]]]);
    expect((await api(ADMIN).get('/api/pqrs/1')).status).toBe(404);
  });
  test('dueño → 200', async () => { fila(7); expect((await api(APRENDIZ).get('/api/pqrs/1')).status).toBe(200); });
  test('ADMIN (no dueño) → 200', async () => { fila(99); expect((await api(ADMIN).get('/api/pqrs/1')).status).toBe(200); });
  test('otro usuario (ni dueño ni admin) → 403 y no se devuelven datos', async () => {
    fila(99);
    const res = await api(APRENDIZ).get('/api/pqrs/1');
    expect(res.status).toBe(403);
    expect(res.body.datos).toBeUndefined();
  });
});

describe('POST /pqrs', () => {
  test.each([[{}], [{ asunto: 'a' }], [{ cuerpo: 'c' }]])('faltan campos %j → 400', async (body) => {
    expect((await api(APRENDIZ).post('/api/pqrs').send(body)).status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('éxito → 201, estado RADICADO (1) y dueño = token', async () => {
    db.query.mockResolvedValueOnce([{ insertId: 33 }]);
    const res = await api(INVITADO).post('/api/pqrs').send({ asunto: 'Queja', cuerpo: 'Texto', id_usuario: 999, estado: 4 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, id_pqrs: 33 });
    expect(db.query.mock.calls[0][1]).toEqual([7, 'Queja', 'Texto', 1]); // ignora id_usuario y estado del body
  });
  test('error de BD → 500', async () => {
    db.query.mockRejectedValueOnce(new Error('x'));
    expect((await api(APRENDIZ).post('/api/pqrs').send({ asunto: 'a', cuerpo: 'c' })).status).toBe(500);
  });
});

describe('PUT /pqrs/:id', () => {
  const fila = (extra = {}) => mockSql(db.query, [
    [/^SELECT id_usuario, estado, fecha_creacion/, [[{ id_usuario: 7, estado: 1, fecha_creacion: new Date(), ...extra }]]],
    [/^UPDATE pqrs/, [{}]],
  ]);
  test('id inválido → 400', async () => { expect((await api(APRENDIZ).put('/api/pqrs/x').send({ asunto: 'a', cuerpo: 'c' })).status).toBe(400); });
  test('faltan campos → 400', async () => { expect((await api(APRENDIZ).put('/api/pqrs/1').send({ asunto: 'a' })).status).toBe(400); });
  test('no existe → 404', async () => {
    mockSql(db.query, [[/^SELECT id_usuario/, [[]]]]);
    expect((await api(APRENDIZ).put('/api/pqrs/1').send({ asunto: 'a', cuerpo: 'c' })).status).toBe(404);
  });
  test('PQRS ajena → 403 (incluso para ADMIN: solo el dueño edita)', async () => {
    fila({ id_usuario: 99 });
    expect((await api(APRENDIZ).put('/api/pqrs/1').send({ asunto: 'a', cuerpo: 'c' })).status).toBe(403);
    fila({ id_usuario: 99 });
    expect((await api(ADMIN).put('/api/pqrs/1').send({ asunto: 'a', cuerpo: 'c' })).status).toBe(403);
  });
  test.each([[2], [3], [4]])('estado %i (distinto de RADICADO) → 409', async (estado) => {
    fila({ estado });
    const res = await api(APRENDIZ).put('/api/pqrs/1').send({ asunto: 'a', cuerpo: 'c' });
    expect(res.status).toBe(409);
    expect(res.body.mensaje).toMatch(/RADICADO/);
  });
  test('fuera de la ventana de 5 min → 409', async () => {
    fila({ fecha_creacion: hace(10) });
    expect((await api(APRENDIZ).put('/api/pqrs/1').send({ asunto: 'a', cuerpo: 'c' })).status).toBe(409);
  });
  test('éxito → 200 y UPDATE con asunto, cuerpo e id', async () => {
    fila();
    const res = await api(APRENDIZ).put('/api/pqrs/5').send({ asunto: 'A2', cuerpo: 'C2' });
    expect(res.status).toBe(200);
    expect(db.query.mock.calls.find(([s]) => s.startsWith('UPDATE pqrs'))[1]).toEqual(['A2', 'C2', 5]);
  });
});

describe('POST /pqrs/:id/respuesta (transacción con bloqueo)', () => {
  const body = { asunto: 'Re', cuerpo: 'Respuesta' };
  const flujo = ({ pqrs = [{ id: 1 }], respondida = [] } = {}) => mockSql(conn.query, [
    [/FOR UPDATE/, [pqrs]],
    [/^SELECT id FROM respuesta/, [respondida]],
    [/./, [{}]],
  ]);

  test('faltan campos → 400, rollback y conexión liberada', async () => {
    const res = await api(ADMIN).post('/api/pqrs/1/respuesta').send({ asunto: 'a' });
    expect(res.status).toBe(400);
    expect(conn.beginTransaction).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test('id inválido → 400', async () => { expect((await api(ADMIN).post('/api/pqrs/x/respuesta').send(body)).status).toBe(400); });
  test('PQRS inexistente → 404 + rollback', async () => {
    flujo({ pqrs: [] });
    const res = await api(ADMIN).post('/api/pqrs/1/respuesta').send(body);
    expect(res.status).toBe(404);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
  });
  test('ya respondida → 409 + rollback (evita doble respuesta)', async () => {
    flujo({ respondida: [{ id: 9 }] });
    const res = await api(ADMIN).post('/api/pqrs/1/respuesta').send(body);
    expect(res.status).toBe(409);
    expect(conn.rollback).toHaveBeenCalled();
    expect(sqlsOf(conn.query).some((s) => s.startsWith('INSERT'))).toBe(false);
  });
  test('éxito → 201: inserta respuesta con el admin del token, pasa la PQRS a RESUELTO (3) y hace commit', async () => {
    flujo();
    const res = await api(ADMIN).post('/api/pqrs/4/respuesta').send(body);
    expect(res.status).toBe(201);
    const ins = conn.query.mock.calls.find(([s]) => s.startsWith('INSERT INTO respuesta'));
    expect(ins[1]).toEqual([4, 7, 'Re', 'Respuesta']);
    const upd = conn.query.mock.calls.find(([s]) => s.startsWith('UPDATE pqrs'));
    expect(upd[1]).toEqual([3, 4]);
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });
  test('falla el UPDATE de estado → rollback total, no commit, 500', async () => {
    mockSql(conn.query, [[/FOR UPDATE/, [[{ id: 1 }]]], [/^SELECT id FROM respuesta/, [[]]], [/^INSERT/, [{}]], [/^UPDATE pqrs/, new Error('x')]]);
    const res = await api(ADMIN).post('/api/pqrs/1/respuesta').send(body);
    expect(res.status).toBe(500);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
});

describe('GET /pqrs/:id/respuesta', () => {
  const montar = ({ dueno = 7, respuestas = [{ id: 1 }] } = {}) => mockSql(db.query, [
    [/^SELECT id_usuario FROM pqrs/, [dueno === null ? [] : [{ id_usuario: dueno }]]],
    [/^SELECT \* FROM respuesta WHERE id_pqrs/, [respuestas]],
  ]);
  test('id inválido → 400', async () => { expect((await api(ADMIN).get('/api/pqrs/x/respuesta')).status).toBe(400); });
  test('PQRS inexistente → 404', async () => { montar({ dueno: null }); expect((await api(ADMIN).get('/api/pqrs/1/respuesta')).status).toBe(404); });
  test('ni dueño ni admin → 403 y NO consulta la tabla respuesta', async () => {
    montar({ dueno: 99 });
    expect((await api(APRENDIZ).get('/api/pqrs/1/respuesta')).status).toBe(403);
    expect(sqlsOf(db.query).some((s) => s.includes('FROM respuesta'))).toBe(false);
  });
  test('dueño sin respuesta aún → 404 con mensaje específico', async () => {
    montar({ respuestas: [] });
    const res = await api(APRENDIZ).get('/api/pqrs/1/respuesta');
    expect(res.status).toBe(404);
    expect(res.body.mensaje).toMatch(/aún no tiene respuesta/);
  });
  test('dueño con respuesta → 200; ADMIN ajeno → 200', async () => {
    montar();
    expect((await api(APRENDIZ).get('/api/pqrs/1/respuesta')).body.datos).toEqual({ id: 1 });
    montar({ dueno: 99 });
    expect((await api(ADMIN).get('/api/pqrs/1/respuesta')).status).toBe(200);
  });
});

// ═════════════════════ RESPUESTAS (solo ADMIN) ═════════════════════
describe('GET /respuestas', () => {
  test('lista para ADMIN', async () => {
    db.query.mockResolvedValueOnce([[{ id: 2 }, { id: 1 }]]);
    const res = await api(ADMIN).get('/api/respuestas');
    expect(res.body.datos).toHaveLength(2);
  });
  test('error de BD → 500', async () => {
    db.query.mockRejectedValueOnce(new Error('x'));
    expect((await api(ADMIN).get('/api/respuestas')).status).toBe(500);
  });
});

describe('PUT /respuestas/:id', () => {
  const montar = (created, affected = 1) => mockSql(db.query, [
    [/^SELECT created_at FROM respuesta/, [created === null ? [] : [{ created_at: created }]]],
    [/^UPDATE respuesta/, [{ affectedRows: affected }]],
  ]);
  const put = (id = 1, b = { asunto: 'a', cuerpo: 'c' }) => api(ADMIN).put(`/api/respuestas/${id}`).send(b);

  test('id inválido → 400', async () => { expect((await put('x')).status).toBe(400); });
  test('faltan campos → 400', async () => { expect((await put(1, { asunto: 'a' })).status).toBe(400); });
  test('no existe → 404', async () => { montar(null); expect((await put()).status).toBe(404); });
  test('fuera de ventana → 409 y no hace UPDATE', async () => {
    montar(hace(6));
    expect((await put()).status).toBe(409);
    expect(sqlsOf(db.query).some((s) => s.startsWith('UPDATE'))).toBe(false);
  });
  test('UPDATE sin filas afectadas → 404', async () => { montar(new Date(), 0); expect((await put()).status).toBe(404); });
  test('éxito → 200 con parámetros correctos', async () => {
    montar(new Date());
    const res = await put(8, { asunto: 'N', cuerpo: 'M' });
    expect(res.status).toBe(200);
    expect(db.query.mock.calls.find(([s]) => s.startsWith('UPDATE respuesta'))[1]).toEqual(['N', 'M', 8]);
  });
});

// ═════════════════════ Código sin ruta ═════════════════════
describe('Cobertura que las rutas NO pueden alcanzar', () => {
  // destroyReport no tiene ruta HTTP; su regla se cubre en el contrato de reportes.
});
