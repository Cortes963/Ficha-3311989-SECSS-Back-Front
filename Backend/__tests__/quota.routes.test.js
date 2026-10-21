import request from 'supertest';
import router from '../routes/quota.routes.js';
import db from '../db.js';
import { appWith } from './helpers/app.js';
import { freshDb } from './helpers/db.js';
import { mockSql, sqlsOf } from './helpers/sql.js';

jest.mock('../db.js', () => ({ __esModule: true, default: { query: jest.fn(), getConnection: jest.fn() } }));

const as = (...roles) => ({ id: 7, roles });
const ADMIN = as('ADMINISTRADOR'), JEFE = as('JEFE_SEGURIDAD'), CELADOR = as('CELADOR'), APRENDIZ = as('APRENDIZ'), INVITADO = as('INVITADO');
const api = (u) => request(appWith(router, u, '/api/quota'));
beforeEach(() => { freshDb(db); jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => console.error.mockRestore());

describe('Matriz de autorización de /quota', () => {
  const TODOS = ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR', 'APRENDIZ', 'INVITADO'];
  const MATRIZ = [
    ['get', '/api/quota', ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR']],
    ['get', '/api/quota/me', TODOS],
    ['patch', '/api/quota/9/2', ['ADMINISTRADOR']],
  ];
  const casos = MATRIZ.flatMap(([m, url, ok]) => TODOS.filter((r) => !ok.includes(r)).map((r) => [m, url, r]));
  test.each(casos)('%s %s con rol %s → 403', async (m, url, rol) => {
    const res = await api({ id: 1, roles: [rol] })[m](url).send({ estado: 1 });
    expect(res.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('GET /quota (lista)', () => {
  test('pagina, calcula offset y traduce estado 0/1 a texto (valores desconocidos pasan tal cual)', async () => {
    mockSql(db.query, [[/^SELECT COUNT/, [[{ total: 3 }]]], [/^SELECT av\.id_usuario/, [[{ estado: 0 }, { estado: 1 }, { estado: 9, tipo_vehiculo: 'MOTO', identificador_vehiculo: 'X' }]]]]);
    const res = await api(ADMIN).get('/api/quota?pagina=2&limite=5');
    expect(res.status).toBe(200);
    expect(db.query.mock.calls[1][1]).toEqual([5, 5]);
    expect(res.body.total).toBe(3);
    expect(res.body.datos.map((d) => d.estado_autorizacion)).toEqual(['INACTIVO', 'ACTIVO', 9]);
    expect(res.body.datos[2]).toMatchObject({ vehiculo: 'MOTO', identificador: 'X' });
  });
  test('limite > 100 → 400', async () => { expect((await api(JEFE).get('/api/quota?limite=500')).status).toBe(400); });
  test('falla la BD → 500', async () => {
    db.query.mockRejectedValueOnce(new Error('x'));
    expect((await api(CELADOR).get('/api/quota')).status).toBe(500);
  });
});

describe('GET /quota/usuario/:idUsuario — acceso horizontal (IDOR)', () => {
  test('APRENDIZ consultando a OTRO usuario → 403 sin consultar', async () => {
    const res = await api(APRENDIZ).get('/api/quota/usuario/99');
    expect(res.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('APRENDIZ consultando su propio cupo sin vehículo → vehiculo null', async () => {
    db.query.mockResolvedValueOnce([[]]);
    const res = await api(APRENDIZ).get('/api/quota/usuario/7');
    expect(res.body).toEqual({ ok: true, vehiculo: null, vehiculoEnParqueadero: false, idEntradaAbierta: null });
  });
  test.each([['ADMINISTRADOR', ADMIN], ['JEFE_SEGURIDAD', JEFE], ['CELADOR', CELADOR]])('%s puede consultar a cualquiera', async (_n, u) => {
    db.query.mockResolvedValueOnce([[]]);
    expect((await api(u).get('/api/quota/usuario/99')).status).toBe(200);
  });
  test('vehículo dentro del parqueadero (entrada sin salida)', async () => {
    mockSql(db.query, [[/FROM auth_vehiculo av/, [[{ id_vehiculo: 4 }]]], [/FROM entrada_salida/, [[{ id: 70 }]]]]);
    const res = await api(APRENDIZ).get('/api/quota/usuario/7');
    expect(res.body).toMatchObject({ vehiculoEnParqueadero: true, idEntradaAbierta: 70 });
  });
  test('vehículo fuera del parqueadero', async () => {
    mockSql(db.query, [[/FROM auth_vehiculo av/, [[{ id_vehiculo: 4 }]]], [/FROM entrada_salida/, [[]]]]);
    const res = await api(APRENDIZ).get('/api/quota/usuario/7');
    expect(res.body).toMatchObject({ vehiculoEnParqueadero: false, idEntradaAbierta: null });
  });
  test('idUsuario inválido → 400', async () => { expect((await api(ADMIN).get('/api/quota/usuario/x')).status).toBe(400); });
});

describe('GET /quota/me', () => {
  test('usa el id del token (req.params.idUsuario se reasigna dentro del handler)', async () => {
    db.query.mockResolvedValueOnce([[]]);
    const res = await api(INVITADO).get('/api/quota/me');
    expect(res.status).toBe(200);
    expect(db.query.mock.calls[0][1]).toEqual([7]);
  });
});

describe('GET /quota/detalle/:idUsuario/:idVehiculo', () => {
  const montar = (rows, abiertas = []) => mockSql(db.query, [[/^SELECT av\.id_usuario,av\.id_vehiculo,av\.estado,/, [rows]], [/FROM entrada_salida/, [abiertas]]]);
  test('ajeno sin privilegio → 403', async () => { expect((await api(INVITADO).get('/api/quota/detalle/9/1')).status).toBe(403); });
  test('ids inválidos → 400', async () => {
    expect((await api(ADMIN).get('/api/quota/detalle/x/1')).status).toBe(400);
    expect((await api(ADMIN).get('/api/quota/detalle/1/0')).status).toBe(400);
  });
  test('no existe → 404', async () => { montar([]); expect((await api(APRENDIZ).get('/api/quota/detalle/7/1')).status).toBe(404); });
  test('existe con entrada abierta → ACTIVO + idEntradaAbierta', async () => {
    montar([{ estado: 1 }], [{ id: 3 }]);
    const res = await api(APRENDIZ).get('/api/quota/detalle/7/1');
    expect(res.body.datos).toMatchObject({ estado_autorizacion: 'ACTIVO', idEntradaAbierta: 3 });
  });
  test('existe sin entrada abierta → INACTIVO + null', async () => {
    montar([{ estado: 0 }]);
    const res = await api(ADMIN).get('/api/quota/detalle/7/1');
    expect(res.body.datos).toMatchObject({ estado_autorizacion: 'INACTIVO', idEntradaAbierta: null });
  });
});

describe('PATCH /quota/:idUsuario/:idVehiculo (solo ADMIN)', () => {
  const patch = (estado) => api(ADMIN).patch('/api/quota/7/2').send({ estado });
  test.each([[2], ['x'], [undefined], [-1]])('estado %p → 400 sin tocar la BD', async (estado) => {
    expect((await patch(estado)).status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('ids inválidos → 400', async () => { expect((await api(ADMIN).patch('/api/quota/x/2').send({ estado: 1 })).status).toBe(400); });
  test('habilitar (1) actualiza el cupo y audita al admin; después desactiva los demás (regla: 1 cupo activo)', async () => {
    db.query.mockResolvedValue([{ affectedRows: 1 }]);
    const res = await patch(1);
    expect(res.body.mensaje).toBe('Cupo habilitado.');
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(db.query.mock.calls[0][1]).toEqual([1, 7, 7, 2]);      // estado, admin(token), usuario, vehículo
    expect(sqlsOf(db.query)[1]).toContain('id_vehiculo<>?');
    expect(db.query.mock.calls[1][1]).toEqual([7, 2]);            // usuario, vehículo que se conserva
  });
  test('deshabilitar (0) hace una sola query', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await patch(0);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(res.body.mensaje).toBe('Cupo deshabilitado.');
  });
  test('estado enviado como string "1" se acepta', async () => {
    db.query.mockResolvedValue([{ affectedRows: 1 }]);
    expect((await patch('1')).status).toBe(200);
  });
  test('cupo inexistente → 404', async () => {
    mockSql(db.query, [
      [/^UPDATE auth_vehiculo SET estado=/, [{ affectedRows: 0 }]],
      [/^SELECT 1 FROM auth_vehiculo/, [[]]],
    ]);
    expect((await patch(0)).status).toBe(404);
  });
  test('cupo existente sin cambios → sigue siendo éxito y conserva la auditoría', async () => {
    mockSql(db.query, [
      [/^UPDATE auth_vehiculo SET estado=/, [{ affectedRows: 0 }]],
      [/^SELECT 1 FROM auth_vehiculo/, [[{ 1: 1 }]]],
    ]);
    const res = await patch(0);
    expect(res.status).toBe(200);
    expect(res.body.mensaje).toBe('Cupo deshabilitado.');
    expect(db.query.mock.calls[0][1]).toEqual([0, 7, 7, 2]);
    expect(db.query.mock.calls[1][1]).toEqual([7, 2]);
  });
  test('cupo inexistente con estado=1 → 404 y NO desactiva los otros cupos del usuario (defecto corregido)', async () => {
    mockSql(db.query, [
      [/^UPDATE auth_vehiculo SET estado=/, [{ affectedRows: 0 }]],
      [/^SELECT 1 FROM auth_vehiculo/, [[]]],
    ]);
    expect((await patch(1)).status).toBe(404);
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(sqlsOf(db.query).some((sql) => sql.startsWith('UPDATE auth_vehiculo SET estado=0'))).toBe(false);
  });
  
  test('falla la BD al actualizar → 500', async () => {
    db.query.mockRejectedValueOnce(new Error('x'));
    expect((await patch(1)).status).toBe(500);
  });
});