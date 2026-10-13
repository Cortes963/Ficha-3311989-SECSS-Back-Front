import request from 'supertest';
import router from '../routes/input_output.routes.js';
import db from '../db.js';
import { appWith } from './helpers/app.js';
import { freshDb, PNG } from './helpers/db.js';
import { mockSql, sqlsOf } from './helpers/sql.js';
import { storedFiles, clearStorage } from './helpers/storage.js';

jest.mock('../db.js', () => ({ __esModule: true, default: { query: jest.fn(), getConnection: jest.fn() } }));
jest.mock('bcryptjs', () => ({ __esModule: true, default: { compare: jest.fn(), hash: jest.fn().mockResolvedValue('HASH') } }));

const as = (...roles) => ({ id: 7, roles });
const ADMIN = as('ADMINISTRADOR'), JEFE = as('JEFE_SEGURIDAD'), CELADOR = as('CELADOR'), APRENDIZ = as('APRENDIZ'), INVITADO = as('INVITADO');
const api = (u) => request(appWith(router, u, '/api/input_output'));
let conn;
beforeEach(() => { conn = freshDb(db); clearStorage(); jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => console.error.mockRestore());

const FUTURO = new Date(Date.now() + 24 * 3600e3).toISOString();
const PASADO = new Date(Date.now() - 24 * 3600e3).toISOString();

//  Autorización 
describe('Matriz de autorización de /input_output', () => {
  const TODOS = ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR', 'APRENDIZ', 'INVITADO'];
  const MATRIZ = [
    ['get', '/api/input_output/me', ['INVITADO', 'APRENDIZ']],
    ['post', '/api/input_output/invitado', ['CELADOR']],
    ['get', '/api/input_output', ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR']],
    ['get', '/api/input_output/5', ['INVITADO', 'APRENDIZ', 'CELADOR', 'JEFE_SEGURIDAD']],   // ADMIN no está
    ['post', '/api/input_output/entrada', ['CELADOR']],
    ['patch', '/api/input_output/salida/5', ['CELADOR']],
  ];
  const casos = MATRIZ.flatMap(([m, url, ok]) => TODOS.filter((r) => !ok.includes(r)).map((r) => [m, url, r]));
  test.each(casos)('%s %s con rol %s → 403 sin tocar la BD', async (metodo, url, rol) => {
    const res = await api({ id: 7, roles: [rol] })[metodo](url).send({});
    expect(res.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
    expect(db.getConnection).not.toHaveBeenCalled();
  });
});

// READ lista 
describe('GET /input_output (lista con filtros)', () => {
  const lista = (filas = []) => mockSql(db.query, [[/^SELECT COUNT/, [[{ total: filas.length }]]], [/^\s*SELECT es\.id AS registro_id/, [filas]]]);

  test('sin filtros: sin WHERE y params [limite, offset]', async () => {
    lista();
    const res = await api(CELADOR).get('/api/input_output');
    expect(res.status).toBe(200);
    expect(sqlsOf(db.query)[0]).not.toContain('WHERE');
    expect(db.query.mock.calls[1][1]).toEqual([20, 0]);
  });
  test('filtros id_usuario + id_vehiculo + estado=DENTRO se combinan con AND', async () => {
    lista();
    await api(ADMIN).get('/api/input_output?id_usuario=3&id_vehiculo=4&estado=DENTRO&pagina=2&limite=10');
    const sql = sqlsOf(db.query)[0];
    expect(sql).toContain('WHERE es.id_usuario_entra=? AND es.id_vehiculo=? AND es.fecha_hora_salida IS NULL');
    expect(db.query.mock.calls[0][1]).toEqual([3, 4]);
    expect(db.query.mock.calls[1][1]).toEqual([3, 4, 10, 10]);
  });
  test('estado=FUERA → fecha_hora_salida IS NOT NULL; otro valor de estado se ignora', async () => {
    lista();
    await api(JEFE).get('/api/input_output?estado=FUERA');
    expect(sqlsOf(db.query)[0]).toContain('es.fecha_hora_salida IS NOT NULL');
    lista();
    await api(JEFE).get('/api/input_output?estado=CUALQUIERA');
    expect(sqlsOf(db.query).pop()).not.toContain('WHERE');
  });
  test.each([['id_usuario=x'], ['id_vehiculo=0'], ['pagina=0'], ['limite=101']])('parámetro inválido %s → 400', async (qs) => {
    expect((await api(ADMIN).get(`/api/input_output?${qs}`)).status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('normaliza los alias de salida (id, persona, documento, fecha_ingreso, celadores…)', async () => {
    lista([{ registro_id: 9, persona_ingresa: 'Ana Paz', documento_persona: '123', fecha_hora_ingreso: 'I', fecha_hora_salida: null, celador_ingreso: 'C1', celador_salida: null, placa: '', numero_marco: 'M1' }]);
    const res = await api(ADMIN).get('/api/input_output');
    expect(res.body.datos[0]).toMatchObject({ id: 9, persona: 'Ana Paz', documento: '123', fecha_ingreso: 'I', fecha_salida: null, celador_ingreso_nombre: 'C1', celador_salida_nombre: null, placa: null, numero_marco: 'M1' });
    expect(res.body.total).toBe(1);
  });
  test('error de BD → 500 genérico', async () => {
    db.query.mockRejectedValue(new Error('secreto'));
    const res = await api(ADMIN).get('/api/input_output');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secreto');
  });
});

describe('GET /input_output/me', () => {
  const lista = () => mockSql(db.query, [[/^SELECT COUNT/, [[{ total: 0 }]]], [/^\s*SELECT es\.id/, [[]]]]);
  test.each([['APRENDIZ', APRENDIZ], ['INVITADO', INVITADO]])('%s solo ve SUS registros (filtro por el id del token, una sola vez)', async (_n, u) => {
    lista();
    const res = await api(u).get('/api/input_output/me');
    expect(res.status).toBe(200);
    expect(db.query.mock.calls[0][1]).toEqual([7]);
    expect(sqlsOf(db.query)[0].match(/es\.id_usuario_entra=\?/g)).toHaveLength(1);
  });
  test('/me no es capturada por /:id', async () => {
    lista();
    expect((await api(APRENDIZ).get('/api/input_output/me')).status).toBe(200);
  });
  test('un id_usuario enviado por query NO permite ver registros de otro (/me ignora ?id_usuario)', async () => {
    lista();
    await api(APRENDIZ).get('/api/input_output/me?id_usuario=99');
    expect(db.query.mock.calls[0][1]).toEqual([7, 99]);           // ownOnly + filtro explícito: el AND deja el resultado vacío
    expect(sqlsOf(db.query)[0]).toContain('es.id_usuario_entra=? AND es.id_usuario_entra=?');
  });
  // HALLAZGO: en Express 5 req.query es un getter; "req.query.id_usuario = actorId(req)" se pierde.
  // Un usuario con APRENDIZ + CELADOR escapa de ownOnly y ve TODOS los registros en /me.
  test.failing('usuario con roles APRENDIZ+CELADOR debería ver solo lo suyo en /me (hoy ve todo)', async () => {
    lista();
    await api({ id: 7, roles: ['APRENDIZ', 'CELADOR'] }).get('/api/input_output/me');
    expect(db.query.mock.calls[0][1]).toEqual([7]);
  });
});

// READ uno 
describe('GET /input_output/:id', () => {
  const fila = (idUsuario = 7) => mockSql(db.query, [[/^SELECT es\.id AS registro_id/, [[{ registro_id: 5, id_usuario_entra: idUsuario }]]]]);
  test('id inválido → 400', async () => { expect((await api(JEFE).get('/api/input_output/x')).status).toBe(400); });
  test('no existe → 404', async () => {
    mockSql(db.query, [[/^SELECT es\./, [[]]]]);
    expect((await api(JEFE).get('/api/input_output/5')).status).toBe(404);
  });
  test.each([['APRENDIZ', APRENDIZ], ['INVITADO', INVITADO]])('%s consultando un registro AJENO → 403 y no devuelve datos', async (_n, u) => {
    fila(99);
    const res = await api(u).get('/api/input_output/5');
    expect(res.status).toBe(403);
    expect(res.body.datos).toBeUndefined();
  });
  test('APRENDIZ consultando el PROPIO → 200 con id = registro_id', async () => {
    fila(7);
    const res = await api(APRENDIZ).get('/api/input_output/5');
    expect(res.status).toBe(200);
    expect(res.body.datos).toMatchObject({ id: 5, registro_id: 5 });
  });
  test.each([['CELADOR', CELADOR], ['JEFE', JEFE]])('%s puede ver el registro de cualquiera → 200', async (_n, u) => {
    fila(99);
    expect((await api(u).get('/api/input_output/5')).status).toBe(200);
  });
  test('usuario con APRENDIZ + CELADOR no queda restringido (tiene un rol privilegiado)', async () => {
    fila(99);
    expect((await api({ id: 7, roles: ['APRENDIZ', 'CELADOR'] }).get('/api/input_output/5')).status).toBe(200);
  });
  test('compara ids como números aunque la BD los devuelva como string', async () => {
    fila('7');
    expect((await api(APRENDIZ).get('/api/input_output/5')).status).toBe(200);
  });
});

// CREATE entrada 
describe('POST /input_output/entrada (registrar ingreso)', () => {
  const reglas = ({ cupo = [{ 1: 1 }], abiertas = [] } = {}) => mockSql(conn.query, [
    [/^SELECT 1 FROM auth_vehiculo/, [cupo]],
    [/^SELECT id FROM entrada_salida/, [abiertas]],
    [/^INSERT INTO entrada_salida/, [{ insertId: 70 }]],
  ]);
  const post = (b) => api(CELADOR).post('/api/input_output/entrada').send(b);

  test.each([[{}], [{ id_usuario_entra: 1 }], [{ id_vehiculo: 1 }]])('faltan campos %j → 400 sin transacción', async (body) => {
    expect((await post(body)).status).toBe(400);
    expect(conn.beginTransaction).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test('ids no enteros → 400', async () => { expect((await post({ id_usuario_entra: 'a', id_vehiculo: 1 })).status).toBe(400); });
  test('sin cupo ACTIVO para ese vehículo → 403 + rollback (no se inserta)', async () => {
    reglas({ cupo: [] });
    const res = await post({ id_usuario_entra: 1, id_vehiculo: 2 });
    expect(res.status).toBe(403);
    expect(res.body.mensaje).toMatch(/cupo activo/);
    expect(conn.rollback).toHaveBeenCalled();
    expect(sqlsOf(conn.query).some((s) => s.startsWith('INSERT'))).toBe(false);
  });
  test('vehículo ya DENTRO (entrada abierta) → 409 + rollback', async () => {
    reglas({ abiertas: [{ id: 3 }] });
    const res = await post({ id_usuario_entra: 1, id_vehiculo: 2 });
    expect(res.status).toBe(409);
    expect(conn.rollback).toHaveBeenCalled();
  });
  test('éxito → 201: cupo y entradas se leen con FOR UPDATE (bloqueo), celador = token, commit', async () => {
    reglas();
    const res = await post({ id_usuario_entra: '1', id_vehiculo: '2', id_usuario_celador_ingreso: 999 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, id_entrada_salida: 70 });
    const sqls = sqlsOf(conn.query);
    expect(sqls[0]).toMatch(/estado=1 FOR UPDATE$/);
    expect(sqls[1]).toMatch(/fecha_hora_salida IS NULL FOR UPDATE$/);
    expect(conn.query.mock.calls[2][1]).toEqual([1, 2, 7]);       // ignora el celador del body
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });
  test('flujo encadenado sobre estado en memoria: entrar → entrar de nuevo (409) → salir → volver a entrar (201)', async () => {
    let abierta = null;                                            // "BD" en memoria: id de la entrada abierta
    mockSql(conn.query, [
      [/^SELECT 1 FROM auth_vehiculo/, [[{ 1: 1 }]]],
      [/^SELECT id FROM entrada_salida/, () => [abierta ? [{ id: abierta }] : []]],
      [/^INSERT INTO entrada_salida/, () => { abierta = 70; return [{ insertId: 70 }]; }],
      [/^SELECT fecha_hora_salida/, () => [[{ fecha_hora_salida: abierta ? null : 'X' }]]],
      [/^UPDATE entrada_salida/, () => { abierta = null; return [{}]; }],
    ]);
    const app = api(CELADOR);
    expect((await app.post('/api/input_output/entrada').send({ id_usuario_entra: 1, id_vehiculo: 2 })).status).toBe(201);
    expect((await app.post('/api/input_output/entrada').send({ id_usuario_entra: 1, id_vehiculo: 2 })).status).toBe(409);
    expect((await app.patch('/api/input_output/salida/70')).status).toBe(200);
    expect((await app.post('/api/input_output/entrada').send({ id_usuario_entra: 1, id_vehiculo: 2 })).status).toBe(201);
  });
  test('falla la BD al insertar → 500 + rollback + release', async () => {
    mockSql(conn.query, [[/^SELECT 1/, [[{ 1: 1 }]]], [/^SELECT id/, [[]]], [/^INSERT/, new Error('x')]]);
    expect((await post({ id_usuario_entra: 1, id_vehiculo: 2 })).status).toBe(500);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test.failing('petición SIN cuerpo debería ser 400 (hoy 500: Express 5 deja req.body undefined)', async () => {
    expect((await api(CELADOR).post('/api/input_output/entrada')).status).toBe(400);
  });
});

// ═════════════ UPDATE salida ═════════════
describe('PATCH /input_output/salida/:id (registrar salida)', () => {
  const reglas = (rows) => mockSql(conn.query, [[/^SELECT fecha_hora_salida/, [rows]], [/./, [{}]]]);
  const patch = (id = 70) => api(CELADOR).patch(`/api/input_output/salida/${id}`);
  test('id inválido → 400', async () => { expect((await patch('x')).status).toBe(400); });
  test('registro inexistente → 404 + rollback', async () => {
    reglas([]);
    expect((await patch()).status).toBe(404);
    expect(conn.rollback).toHaveBeenCalled();
  });
  test('ya tiene salida → 409 y NO se hace UPDATE', async () => {
    reglas([{ fecha_hora_salida: '2026-01-01' }]);
    expect((await patch()).status).toBe(409);
    expect(sqlsOf(conn.query).some((s) => s.startsWith('UPDATE'))).toBe(false);
  });
  test('éxito → 200: lee con FOR UPDATE, registra celador de salida = token y confirma', async () => {
    reglas([{ fecha_hora_salida: null }]);
    const res = await patch(70);
    expect(res.status).toBe(200);
    expect(sqlsOf(conn.query)[0]).toMatch(/FOR UPDATE$/);
    const upd = conn.query.mock.calls.find(([s]) => s.startsWith('UPDATE entrada_salida'));
    expect(upd[0]).toContain('fecha_hora_salida=NOW()');
    expect(upd[1]).toEqual([7, 70]);
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test('falla la BD → 500 + rollback', async () => {
    mockSql(conn.query, [[/^SELECT/, new Error('x')]]);
    expect((await patch()).status).toBe(500);
    expect(conn.rollback).toHaveBeenCalled();
  });
});

//  CREATE invitado 
describe('POST /input_output/invitado (alta de invitado + vehículo + entrada)', () => {
  const vehiculo = { tipo_vehiculo: 'moto', marca: 'AKT', color: 'Rojo', expira_en: FUTURO };
  const persona = { tipo_documento: 'CC', numero_documento: '9', primer_nombre: 'Luis', primer_apellido: 'Gil', n_celular: '3', correo: 'l@g.co' };
  const GENERICA = '3/6174426c-cc93-42c9-a968-28e5b470c31f.jpg';
  const bd = ({ usuarioExiste = true, rol = [{ id: 5 }] } = {}) => mockSql(conn.query, [
    [/^SELECT id FROM usuario WHERE id=\? AND estado=1 FOR UPDATE/, [usuarioExiste ? [{ id: 9 }] : []]],
    [/INSERT INTO usuario\s+\(/, [{ insertId: 60 }]],
    [/^SELECT id FROM rol/, [rol]],
    [/INSERT INTO vehiculo/, [{ insertId: 80 }]],
    [/./, [{}]],
  ]);
  const post = (b) => api(CELADOR).post('/api/input_output/invitado').send(b);

  test.each([['tipo_vehiculo'], ['marca'], ['color'], ['expira_en']])('falta %s → 400', async (campo) => {
    const body = { ...vehiculo, id_usuario: 9 }; delete body[campo];
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(res.body.mensaje).toContain(campo);
    expect(conn.beginTransaction).not.toHaveBeenCalled();
  });
  test('invitado nuevo sin datos personales → 400 (exige documento, nombres, celular y correo)', async () => {
    const res = await post(vehiculo);
    expect(res.status).toBe(400);
    expect(res.body.mensaje).toContain('tipo_documento');
  });
  test('tipo de vehículo fuera del catálogo → 400', async () => {
    expect((await post({ ...vehiculo, tipo_vehiculo: 'CARRO', id_usuario: 9 })).status).toBe(400);
  });
  test.each([['pasada', PASADO], ['inválida', 'mañana'], ['vacía', '']])('expira_en %s → 400', async (_n, valor) => {
    expect((await post({ ...vehiculo, expira_en: valor, id_usuario: 9 })).status).toBe(400);
  });
  test('id_usuario existente pero INACTIVO o inexistente → 404 + rollback', async () => {
    bd({ usuarioExiste: false });
    const res = await post({ ...vehiculo, id_usuario: 9 });
    expect(res.status).toBe(404);
    expect(conn.rollback).toHaveBeenCalled();
  });
  test('usuario existente: 201, rol INVITADO, cupo ACTIVO auditado por el celador y entrada abierta; imagen genérica por defecto', async () => {
    bd();
    const res = await post({ ...vehiculo, id_usuario: 9 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, id_usuario: 9, id_vehiculo: 80 });
    expect(res.body).not.toHaveProperty('credenciales_temporales');
    expect(conn.query.mock.calls.find(([s]) => s.startsWith('SELECT id FROM rol'))[1]).toEqual(['INVITADO']);
    const veh = conn.query.mock.calls.find(([s]) => s.includes('INSERT INTO vehiculo'))[1];
    expect(veh).toEqual(['MOTO', 'AKT', 'Rojo', GENERICA, GENERICA, GENERICA]);
    expect(conn.query.mock.calls.find(([s]) => s.includes('INSERT INTO auth_vehiculo'))[1]).toEqual([9, 80, 7]);
    expect(conn.query.mock.calls.find(([s]) => s.includes('INSERT INTO entrada_salida'))[1]).toEqual([9, 80, 7]);
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test.each([[''], [null]])('id_usuario %p se trata como "invitado nuevo"', async (idUsuario) => {
    bd();
    const res = await post({ ...vehiculo, ...persona, id_usuario: idUsuario });
    expect(res.status).toBe(201);
    expect(res.body.id_usuario).toBe(60);
  });
  test('invitado nuevo: crea usuario+cuenta (servicios reales), devuelve credenciales temporales y guarda HASH', async () => {
    bd();
    const res = await post({ ...vehiculo, ...persona, expira_en: FUTURO });
    expect(res.status).toBe(201);
    expect(res.body.credenciales_temporales).toMatchObject({ correo: 'l@g.co' });
    expect(res.body.credenciales_temporales.password).toMatch(/^[A-Za-z0-9_-]{12}$/);
    const cuenta = conn.query.mock.calls.find(([s]) => s.includes('INSERT INTO cuenta'))[1];
    expect(cuenta).toEqual([60, 'l@g.co', 'HASH', FUTURO]);        // la cuenta nace con fecha de expiración
  });
  test('rol INVITADO inexistente → 400 + rollback', async () => {
    bd({ rol: [] });
    expect((await post({ ...vehiculo, id_usuario: 9 })).status).toBe(400);
    expect(conn.rollback).toHaveBeenCalled();
  });
  test('documento duplicado → 409', async () => {
    mockSql(conn.query, [[/INSERT INTO usuario\s+\(/, Object.assign(new Error(), { code: 'ER_DUP_ENTRY' })], [/./, [{}]]]);
    expect((await post({ ...vehiculo, ...persona })).status).toBe(409);
  });
  test('multipart con imágenes: se guardan en disco bajo el id del CELADOR y reemplazan las genéricas', async () => {
    bd();
    const res = await api(CELADOR).post('/api/input_output/invitado')
      .field('tipo_vehiculo', 'BICICLETA').field('marca', 'GW').field('color', 'Azul').field('expira_en', FUTURO).field('id_usuario', '9')
      .attach('imagen_url_vehiculo', PNG, { filename: 'v.png', contentType: 'image/png' })
      .attach('imagen_url_tarjeta_propiedad', PNG, { filename: 't.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    const files = storedFiles();
    expect(files).toHaveLength(2);
    expect(files.every((f) => f.startsWith('7/'))).toBe(true);
    const veh = conn.query.mock.calls.find(([s]) => s.includes('INSERT INTO vehiculo'))[1];
    expect(files).toContain(veh[3]);                                  // tarjeta: ruta guardada
    expect(veh[4]).toBe(GENERICA);                                    // identificación: sin archivo → genérica
    expect(files).toContain(veh[5]);
    expect(sqlsOf(conn.query).filter((s) => s.startsWith('INSERT INTO archivo'))).toHaveLength(2);
  });
  test('archivo .exe → 400 desde multer antes de abrir la BD', async () => {
    const res = await api(CELADOR).post('/api/input_output/invitado').attach('imagen_url_vehiculo', Buffer.from('MZ'), { filename: 'a.exe', contentType: 'application/octet-stream' });
    expect(res.status).toBe(400);
    expect(db.getConnection).not.toHaveBeenCalled();
  });
  // HALLAZGO: este controlador no registra los archivos guardados, así que no los borra si la transacción falla
  test.failing('si la BD falla tras guardar imágenes, los archivos deberían eliminarse (hoy quedan huérfanos en disco)', async () => {
    mockSql(conn.query, [[/^SELECT id FROM usuario WHERE id=/, [[{ id: 9 }]]], [/^SELECT id FROM rol/, [[{ id: 5 }]]], [/INSERT INTO vehiculo/, new Error('db caída')], [/./, [{}]]]);
    const res = await api(CELADOR).post('/api/input_output/invitado')
      .field('tipo_vehiculo', 'MOTO').field('marca', 'x').field('color', 'y').field('expira_en', FUTURO).field('id_usuario', '9')
      .attach('imagen_url_vehiculo', PNG, { filename: 'v.png', contentType: 'image/png' });
    expect(res.status).toBe(500);
    expect(storedFiles()).toHaveLength(0);
  });
});

describe('Pendientes de decisión (reglas de negocio)', () => {
  test.todo('POST /invitado crea el cupo ya ACTIVO y registra al CELADOR como id_usuario_administrador: salta la aprobación del administrador');
  test.todo('POST /invitado usa una imagen genérica con ruta fija ("3/6174…jpg") que depende de un archivo del usuario 3');
});
