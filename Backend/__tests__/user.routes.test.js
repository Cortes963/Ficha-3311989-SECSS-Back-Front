import request from 'supertest';
import bcrypt from 'bcryptjs';
import router from '../routes/user.routes.js';
import db from '../db.js';
import { appWith } from './helpers/app.js';
import { freshDb, PNG } from './helpers/db.js';
import { mockSql, sqlsOf } from './helpers/sql.js';
import { storedFiles, clearStorage } from './helpers/storage.js';

// Pruebas por RUTAS: Express + guards + multer + controller + services reales; solo BD y bcrypt simulados.
jest.mock('../db.js', () => ({ __esModule: true, default: { query: jest.fn(), getConnection: jest.fn() } }));
jest.mock('bcryptjs', () => ({ __esModule: true, default: { compare: jest.fn(), hash: jest.fn().mockResolvedValue('NEW_HASH') } }));

const as = (...roles) => ({ id: 7, roles });
const ADMIN = as('ADMINISTRADOR'), JEFE = as('JEFE_SEGURIDAD'), CELADOR = as('CELADOR'), APRENDIZ = as('APRENDIZ'), INVITADO = as('INVITADO');
const api = (u) => request(appWith(router, u, '/api/users'));
let conn;
beforeEach(() => { conn = freshDb(db); clearStorage(); bcrypt.compare.mockReset(); jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => console.error.mockRestore());

// ═════════════ Matriz de autorización ═════════════
const TODOS = ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR', 'APRENDIZ', 'INVITADO'];
const MATRIZ = [
  ['get', '/api/users/me/aprendiz', ['APRENDIZ', 'ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR']],
  ['patch', '/api/users/me/aprendiz', ['APRENDIZ']],
  ['patch', '/api/users/me', ['APRENDIZ', 'CELADOR', 'JEFE_SEGURIDAD', 'ADMINISTRADOR']],
  ['patch', '/api/users/me/estado', TODOS],
  ['patch', '/api/users/me/password', TODOS],
  ['get', '/api/users/elegibles', ['ADMINISTRADOR', 'JEFE_SEGURIDAD']],
  ['get', '/api/users', ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR']],
  ['get', '/api/users/5/aprendiz', ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR']],
  ['patch', '/api/users/5/aprendiz', ['APRENDIZ']],
  ['get', '/api/users/5', ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR']],
  ['post', '/api/users/celador', ['JEFE_SEGURIDAD']],
  ['post', '/api/users/jefe', ['ADMINISTRADOR']],
  ['post', '/api/users/asignar-celador', ['ADMINISTRADOR', 'JEFE_SEGURIDAD']],
];
describe('Matriz de autorización de /users (rol denegado → 403 y la BD no se toca)', () => {
  const casos = MATRIZ.flatMap(([m, url, ok]) => TODOS.filter((r) => !ok.includes(r)).map((r) => [m, url, r]));
  test.each(casos)('%s %s con rol %s → 403', async (metodo, url, rol) => {
    const body = metodo === 'patch' && url.includes('/aprendiz') ? { ficha: 'F-EDIT-TEST' } : {};
    const res = await api({ id: 7, roles: [rol] })[metodo](url).send(body);
    expect(res.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
    expect(db.getConnection).not.toHaveBeenCalled();
  });
});

describe('Enrutamiento: el orden de las rutas importa', () => {
  test('/me NO es capturada por /:id (usa el id del token)', async () => {
    mockSql(db.query, [[/^SELECT u\.\*/, [[{ id: 7 }]]], [/^SELECT r\.nombre_rol/, [[]]], [/^SELECT da\./, [[]]]]);
    const res = await api(APRENDIZ).get('/api/users/me');
    expect(res.status).toBe(200);
    expect(db.query.mock.calls[0][1]).toEqual([7]);
  });
  test('/elegibles NO es capturada por /:id (daría 400 "id debe ser entero")', async () => {
    db.query.mockResolvedValueOnce([[]]);
    expect((await api(ADMIN).get('/api/users/elegibles')).status).toBe(200);
  });
  test('PATCH /me/estado usa el id del TOKEN, no uno de la URL', async () => {
    mockSql(conn.query, [
      [/^SELECT u\.id FROM usuario/, [[{ id: 7 }]]],
      [/^SELECT r\.nombre_rol FROM usuario_rol/, [[{ nombre_rol: 'INVITADO' }]]],
      [/^UPDATE usuario SET estado=/, [{ affectedRows: 1 }]],
      [/^UPDATE cuenta SET estado=/, [{ affectedRows: 1 }]],
      [/^UPDATE usuario_rol SET estado=/, [{ affectedRows: 1 }]],
    ]);
    const res = await api(INVITADO).patch('/api/users/me/estado').send({ estado: 0 });
    expect(res.status).toBe(200);
    expect(conn.query.mock.calls[0][1]).toEqual([7]);
    expect(conn.query.mock.calls.find(([sql]) => /^UPDATE usuario SET estado=/.test(sql))[1]).toEqual([0, 7]);
  });
  test('GET /me/aprendiz usa el id del token', async () => {
    db.query.mockResolvedValueOnce([[{ ficha: 'F' }]]);
    await api(APRENDIZ).get('/api/users/me/aprendiz');
    expect(db.query.mock.calls[0][1]).toEqual([7]);
  });
});

// ═════════════ READ lista ═════════════
describe('GET /users', () => {
  const lista = () => mockSql(db.query, [[/^SELECT COUNT/, [[{ total: 0 }]]], [/^SELECT u\.id/, [[]]]]);

  test('CELADOR sin ?rol=INVITADO → 403 y NO consulta la BD', async () => {
    const res = await api(CELADOR).get('/api/users');
    expect(res.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('CELADOR con ?rol=INVITADO sí puede listar', async () => {
    lista();
    expect((await api(CELADOR).get('/api/users?rol=INVITADO')).status).toBe(200);
  });
  test('sin filtros: WHERE 1=1 y params [limite, offset] por defecto', async () => {
    lista();
    await api(ADMIN).get('/api/users');
    const [sqlDatos, params] = db.query.mock.calls[1];
    expect(sqlDatos).toContain('WHERE 1=1');
    expect(sqlDatos).not.toContain('EXISTS');
    expect(params).toEqual([20, 0]);
  });
  test('filtro rol + q: ambas condiciones, COUNT con los mismos filtros', async () => {
    lista();
    await api(ADMIN).get('/api/users?rol=APRENDIZ&q=ana&pagina=2&limite=5');
    expect(db.query.mock.calls[1][1]).toEqual(['APRENDIZ', '%ana%', '%ana%', 5, 5]);
    expect(db.query.mock.calls[0][1]).toEqual(['APRENDIZ', '%ana%', '%ana%']);
  });
  test('q con SQL malicioso viaja como PARÁMETRO (anti inyección)', async () => {
    lista();
    await api(ADMIN).get('/api/users').query({ q: "'; DROP TABLE usuario;--" });
    expect(sqlsOf(db.query).join(' ')).not.toContain('DROP TABLE');
    expect(db.query.mock.calls[1][1]).toContain("%'; DROP TABLE usuario;--%");
  });
  test('normaliza nombre (omite nulos) y roles (CSV → arreglo, null → [])', async () => {
    mockSql(db.query, [[/^SELECT COUNT/, [[{ total: 2 }]]], [/^SELECT u\.id/, [[
      { primer_nombre: 'Ana', segundo_nombre: null, primer_apellido: 'Paz', segundo_apellido: 'Ruiz', roles_activos: 'APRENDIZ,INVITADO' },
      { primer_nombre: 'Luis', primer_apellido: 'Gil', roles_activos: null },
    ]]]]);
    const res = await api(ADMIN).get('/api/users');
    expect(res.body.total).toBe(2);
    expect(res.body.datos[0]).toMatchObject({ nombre: 'Ana Paz Ruiz', roles: ['APRENDIZ', 'INVITADO'] });
    expect(res.body.datos[1]).toMatchObject({ nombre: 'Luis Gil', roles: [] });
  });
  test('limite > 100 → 400', async () => { expect((await api(ADMIN).get('/api/users?limite=101')).status).toBe(400); });
  test('error de BD → 500 genérico', async () => {
    db.query.mockRejectedValue(new Error('secreto'));
    const res = await api(ADMIN).get('/api/users');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secreto');
  });
});

describe('GET /users/elegibles', () => {
  const run = async (u, qs = '') => {
    mockSql(db.query, [[/^\s*SELECT u\.id/, [[{ primer_nombre: 'A', primer_apellido: 'B', roles_activos: 'CELADOR' }]]]]);
    const res = await api(u).get(`/api/users/elegibles${qs}`);
    return { res, params: db.query.mock.calls[0][1] };
  };
  test('ADMIN: rol objetivo por defecto JEFE_SEGURIDAD', async () => { expect((await run(ADMIN)).params[2]).toBe('JEFE_SEGURIDAD'); });
  test('JEFE: rol objetivo por defecto CELADOR', async () => { expect((await run(JEFE)).params[2]).toBe('CELADOR'); });
  test('?rol explícito tiene prioridad y q filtra; sin q usa "%%"', async () => {
    expect((await run(ADMIN, '?rol=CELADOR&q=x')).params).toEqual(['%x%', '%x%', 'CELADOR']);
    expect((await run(ADMIN)).params.slice(0, 2)).toEqual(['%%', '%%']);
  });
  test('devuelve nombre y roles normalizados', async () => {
    expect((await run(ADMIN)).res.body.datos[0]).toMatchObject({ nombre: 'A B', roles: ['CELADOR'] });
  });
  test('error de BD → 500', async () => {
    db.query.mockRejectedValue(new Error('x'));
    expect((await api(ADMIN).get('/api/users/elegibles')).status).toBe(500);
  });
});

// ═════════════ READ detalle ═════════════
describe('GET /users/:id y /me', () => {
  const datos = ({ usuario = [{ id: 9 }], roles = [{ nombre_rol: 'APRENDIZ' }], aprendiz = [], esInvitado = false } = {}) => mockSql(db.query, [
    [/^SELECT 1 FROM usuario_rol/, [esInvitado ? [{ 1: 1 }] : []]],
    [/^SELECT u\.\*/, [usuario]],
    [/^SELECT r\.nombre_rol/, [roles]],
    [/^SELECT da\.\*/, [aprendiz]],
  ]);
  test('id inválido → 400', async () => { expect((await api(ADMIN).get('/api/users/x')).status).toBe(400); });
  test('CELADOR consultando a alguien que NO es invitado → 403 sin leer el usuario', async () => {
    datos();
    const res = await api(CELADOR).get('/api/users/9');
    expect(res.status).toBe(403);
    expect(sqlsOf(db.query).some((s) => s.startsWith('SELECT u.*'))).toBe(false);
  });
  test('CELADOR consultando a un INVITADO → 200', async () => {
    datos({ esInvitado: true, roles: [{ nombre_rol: 'INVITADO' }] });
    const res = await api(CELADOR).get('/api/users/9');
    expect(res.status).toBe(200);
    expect(res.body.datos.roles).toEqual(['INVITADO']);
  });
  test('CELADOR puede ver su propio perfil en GET /me → 200', async () => {
    datos();
    expect((await api(CELADOR).get('/api/users/me')).status).toBe(200);
  });
  test('usuario inexistente → 404', async () => { datos({ usuario: [] }); expect((await api(ADMIN).get('/api/users/9')).status).toBe(404); });
  test('sin detalle_aprendiz → detalle_aprendiz: null', async () => {
    datos();
    expect((await api(ADMIN).get('/api/users/9')).body.datos).toMatchObject({ id: 9, roles: ['APRENDIZ'], detalle_aprendiz: null });
  });
  test('con detalle_aprendiz', async () => {
    datos({ aprendiz: [{ ficha: '3311989' }] });
    expect((await api(ADMIN).get('/api/users/9')).body.datos.detalle_aprendiz).toEqual({ ficha: '3311989' });
  });
  test('no expone password_hash ni en el SQL ni en la respuesta', async () => {
    datos();
    const res = await api(ADMIN).get('/api/users/9');
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
    expect(sqlsOf(db.query).find((s) => s.startsWith('SELECT u.*'))).not.toContain('password_hash');
  });
});

describe('GET /users/:id/aprendiz', () => {
  test('404 sin detalle', async () => { db.query.mockResolvedValueOnce([[]]); expect((await api(ADMIN).get('/api/users/5/aprendiz')).status).toBe(404); });
  test('200 con detalle', async () => {
    db.query.mockResolvedValueOnce([[{ ficha: 'F' }]]);
    expect((await api(ADMIN).get('/api/users/5/aprendiz')).body).toEqual({ ok: true, datos: { ficha: 'F' } });
  });
  test('id inválido → 400', async () => { expect((await api(ADMIN).get('/api/users/-1/aprendiz')).status).toBe(400); });
});

// ═════════════ UPDATE detalle académico (upsert) ═════════════
describe('PATCH /users/:id/aprendiz y /me/aprendiz', () => {
  const existe = (si) => mockSql(conn.query, [[/^SELECT 1 FROM detalle_aprendiz/, [si ? [{ 1: 1 }] : []]], [/./, [{}]]]);
  const patch = (body = {}, url = '/api/users/me/aprendiz', u = APRENDIZ) => api(u).patch(url).send(body);

  test('sin campos actualizables → 400, sin transacción y conexión liberada', async () => {
    const res = await patch({});
    expect(res.status).toBe(400);
    expect(conn.beginTransaction).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test('existe fila → UPDATE solo con los campos enviados', async () => {
    existe(true);
    expect((await patch({ ficha: '99', direccion: 'Cll 1' })).status).toBe(200);
    expect(sqlsOf(conn.query)).toContain('UPDATE detalle_aprendiz SET ficha = ?, direccion = ? WHERE id_usuario = ?');
    expect(conn.commit).toHaveBeenCalled();
  });
  test('no existe fila → INSERT con id_usuario y NULL en lo no enviado', async () => {
    existe(false);
    await patch({ ficha: '99' });
    const call = conn.query.mock.calls.find(([s]) => s.startsWith('INSERT INTO detalle_aprendiz'));
    expect(call[1][0]).toBe(7);
    expect(call[1][1]).toBeNull();
    expect(call[1]).toContain('99');
  });
  test('/me/aprendiz usa el id del token', async () => {
    existe(true);
    await patch({ ficha: '1' }, '/api/users/me/aprendiz', APRENDIZ);
    expect(conn.query.mock.calls.find(([s]) => s.startsWith('UPDATE detalle_aprendiz'))[1]).toEqual(['1', 7]);
  });
  test('detalle_aprendiz como string JSON se aplana', async () => {
    existe(true);
    await patch({ detalle_aprendiz: JSON.stringify({ ficha: 'J' }) });
    expect(conn.query.mock.calls.find(([s]) => s.startsWith('UPDATE detalle_aprendiz'))[1]).toEqual(['J', 7]);
  });
  test('JSON inválido en detalle_aprendiz se ignora → 400 "sin campos"', async () => {
    expect((await patch({ detalle_aprendiz: '{roto' })).status).toBe(400);
  });
  test('null explícito sí se actualiza (fecha_terminacion: null)', async () => {
    existe(true);
    await patch({ fecha_terminacion: null });
    expect(conn.query.mock.calls.find(([s]) => s.startsWith('UPDATE detalle_aprendiz'))[1]).toEqual([null, 7]);
  });
  test('campos fuera de la lista blanca (id_usuario, estado) se ignoran → 400', async () => {
    expect((await patch({ id_usuario: 1, estado: 0 })).status).toBe(400);
  });
  test('id inválido → 400', async () => { expect((await patch({ ficha: 'a' }, '/api/users/x/aprendiz')).status).toBe(400); });
  test('APRENDIZ no puede editar el detalle de otra cuenta → 403 sin escribir', async () => {
    const res = await patch({ ficha: 'otro' }, '/api/users/8/aprendiz', APRENDIZ);
    expect(res.status).toBe(403);
    expect(conn.query).not.toHaveBeenCalled();
  });
  test('con imagen: se guarda en disco bajo el id del USUARIO editado y su ruta entra al UPDATE', async () => {
    existe(true);
    const res = await api(APRENDIZ).patch('/api/users/me/aprendiz').attach('imagen_url_aprendiz', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    const files = storedFiles();
    expect(files).toHaveLength(1);
    expect(files[0].startsWith('7/')).toBe(true);
    expect(conn.query.mock.calls.find(([s]) => s.startsWith('UPDATE detalle_aprendiz'))[1]).toEqual([files[0], 7]);
    expect(sqlsOf(conn.query).some((s) => s.startsWith('INSERT INTO archivo'))).toBe(true);
  });
  test('detalle_aprendiz enviado como campo multipart (string JSON) funciona', async () => {
    existe(true);
    const res = await api(APRENDIZ).patch('/api/users/me/aprendiz').field('detalle_aprendiz', JSON.stringify({ ficha: 'M' }));
    expect(res.status).toBe(200);
  });
  test('si la BD falla tras guardar la imagen → se elimina el archivo huérfano + rollback', async () => {
    mockSql(conn.query, [[/^INSERT INTO archivo/, [{}]], [/^SELECT 1 FROM detalle_aprendiz/, new Error('db caída')]]);
    const res = await api(APRENDIZ).patch('/api/users/me/aprendiz').attach('imagen_url_aprendiz', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(500);
    expect(storedFiles()).toHaveLength(0);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
  });
  test('archivo .svg → 400 desde multer antes de abrir la BD', async () => {
    const res = await api(APRENDIZ).patch('/api/users/me/aprendiz').attach('imagen_url_aprendiz', Buffer.from('<svg/>'), { filename: 'a.svg', contentType: 'image/svg+xml' });
    expect(res.status).toBe(400);
    expect(db.getConnection).not.toHaveBeenCalled();
  });
});

// ═════════════ UPDATE perfil ═════════════
describe('PATCH /users/me', () => {
  beforeEach(() => conn.query.mockResolvedValue([{}]));
  const patch = (body, u = APRENDIZ) => api(u).patch('/api/users/me').send(body);

  test('INVITADO → 403 por el guard de la ruta, sin tocar la BD', async () => {
    expect((await patch({ primer_nombre: 'X' }, INVITADO)).status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('body vacío → 400', async () => {
    expect((await patch({})).status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('solo campos de usuario: UPDATE usuario + invalida el cupo activo', async () => {
    const res = await patch({ primer_nombre: 'Ana', n_celular: '300' });
    const sqls = sqlsOf(conn.query);
    expect(sqls[0]).toBe('UPDATE usuario SET primer_nombre=?,n_celular=? WHERE id=?');
    expect(conn.query.mock.calls[0][1]).toEqual(['Ana', '300', 7]);
    expect(sqls[1]).toBe('UPDATE auth_vehiculo SET estado=0 WHERE id_usuario=? AND estado=1');
    expect(conn.commit).toHaveBeenCalled();
    expect(res.body).toEqual({ ok: true, mensaje: 'Perfil actualizado.' });
  });
  test('solo correo: UPDATE cuenta, sin UPDATE usuario', async () => {
    await patch({ correo: 'n@n.co' });
    const sqls = sqlsOf(conn.query);
    expect(sqls[0]).toContain('UPDATE cuenta SET correo=?');
    expect(sqls.some((s) => s.startsWith('UPDATE usuario'))).toBe(false);
  });
  test('correo + campos: 3 UPDATE', async () => {
    await patch({ correo: 'n@n.co', primer_apellido: 'Z' }, CELADOR);
    expect(conn.query).toHaveBeenCalledTimes(3);
  });
  test('campos fuera de la lista blanca (numero_documento, estado) se ignoran → 400', async () => {
    expect((await patch({ numero_documento: '1', estado: 0 })).status).toBe(400);
  });
  test('correo duplicado (ER_DUP_ENTRY) → 409', async () => {
    conn.query.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    expect((await patch({ correo: 'dup@x.co' })).status).toBe(409);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test('fallo después de cambiar correo → rollback atómico del perfil y cupo', async () => {
    conn.query.mockResolvedValueOnce([{}]).mockRejectedValueOnce(new Error('fallo usuario'));
    expect((await patch({ correo: 'nuevo@n.co', primer_nombre: 'Ana' })).status).toBe(500);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
  });
});

// ═════════════ UPDATE estado ═════════════
describe('PATCH /users/:id/estado (desactivar / activar)', () => {
  const prepararEstado = ({ usuarios = [{ id: 3 }], roles = [{ nombre_rol: 'APRENDIZ' }] } = {}) => mockSql(conn.query, [
    [/^SELECT u\.id FROM usuario/, [usuarios]],
    [/^SELECT r\.nombre_rol FROM usuario_rol/, [roles]],
    [/^UPDATE usuario SET estado=/, [{ affectedRows: 1 }]],
    [/^UPDATE cuenta SET estado=/, [{ affectedRows: 1 }]],
    [/^UPDATE usuario_rol SET estado=/, [{ affectedRows: 1 }]],
  ]);
  const patch = (estado, id = 3, u = ADMIN) => api(u).patch(`/api/users/${id}/estado`).send({ estado });
  test.each([[2], ['x'], [undefined], [-1]])('estado %p → 400 sin tocar la BD', async (estado) => {
    expect((await patch(estado)).status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
    expect(conn.query).not.toHaveBeenCalled();
  });
  test.each([[0, '0'], [1, '1'], [1, 1]])('estado %p (enviado %p) sincroniza usuario, cuenta y rol', async (estado, enviado) => {
    prepararEstado();
    const res = await patch(enviado);
    expect(conn.query.mock.calls.find(([sql]) => /^UPDATE usuario SET estado=/.test(sql))[1]).toEqual([estado, 3]);
    expect(conn.query.mock.calls.find(([sql]) => /^UPDATE cuenta SET estado=/.test(sql))[1]).toEqual([estado, 3]);
    const rol = conn.query.mock.calls.find(([sql]) => /^UPDATE usuario_rol SET estado=/.test(sql));
    expect(rol?.[1]).toEqual(estado === 0 ? [3] : [3, 'APRENDIZ']);
    expect(res.body).toEqual({ ok: true, mensaje: 'Estado actualizado.' });
    expect(conn.commit).toHaveBeenCalled();
  });
  test('usuario inexistente → 404', async () => {
    prepararEstado({ usuarios: [] });
    expect((await patch(0)).status).toBe(404);
    expect(conn.rollback).toHaveBeenCalled();
  });
  test('id inválido → 400', async () => { expect((await patch(0, 0)).status).toBe(400); });
  test('cada usuario puede desactivar su propia cuenta; sincroniza usuario, cuenta y roles', async () => {
    prepararEstado({ usuarios: [{ id: 7 }], roles: [{ nombre_rol: 'APRENDIZ' }] });
    const res = await api(APRENDIZ).patch('/api/users/me/estado').send({ estado: 0 });
    expect(res.status).toBe(200);
    expect(conn.query.mock.calls.find(([sql]) => /^UPDATE usuario_rol SET estado=/.test(sql))[1]).toEqual([7]);
    expect(conn.commit).toHaveBeenCalled();
  });
  test('JEFE no puede reactivar invitados → 403', async () => {
    prepararEstado({ roles: [{ nombre_rol: 'INVITADO' }] });
    expect((await patch(1, 9, JEFE)).status).toBe(403);
    expect(conn.query.mock.calls.some(([sql]) => /^UPDATE /.test(sql))).toBe(false);
  });
  test.each([['APRENDIZ', APRENDIZ], ['INVITADO', INVITADO]])('%s no puede reactivar invitados → 403', async (_rol, usuario) => {
    expect((await api(usuario).patch('/api/users/9/estado').send({ estado: 1 })).status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('CELADOR no puede desactivar invitados → 403', async () => {
    prepararEstado({ roles: [{ nombre_rol: 'INVITADO' }] });
    expect((await patch(0, 9, CELADOR)).status).toBe(403);
  });
  test('JEFE no puede desactivar un ADMIN → 403', async () => {
    prepararEstado({ roles: [{ nombre_rol: 'ADMINISTRADOR' }] });
    expect((await patch(0, 1, JEFE)).status).toBe(403);
  });
  test('CELADOR puede reactivar un invitado → 200', async () => {
    prepararEstado({ roles: [{ nombre_rol: 'INVITADO' }] });
    const res = await api(CELADOR).patch('/api/users/9/estado').send({ estado: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, mensaje: 'Estado actualizado.' });
  });
  test('reactivar invitado activa usuario, cuenta y rol y fija vencimiento a seis meses', async () => {
    const inicio = new Date();
    const esperado = new Date(inicio);
    esperado.setMonth(esperado.getMonth() + 6);
    prepararEstado({ roles: [{ nombre_rol: 'INVITADO' }] });
    const res = await api(ADMIN).patch('/api/users/9/estado').send({ estado: 1, expira_en: '2099-01-01' });
    expect(res.status).toBe(200);
    const rol = conn.query.mock.calls.find(([sql]) => /^UPDATE usuario_rol SET estado=/.test(sql));
    expect(rol?.[1]).toEqual([9, 'INVITADO']);
    expect(conn.query.mock.calls.some(([sql, params]) => /^UPDATE usuario SET estado=/.test(sql) && params[0] === 1)).toBe(true);
    const cuenta = conn.query.mock.calls.find(([sql]) => /UPDATE cuenta SET estado=/.test(sql));
    expect(cuenta).toBeDefined();
    const vencimiento = cuenta[1].find((value) => value instanceof Date || (typeof value === 'string' && /^\d{4}-\d\d-\d\d/.test(value)));
    expect(vencimiento).toBeDefined();
    expect(Math.abs(new Date(vencimiento).getTime() - esperado.getTime())).toBeLessThan(3000);
  });
});

// ═════════════ CREATE ═════════════
describe('POST /users/asignar-celador', () => {
  const post = (b) => api(ADMIN).post('/api/users/asignar-celador').send(b);
  test('faltan campos → 400 sin consultar', async () => {
    expect((await post({ id_usuario_celador: 2 })).status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('ids no enteros → 400', async () => { expect((await post({ id_usuario_jefe_seguridad: 'a', id_usuario_celador: 2 })).status).toBe(400); });
  test('éxito → 201 con ids enteros', async () => {
    db.query.mockResolvedValueOnce([{}]);
    const res = await post({ id_usuario_jefe_seguridad: '1', id_usuario_celador: '2' });
    expect(res.status).toBe(201);
    expect(db.query.mock.calls[0][1]).toEqual([1, 2]);
  });
  test('relación duplicada → 409; FK inexistente → 400', async () => {
    db.query.mockRejectedValueOnce(Object.assign(new Error(), { code: 'ER_DUP_ENTRY' }));
    expect((await post({ id_usuario_jefe_seguridad: 1, id_usuario_celador: 2 })).status).toBe(409);
    db.query.mockRejectedValueOnce(Object.assign(new Error(), { code: 'ER_NO_REFERENCED_ROW_2' }));
    expect((await post({ id_usuario_jefe_seguridad: 1, id_usuario_celador: 99 })).status).toBe(400);
  });
});

const nuevoUsuario = { tipo_documento: 'CC', numero_documento: '1', primer_nombre: 'A', primer_apellido: 'B', n_celular: '3', correo: 'a@a.co' };
// Simula el conjunto de tablas que tocan celador/jefe (los SERVICIOS user.service y account.service son los REALES)
const bdAlta = ({ existente = true, privilegiado = [], rol = [{ id: 4 }] } = {}) => mockSql(conn.query, [
  [/FOR UPDATE/, [existente ? [{ id: 9 }] : []]],
  [/^\s*INSERT INTO usuario\s*\n?\s*\(/, [{ insertId: 50 }]],
  [/nombre_rol IN/, [privilegiado]],
  [/^SELECT id FROM rol/, [rol]],
  [/./, [{}]],
]);

describe.each([
  ['/api/users/celador', JEFE, 'CELADOR', 'Celador registrado y asignado.'],
  ['/api/users/jefe', ADMIN, 'JEFE_SEGURIDAD', 'Jefe de seguridad registrado.'],
])('POST %s (CREATE con transacción y servicios reales)', (url, quien, rolAsignado, mensajeOk) => {
  const post = (b) => api(quien).post(url).send(b);

  test.each([['ninguno', {}], ['ambos', { id_usuario: 1, usuario: nuevoUsuario }]])('%s de id_usuario/usuario → 400 y no abre transacción', async (_c, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(conn.beginTransaction).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test('usuario existente inexistente en BD → 404 + rollback', async () => {
    bdAlta({ existente: false });
    const res = await post({ id_usuario: 9 });
    expect(res.status).toBe(404);
    expect(conn.rollback).toHaveBeenCalled();
  });
  test('usuario nuevo con datos incompletos → 400', async () => {
    const { correo, ...incompleto } = nuevoUsuario;
    const res = await post({ usuario: incompleto });
    expect(res.status).toBe(400);
    expect(res.body.mensaje).toContain('correo');
  });
  test.each(['Ab1!', 'abcdefghij1!', 'Abcdefghij!', 'Abcdefghij1'])('contraseña propia que incumple SECSS02-24 → 400 (%s)', async (password) => {
    const res = await post({ usuario: { ...nuevoUsuario, password } });
    expect(res.status).toBe(400);
    expect(conn.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO cuenta'))).toBe(false);
    expect(conn.rollback).toHaveBeenCalled();
  });
  test('usuario nuevo → 201 con credenciales temporales que cumplen la política, cuenta con HASH y rol asignado', async () => {
    bdAlta({ existente: false });
    const res = await post({ usuario: nuevoUsuario });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ mensaje: mensajeOk, id_usuario: 50 });
    expect(res.body.credenciales_temporales).toMatchObject({ correo: 'a@a.co' });
    expect(res.body.credenciales_temporales.password).toMatch(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/);
    const cuenta = conn.query.mock.calls.find(([s]) => s.includes('INSERT INTO cuenta'));
    expect(cuenta[1]).toEqual([50, 'a@a.co', 'NEW_HASH', null]);                // nunca la contraseña en claro
    expect(JSON.stringify(conn.query.mock.calls)).not.toContain(res.body.credenciales_temporales.password);
    expect(conn.query.mock.calls.find(([s]) => s.includes('INSERT INTO usuario_rol'))[1]).toEqual([50, 4]);
    expect(conn.query.mock.calls.find(([s]) => s.startsWith('SELECT id FROM rol'))[1]).toEqual([rolAsignado]);
    expect(conn.commit).toHaveBeenCalled();
  });
  test('usuario nuevo con password propia → se respeta; segundo_nombre vacío → NULL; expira_en se propaga', async () => {
    bdAlta({ existente: false });
    const res = await post({ usuario: { ...nuevoUsuario, password: 'MiClave-2026', segundo_nombre: '', expira_en: '2026-12-31' } });
    expect(res.body.credenciales_temporales.password).toBe('MiClave-2026');
    expect(bcrypt.hash).toHaveBeenCalledWith('MiClave-2026', 12);
    expect(conn.query.mock.calls.find(([s]) => s.includes('INSERT INTO usuario'))[1][3]).toBeNull();
    expect(conn.query.mock.calls.find(([s]) => s.includes('INSERT INTO cuenta'))[1][3]).toBe('2026-12-31');
  });
  test('documento duplicado al crear el usuario → 409 y NO se crea cuenta', async () => {
    mockSql(conn.query, [[/INSERT INTO usuario\s*\n?\s*\(/, Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' })], [/./, [{}]]]);
    const res = await post({ usuario: nuevoUsuario });
    expect(res.status).toBe(409);
    expect(conn.query.mock.calls.some(([s]) => s.includes('INSERT INTO cuenta'))).toBe(false);
    expect(conn.rollback).toHaveBeenCalled();
  });
  test('usuario existente → 201 SIN credenciales_temporales', async () => {
    bdAlta();
    const res = await post({ id_usuario: 9 });
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('credenciales_temporales');
  });
  test('rol inexistente en BD (assignRole) → 400, rollback, sin commit y conexión liberada', async () => {
    bdAlta({ rol: [] });
    const res = await post({ id_usuario: 9 });
    expect(res.status).toBe(400);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test('id_usuario inválido → 400', async () => { expect((await post({ id_usuario: 'x' })).status).toBe(400); });
});

describe('POST /users/celador — reglas propias', () => {
  test.each(['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'APRENDIZ', 'INVITADO'])('no se puede asignar CELADOR a usuario con rol activo %s → 409 + rollback y NO se asigna rol', async (nombre_rol) => {
    bdAlta({ privilegiado: [{ nombre_rol }] });
    const res = await api(JEFE).post('/api/users/celador').send({ id_usuario: 9 });
    expect(res.status).toBe(409);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.query.mock.calls.some(([s]) => s.includes('INSERT INTO usuario_rol'))).toBe(false);
  });
  test('vincula al celador con el jefe del TOKEN (no con uno enviado en el body)', async () => {
    bdAlta();
    await api(JEFE).post('/api/users/celador').send({ id_usuario: 9, id_usuario_jefe_seguridad: 999 });
    expect(conn.query.mock.calls.find(([s]) => s.includes('INSERT INTO jefe_seguridad_celador'))[1]).toEqual([7, 9]);
  });
});

// ═════════════ UPDATE contraseña ═════════════
describe('PATCH /users/me/password', () => {
  const patch = (b, u = APRENDIZ) => api(u).patch('/api/users/me/password').send(b);
  test('faltan campos → 400', async () => { expect((await patch({ password_actual: 'x' })).status).toBe(400); });
  test.each(['Ab1!', 'abcdefghij1!', 'Abcdefghij!', 'Abcdefghij1'])('contraseña que incumple SECSS02-24 → 400 antes de consultar la BD (%s)', async (password_nueva) => {
    expect((await patch({ password_actual: 'x', password_nueva })).status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('SECSS02-24: contraseña válida de 8 caracteres pasa la política y llega a comprobar la clave actual', async () => {
    db.query.mockResolvedValueOnce([[]]);
    expect((await patch({ password_actual: 'x', password_nueva: 'Clave12!' })).status).toBe(401);
    expect(db.query).toHaveBeenCalledTimes(1);
  });
  test('cuenta inexistente → 401 sin comparar', async () => {
    db.query.mockResolvedValueOnce([[]]);
    expect((await patch({ password_actual: 'x', password_nueva: 'ClaveNueva1!' })).status).toBe(401);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
  test('contraseña actual incorrecta → 401 y NO actualiza', async () => {
    db.query.mockResolvedValueOnce([[{ password_hash: 'H' }]]);
    bcrypt.compare.mockResolvedValueOnce(false);
    expect((await patch({ password_actual: 'mala', password_nueva: 'ClaveNueva1!' })).status).toBe(401);
    expect(db.query).toHaveBeenCalledTimes(1);
  });
  test('éxito: hash costo 12, limpia expira_en y filtra por el id del token', async () => {
    db.query.mockResolvedValueOnce([[{ password_hash: 'H' }]]).mockResolvedValueOnce([{}]);
    bcrypt.compare.mockResolvedValueOnce(true);
    const res = await patch({ password_actual: 'ok', password_nueva: 'ClaveNueva1!' });
    expect(bcrypt.hash).toHaveBeenCalledWith('ClaveNueva1!', 12);
    expect(db.query.mock.calls[1]).toEqual(['UPDATE cuenta SET password_hash=?,expira_en=NULL WHERE id_usuario=?', ['NEW_HASH', 7]]);
    expect(res.body).toEqual({ ok: true, mensaje: 'Contraseña actualizada.' });
  });
});

// ═════════════ Pendientes de decisión ═════════════
// Los contratos confirmados se expresan arriba como pruebas DEFECTO visibles para Jest.
