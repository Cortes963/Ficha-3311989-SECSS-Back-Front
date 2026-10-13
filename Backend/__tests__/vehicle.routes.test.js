import request from 'supertest';
import router from '../routes/vehicle.routes.js';
import db from '../db.js';
import { appWith } from './helpers/app.js';
import { freshDb, PNG } from './helpers/db.js';
import { mockSql, sqlsOf } from './helpers/sql.js';
import { storedFiles, clearStorage } from './helpers/storage.js';

jest.mock('../db.js', () => ({ __esModule: true, default: { query: jest.fn(), getConnection: jest.fn() } }));

const user = (...roles) => ({ id: 7, roles });
const api = (u) => request(appWith(router, u, '/api/vehicle'));
const APRENDIZ = user('APRENDIZ'), INVITADO = user('INVITADO');
let conn;
beforeEach(() => { conn = freshDb(db); clearStorage(); jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => console.error.mockRestore());

// ═════════════ Autorización ═════════════
describe('Matriz de autorización de /vehicle', () => {
  const TODOS = ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR', 'APRENDIZ', 'INVITADO'];
  const MATRIZ = [
    ['get', '/api/vehicle/me', ['APRENDIZ', 'INVITADO']],
    ['get', '/api/vehicle/1', ['APRENDIZ', 'INVITADO']],
    ['post', '/api/vehicle', ['APRENDIZ']],                       // el INVITADO NO registra vehículos
    ['patch', '/api/vehicle/1', ['APRENDIZ', 'INVITADO']],
    ['patch', '/api/vehicle/1/inactivar', ['APRENDIZ', 'INVITADO']],
  ];
  const casos = MATRIZ.flatMap(([m, url, ok]) => TODOS.filter((r) => !ok.includes(r)).map((r) => [m, url, r]));
  test.each(casos)('%s %s con rol %s → 403 sin tocar la BD', async (metodo, url, rol) => {
    const res = await api({ id: 1, roles: [rol] })[metodo](url).send({});
    expect(res.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
    expect(db.getConnection).not.toHaveBeenCalled();
  });
});

// ═════════════ READ ═════════════
describe('GET /vehicle/me', () => {
  test('MOTO y BICICLETA se normalizan con detalle distinto; filtra por el dueño del token', async () => {
    db.query.mockResolvedValueOnce([[
      { id: 1, tipo_vehiculo: 'MOTO', placa: 'ABC12D', cilindraje: 150 },
      { id: 2, tipo_vehiculo: 'BICICLETA', numero_marco: 'M1' },
    ]]);
    const res = await api(APRENDIZ).get('/api/vehicle/me');
    expect(res.status).toBe(200);
    expect(res.body.datos[0].detalles).toMatchObject({ placa: 'ABC12D', cilindraje: 150, modelo: null });
    expect(res.body.datos[1].detalles).toEqual({ numero_marco: 'M1', clase_bicicleta: null });
    expect(res.body.datos[0].imagenes).toHaveProperty('imagen_url_vehiculo', null);
    expect(db.query.mock.calls[0][1]).toEqual([7]);
  });
  test('token con id inválido → 400 sin consultar', async () => {
    const res = await api({ id: 'x', roles: ['APRENDIZ'] }).get('/api/vehicle/me');
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('falla la BD → 500 genérico', async () => {
    db.query.mockRejectedValueOnce(new Error('secreto'));
    const res = await api(APRENDIZ).get('/api/vehicle/me');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secreto');
  });
});

describe('GET /vehicle/:id', () => {
  test('id no numérico → 400', async () => { expect((await api(APRENDIZ).get('/api/vehicle/abc')).status).toBe(400); });
  test('id con inyección SQL → 400, nunca llega a la query', async () => {
    expect((await api(APRENDIZ).get('/api/vehicle/1%20OR%201=1')).status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('vehículo ajeno o inexistente → 404 (la query exige dueño = token)', async () => {
    db.query.mockResolvedValueOnce([[]]);
    expect((await api(APRENDIZ).get('/api/vehicle/9')).status).toBe(404);
    expect(db.query.mock.calls[0][1]).toEqual([7, 9]);
  });
  test('existe → 200', async () => {
    db.query.mockResolvedValueOnce([[{ id: 9, tipo_vehiculo: 'BICICLETA' }]]);
    const res = await api(APRENDIZ).get('/api/vehicle/9');
    expect(res.body).toMatchObject({ ok: true, datos: { id: 9 } });
  });
});

// ═════════════ CREATE ═════════════
describe('POST /vehicle', () => {
  const moto = { tipo_vehiculo: 'moto', marca: 'Yamaha', color: 'Negro', placa: 'ABC12D', cilindraje: 150, modelo: 2022 };
  const bdOk = () => mockSql(conn.query, [
    [/INSERT INTO vehiculo/, [{ insertId: 55 }]], [/./, [{}]],
  ]);
  const post = (body) => api(APRENDIZ).post('/api/vehicle').send(body);

  test('MOTO válida → 201, tipo en mayúsculas, desactiva cupo previo, crea cupo PENDIENTE (estado 0)', async () => {
    bdOk();
    const res = await post(moto);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, id_vehiculo: 55 });
    const sqls = sqlsOf(conn.query);
    expect(sqls[0]).toBe('UPDATE auth_vehiculo SET estado = 0 WHERE id_usuario = ? AND estado = 1');
    expect(conn.query.mock.calls.find(([s]) => s.includes('INSERT INTO vehiculo'))[1][0]).toBe('MOTO');
    expect(sqls.some((s) => s.startsWith('INSERT INTO detalle_moto'))).toBe(true);
    expect(sqls.find((s) => s.includes('INSERT INTO auth_vehiculo'))).toContain('VALUES (?, ?, 0, NULL)');
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });
  test('BICICLETA con alias camelCase (numeroMarco / tipoBicicleta) → 201', async () => {
    bdOk();
    const res = await post({ tipo_vehiculo: 'BICICLETA', marca: 'GW', color: 'Rojo', numeroMarco: 'M-1', tipoBicicleta: 'MTB' });
    expect(res.status).toBe(201);
    expect(conn.query.mock.calls.find(([s]) => s.includes('INSERT INTO detalle_bicicleta'))[1].slice(1)).toEqual(['M-1', 'MTB']);
  });
  test('placa_moto es alias de placa', async () => {
    bdOk();
    const { placa, ...sin } = moto;
    await post({ ...sin, placa_moto: 'XYZ99A' });
    expect(conn.query.mock.calls.find(([s]) => s.includes('INSERT INTO detalle_moto'))[1][1]).toBe('XYZ99A');
  });
  test.each([
    ['detalles (objeto)', (m) => { const { placa, cilindraje, modelo, ...b } = m; return { ...b, detalles: { placa: 'A1', cilindraje: 1, modelo: 2 } }; }],
    ['detalles (string JSON)', (m) => { const { placa, cilindraje, modelo, ...b } = m; return { ...b, detalles: JSON.stringify({ placa: 'A1', cilindraje: 1, modelo: 2 }) }; }],
    ['detalle_moto (string JSON)', (m) => { const { placa, cilindraje, modelo, ...b } = m; return { ...b, detalle_moto: JSON.stringify({ placa: 'A1', cilindraje: 1, modelo: 2 }) }; }],
  ])('datos de la moto anidados en %s se aplanan → 201', async (_n, armar) => {
    bdOk();
    expect((await post(armar(moto))).status).toBe(201);
  });
  test('JSON malformado en "detalles" se ignora → falla por campos de moto faltantes (400 + rollback)', async () => {
    bdOk();
    const { placa, cilindraje, modelo, ...b } = moto;
    const res = await post({ ...b, detalles: '{roto' });
    expect(res.status).toBe(400);
    expect(conn.rollback).toHaveBeenCalled();
  });
  test.each([
    ['sin marca', { tipo_vehiculo: 'MOTO', color: 'x' }, 'marca'],
    ['sin tipo_vehiculo', { marca: 'x', color: 'y' }, 'tipo_vehiculo'],
    ['sin color', { tipo_vehiculo: 'MOTO', marca: 'x' }, 'color'],
  ])('%s → 400 y NO abre transacción', async (_n, body, campo) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(res.body.mensaje).toContain(campo);
    expect(conn.beginTransaction).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test('tipo fuera del catálogo (CARRO) → 400', async () => {
    const res = await post({ tipo_vehiculo: 'CARRO', marca: 'x', color: 'y' });
    expect(res.status).toBe(400);
    expect(res.body.mensaje).toMatch(/MOTO o BICICLETA/);
  });
  test('MOTO sin placa → 400, rollback, sin commit y conexión liberada', async () => {
    bdOk();
    const { placa, ...sin } = moto;
    const res = await post(sin);
    expect(res.status).toBe(400);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test('BICICLETA sin numero_marco → 400', async () => {
    bdOk();
    expect((await post({ tipo_vehiculo: 'BICICLETA', marca: 'x', color: 'y', clase_bicicleta: 'MTB' })).status).toBe(400);
  });
  test('placa duplicada (ER_DUP_ENTRY) → 409 + rollback', async () => {
    mockSql(conn.query, [[/INSERT INTO vehiculo/, [{ insertId: 1 }]], [/INSERT INTO detalle_moto/, Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' })], [/./, [{}]]]);
    const res = await post(moto);
    expect(res.status).toBe(409);
    expect(conn.rollback).toHaveBeenCalled();
  });
  test('con imágenes (multipart): se guardan en disco bajo el id del dueño y se registran en "archivo"', async () => {
    bdOk();
    const res = await api(APRENDIZ).post('/api/vehicle')
      .field('tipo_vehiculo', 'MOTO').field('marca', 'Honda').field('color', 'Azul')
      .field('placa', 'ABC12D').field('cilindraje', '150').field('modelo', '2022')
      .attach('imagen_url_vehiculo', PNG, { filename: 'v.png', contentType: 'image/png' })
      .attach('imagen_url_soat', PNG, { filename: 's.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    const files = storedFiles();
    expect(files).toHaveLength(2);
    expect(files.every((f) => f.startsWith('7/'))).toBe(true);
    expect(sqlsOf(conn.query).filter((s) => s.startsWith('INSERT INTO archivo'))).toHaveLength(2);
    const veh = conn.query.mock.calls.find(([s]) => s.includes('INSERT INTO vehiculo'))[1];
    expect(files).toContain(veh[5]);                              // imagen_url_vehiculo apunta al archivo guardado
  });
  test('si falla la BD después de guardar imágenes → el archivo huérfano SE ELIMINA del disco', async () => {
    mockSql(conn.query, [[/INSERT INTO archivo/, [{}]], [/INSERT INTO vehiculo/, new Error('db caída')], [/./, [{}]]]);
    const res = await api(APRENDIZ).post('/api/vehicle')
      .field('tipo_vehiculo', 'MOTO').field('marca', 'Honda').field('color', 'Azul')
      .attach('imagen_url_vehiculo', PNG, { filename: 'v.png', contentType: 'image/png' });
    expect(res.status).toBe(500);
    expect(storedFiles()).toHaveLength(0);
  });
  test('archivo .exe → 400 desde multer antes de abrir transacción', async () => {
    const res = await api(APRENDIZ).post('/api/vehicle').attach('imagen_url_vehiculo', Buffer.from('MZ'), { filename: 'virus.exe', contentType: 'application/octet-stream' });
    expect(res.status).toBe(400);
    expect(res.body.mensaje).toMatch(/JPG, PNG o WEBP/);
    expect(db.getConnection).not.toHaveBeenCalled();
  });
  test('mime image/png con extensión .exe también se rechaza', async () => {
    const res = await api(APRENDIZ).post('/api/vehicle').attach('imagen_url_vehiculo', PNG, { filename: 'a.exe', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });
  test('campo de archivo no declarado → 400 (multer solo acepta los campos listados)', async () => {
    const res = await api(APRENDIZ).post('/api/vehicle').attach('otro_campo', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });
  test('el dueño es SIEMPRE el del token aunque el body intente otro id_usuario', async () => {
    bdOk();
    await post({ ...moto, id_usuario: 999 });
    expect(conn.query.mock.calls[0][1]).toEqual([7]);
  });
});

// ═════════════ UPDATE ═════════════
describe('PATCH /vehicle/:id', () => {
  const dueno = (tipo, { detalle = true } = {}) => mockSql(conn.query, [
    [/^SELECT v\.tipo_vehiculo/, [tipo ? [{ tipo_vehiculo: tipo }] : []]],
    [/^SELECT 1 FROM detalle_/, [detalle ? [{ 1: 1 }] : []]],
    [/./, [{}]],
  ]);
  const patch = (body = {}, id = 1) => api(APRENDIZ).patch(`/api/vehicle/${id}`).send(body);

  test('id inválido → 400', async () => { expect((await patch({}, 0)).status).toBe(400); });
  test('vehículo ajeno / inexistente → 404 sin transacción y con la conexión liberada', async () => {
    dueno(null);
    const res = await patch({ marca: 'x' });
    expect(res.status).toBe(404);
    expect(conn.beginTransaction).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test('MOTO con detalle existente: UPDATE vehiculo + UPDATE detalle_moto y el cupo vuelve a PENDIENTE', async () => {
    dueno('MOTO');
    const res = await patch({ marca: 'Honda', placa: 'NEW01A' });
    expect(res.status).toBe(200);
    const sqls = sqlsOf(conn.query);
    expect(sqls).toContain('UPDATE vehiculo SET marca = ? WHERE id = ?');
    expect(sqls).toContain('UPDATE detalle_moto SET placa = ? WHERE id_vehiculo = ?');
    expect(sqls[sqls.length - 1]).toBe('UPDATE auth_vehiculo SET estado = 0 WHERE id_usuario = ? AND id_vehiculo = ?');
    expect(conn.commit).toHaveBeenCalled();
  });
  test('MOTO sin fila en detalle_moto → INSERT en lugar de UPDATE', async () => {
    dueno('MOTO', { detalle: false });
    await patch({ placa: 'ZZZ00Z' });
    expect(sqlsOf(conn.query).some((s) => s.startsWith('INSERT INTO detalle_moto'))).toBe(true);
  });
  test('BICICLETA con detalle existente (acepta alias numeroMarco)', async () => {
    dueno('BICICLETA');
    await patch({ numeroMarco: 'M-9' });
    expect(sqlsOf(conn.query)).toContain('UPDATE detalle_bicicleta SET numero_marco = ? WHERE id_vehiculo = ?');
  });
  test('BICICLETA sin fila de detalle → INSERT', async () => {
    dueno('BICICLETA', { detalle: false });
    await patch({ clase_bicicleta: 'RUTA' });
    expect(sqlsOf(conn.query).some((s) => s.startsWith('INSERT INTO detalle_bicicleta'))).toBe(true);
  });
  test('body vacío: no emite UPDATEs de campos, solo reabre la revisión del cupo', async () => {
    dueno('MOTO');
    const res = await patch({});
    expect(res.status).toBe(200);
    expect(sqlsOf(conn.query)).toHaveLength(2);                   // ownership + UPDATE auth_vehiculo
  });
  test('campos fuera de la lista blanca (tipo_vehiculo, estado) se ignoran', async () => {
    dueno('MOTO');
    await patch({ tipo_vehiculo: 'BICICLETA', estado: 0 });
    expect(sqlsOf(conn.query).some((s) => s.startsWith('UPDATE vehiculo'))).toBe(false);
  });
  test('el INVITADO también puede editar su vehículo', async () => {
    dueno('BICICLETA');
    expect((await api(INVITADO).patch('/api/vehicle/1').send({ color: 'Verde' })).status).toBe(200);
  });
  test('con imagen nueva: se guarda y su ruta entra al UPDATE', async () => {
    dueno('MOTO');
    const res = await api(APRENDIZ).patch('/api/vehicle/1').attach('imagen_url_vehiculo', PNG, { filename: 'n.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    const upd = conn.query.mock.calls.find(([s]) => s.startsWith('UPDATE vehiculo SET imagen_url_vehiculo'));
    expect(storedFiles()).toContain(upd[1][0]);
  });
  test('si falla la BD tras guardar la imagen → se elimina el archivo y hay rollback', async () => {
    mockSql(conn.query, [[/^INSERT INTO archivo/, [{}]], [/^SELECT v\.tipo_vehiculo/, [[{ tipo_vehiculo: 'MOTO' }]]], [/^UPDATE vehiculo/, new Error('x')], [/./, [{}]]]);
    const res = await api(APRENDIZ).patch('/api/vehicle/1').attach('imagen_url_vehiculo', PNG, { filename: 'n.png', contentType: 'image/png' });
    expect(res.status).toBe(500);
    expect(storedFiles()).toHaveLength(0);
    expect(conn.rollback).toHaveBeenCalled();
  });
});

// ═════════════ DELETE lógico ═════════════
describe('PATCH /vehicle/:id/inactivar', () => {
  test('activo → 200 y el SQL exige estado = 1 y dueño', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await api(APRENDIZ).patch('/api/vehicle/4/inactivar');
    expect(res.body).toEqual({ ok: true, mensaje: 'Vehículo inactivado.' });
    expect(sqlsOf(db.query)[0]).toContain('AND estado = 1');
    expect(db.query.mock.calls[0][1]).toEqual([7, 4]);
  });
  test('ya inactivo → 404 (regresión: antes devolvía 200 dos veces)', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    expect((await api(APRENDIZ).patch('/api/vehicle/4/inactivar')).status).toBe(404);
  });
  test('id inválido → 400 sin tocar la BD', async () => {
    expect((await api(APRENDIZ).patch('/api/vehicle/x/inactivar')).status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('flujo encadenado: inactivar dos veces → 200 y luego 404', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([{ affectedRows: 0 }]);
    const app = api(APRENDIZ);
    expect((await app.patch('/api/vehicle/4/inactivar')).status).toBe(200);
    expect((await app.patch('/api/vehicle/4/inactivar')).status).toBe(404);
  });
});
