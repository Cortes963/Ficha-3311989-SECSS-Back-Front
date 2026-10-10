import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import router from '../routes/auth.routes.js';
import db from '../db.js';
import { appWith } from './helpers/app.js';
import { freshDb, PNG } from './helpers/db.js';
import { mockSql } from './helpers/sql.js';
import { storedFiles, clearStorage } from './helpers/storage.js';

jest.mock('../db.js', () => ({ __esModule: true, default: { query: jest.fn(), getConnection: jest.fn() } }));
jest.mock('bcryptjs', () => ({ __esModule: true, default: { compare: jest.fn(), hash: jest.fn().mockResolvedValue('HASH') } }));

const api = () => request(appWith(router, undefined, '/api/auth'));
const URL = (p) => `/api/auth/${p}`;
let conn;
beforeEach(() => { conn = freshDb(db); clearStorage(); jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => console.error.mockRestore());

const FUTURO = new Date(Date.now() + 3600e3).toISOString();
const PASADO = new Date(Date.now() - 3600e3).toISOString();
const cuenta = (extra = {}) => ({ id_usuario: 1, estado: 1, usuario_estado: 1, password_hash: 'h', primer_nombre: 'Ana', primer_apellido: 'Paz', correo: 'a@a.co', expira_en: null, bloqueada_hasta: null, ...extra });
const credenciales = { numero_documento: '123', password: 'pw' };

describe('POST /auth/storeAuthLogin', () => {
  const login = (body = credenciales) => api().post(URL('storeAuthLogin')).send(body);

  test('falta password → 400 sin consultar la BD', async () => {
    const res = await login({ numero_documento: '1' });
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('documento inexistente → 401 genérico (no revela si el usuario existe)', async () => {
    db.query.mockResolvedValueOnce([[]]);
    const res = await login();
    expect(res.status).toBe(401);
    expect(res.body.mensaje).toBe('Credenciales inválidas.');
  });
  test.each([['cuenta.estado = 0', { estado: 0 }], ['usuario.estado = 0', { usuario_estado: 0 }]])('%s → 403 sin comparar contraseña', async (_n, extra) => {
    db.query.mockResolvedValueOnce([[cuenta(extra)]]);
    expect((await login()).status).toBe(403);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
  test('cuenta temporal expirada → 403', async () => {
    db.query.mockResolvedValueOnce([[cuenta({ expira_en: PASADO })]]);
    const res = await login();
    expect(res.status).toBe(403);
    expect(res.body.mensaje).toMatch(/expiró/);
  });
  test('bloqueada hasta el futuro → 423', async () => {
    db.query.mockResolvedValueOnce([[cuenta({ bloqueada_hasta: FUTURO })]]);
    expect((await login()).status).toBe(423);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
  test('cuenta temporal vigente y bloqueo vencido NO impiden el login', async () => {
    mockSql(db.query, [[/^SELECT c\.\*/, [[cuenta({ expira_en: FUTURO, bloqueada_hasta: PASADO })]]], [/^SELECT r\.nombre_rol/, [[]]], [/^UPDATE cuenta/, [{}]]]);
    bcrypt.compare.mockResolvedValueOnce(true);
    expect((await login()).status).toBe(200);
  });
  test('contraseña incorrecta → 401 y registra el intento fallido', async () => {
    mockSql(db.query, [[/^SELECT c\.\*/, [[cuenta()]]], [/^UPDATE cuenta SET intentos_fallidos=IF/, [{}]]]);
    bcrypt.compare.mockResolvedValueOnce(false);
    const res = await login();
    expect(res.status).toBe(401);
    const upd = db.query.mock.calls.find(([s]) => s.includes('intentos_fallidos=IF'));
    expect(upd[1]).toEqual([1]);
    expect(upd[0]).toContain('INTERVAL 15 MINUTE'); // bloqueo al 3er intento
  });
  test('login correcto: JWT con id y roles, resetea intentos y no filtra el hash', async () => {
    mockSql(db.query, [
      [/^SELECT c\.\*/, [[cuenta()]]],
      [/^SELECT r\.nombre_rol/, [[{ nombre_rol: 'APRENDIZ' }, { nombre_rol: 'INVITADO' }]]],
      [/^UPDATE cuenta SET intentos_fallidos=0/, [{}]],
    ]);
    bcrypt.compare.mockResolvedValueOnce(true);
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({ id: 1, nombre: 'Ana Paz', correo: 'a@a.co', roles: ['APRENDIZ', 'INVITADO'] });
    expect(jwt.verify(res.body.token, process.env.JWT_SECRET)).toMatchObject({ id: 1, roles: ['APRENDIZ', 'INVITADO'] });
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
    expect(db.query.mock.calls.some(([s]) => s.includes('intentos_fallidos=0'))).toBe(true);
  });
  test('JWT_EXPIRES_IN se respeta (8h por defecto, 1h si se configura)', async () => {
    const rutaFeliz = () => { mockSql(db.query, [[/^SELECT c\.\*/, [[cuenta()]]], [/^SELECT r\./, [[]]], [/^UPDATE/, [{}]]]); bcrypt.compare.mockResolvedValueOnce(true); };
    rutaFeliz();
    const a = jwt.decode((await login()).body.token);
    expect(a.exp - a.iat).toBe(8 * 3600);
    process.env.JWT_EXPIRES_IN = '1h';
    rutaFeliz();
    const b = jwt.decode((await login()).body.token);
    expect(b.exp - b.iat).toBe(3600);
    delete process.env.JWT_EXPIRES_IN;
  });
  test('falla la BD → 500 genérico', async () => {
    db.query.mockRejectedValueOnce(new Error('secreto'));
    const res = await login();
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secreto');
  });
  // HALLAZGO: Express 5 deja req.body = undefined cuando la petición no trae cuerpo.
  test.failing('petición SIN cuerpo debería responder 400 (hoy responde 500 porque required(undefined) revienta)', async () => {
    const res = await api().post(URL('storeAuthLogin'));
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/storeAuthRegister (multipart)', () => {
  const campos = { tipo_documento: 'CC', numero_documento: '1', primer_nombre: 'A', primer_apellido: 'B', n_celular: '3', correo: 'a@a.co', password: 'passwordlargo1', nombre_rol: 'APRENDIZ' };
  const detalle = { id_centro: '1', ficha: '3311989', direccion: 'Cll 1', fecha_vinculacion: '2026-01-01' };
  const IMAGENES = ['imagen_url_aprendiz', 'imagen_url_identificacion', 'imagen_url_carnet_sena'];

  // Construye la petición multipart: campos + detalle_aprendiz[...] + imágenes
  const registrar = ({ body = campos, det = detalle, imagenes = IMAGENES } = {}) => {
    let r = api().post(URL('storeAuthRegister'));
    Object.entries(body).forEach(([k, v]) => { r = r.field(k, v); });
    if (det) Object.entries(det).forEach(([k, v]) => { r = r.field(`detalle_aprendiz[${k}]`, v); });
    imagenes.forEach((n) => { r = r.attach(n, PNG, { filename: `${n}.png`, contentType: 'image/png' }); });
    return r;
  };
  const bdOk = (rol = [{ id: 2 }]) => mockSql(conn.query, [
    [/^INSERT INTO usuario /, [{ insertId: 10 }]], [/^SELECT id FROM rol/, [rol]], [/./, [{}]],
  ]);

  test('registro exitoso → 201, archivos guardados bajo el id del usuario nuevo, hash con costo 12', async () => {
    bdOk();
    const res = await registrar();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, id_usuario: 10 });
    expect(bcrypt.hash).toHaveBeenCalledWith('passwordlargo1', 12);
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
    const files = storedFiles();
    expect(files).toHaveLength(3);
    expect(files.every((f) => f.startsWith('10/') && f.endsWith('.png'))).toBe(true);
    const det = conn.query.mock.calls.find(([s]) => s.startsWith('INSERT INTO detalle_aprendiz'));
    expect(det[1].slice(0, 3)).toEqual([10, '1', '3311989']);
  });
  test('faltan campos obligatorios → 400', async () => {
    const { correo, ...sinCorreo } = campos;
    const res = await registrar({ body: sinCorreo });
    expect(res.status).toBe(400);
    expect(res.body.mensaje).toContain('correo');
  });
  test('rol distinto de APRENDIZ → 403 (el registro público no permite escalar privilegios)', async () => {
    const res = await registrar({ body: { ...campos, nombre_rol: 'ADMINISTRADOR' } });
    expect(res.status).toBe(403);
    expect(conn.beginTransaction).not.toHaveBeenCalled();
  });
  test('contraseña de 9 caracteres → 400; de 10 supera esa validación (frontera)', async () => {
    expect((await registrar({ body: { ...campos, password: '123456789' } })).status).toBe(400);
    bdOk();
    expect((await registrar({ body: { ...campos, password: '1234567890' } })).status).toBe(201);
  });
  test('detalle_aprendiz incompleto → 400 con el campo faltante', async () => {
    const { ficha, ...incompleto } = detalle;
    const res = await registrar({ det: incompleto });
    expect(res.status).toBe(400);
    expect(res.body.mensaje).toContain('ficha');
  });
  test('sin detalle_aprendiz en absoluto → 400', async () => {
    expect((await registrar({ det: null })).status).toBe(400);
  });
  test('falta una imagen obligatoria → 400 con su nombre y sin transacción', async () => {
    const res = await registrar({ imagenes: IMAGENES.slice(0, 2) });
    expect(res.status).toBe(400);
    expect(res.body.mensaje).toContain('imagen_url_carnet_sena');
    expect(conn.beginTransaction).not.toHaveBeenCalled();
    expect(storedFiles()).toHaveLength(0);
  });
  test('archivo con extensión peligrosa → 400 desde multer, antes de abrir la BD', async () => {
    const res = await api().post(URL('storeAuthRegister')).field('nombre_rol', 'APRENDIZ').attach('imagen_url_aprendiz', Buffer.from('MZ'), { filename: 'virus.exe', contentType: 'application/octet-stream' });
    expect(res.status).toBe(400);
    expect(res.body.mensaje).toMatch(/JPG, PNG o WEBP/);
    expect(db.getConnection).not.toHaveBeenCalled();
  });
  test('mime image/png con extensión .php también se rechaza (se validan ambos)', async () => {
    const res = await api().post(URL('storeAuthRegister')).attach('imagen_url_aprendiz', PNG, { filename: 'shell.php', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });
  test('archivo mayor a 5 MB → 400 (límite de multer)', async () => {
    const res = await api().post(URL('storeAuthRegister')).attach('imagen_url_aprendiz', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'g.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });
  test('rol APRENDIZ inexistente en BD → 400, rollback y se ELIMINAN los 3 archivos ya guardados', async () => {
    bdOk([]);
    const res = await registrar();
    expect(res.status).toBe(400);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(storedFiles()).toHaveLength(0);
  });
  test('documento duplicado (ER_DUP_ENTRY) → 409 + rollback', async () => {
    mockSql(conn.query, [[/^INSERT INTO usuario /, Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' })]]);
    const res = await registrar();
    expect(res.status).toBe(409);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test('JSON sin archivos: ruta alterna del body (detalle_aprendiz como objeto) llega a la validación de imágenes → 400', async () => {
    const res = await api().post(URL('storeAuthRegister')).send({ ...campos, detalle_aprendiz: detalle });
    expect(res.status).toBe(400);
    expect(res.body.mensaje).toContain('imagen_url_aprendiz');
  });
  // HALLAZGO: typeof null === 'object' → required(null, …) lanza TypeError
  test.failing('detalle_aprendiz: null debería ser 400 (hoy es 500)', async () => {
    const res = await api().post(URL('storeAuthRegister')).send({ ...campos, detalle_aprendiz: null });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/forgot-password', () => {
  afterEach(() => { delete process.env.PASSWORD_RESET_RETURN_TOKEN; });
  const forgot = (b) => api().post(URL('forgot-password')).send(b);
  test('sin correo → 400', async () => { expect((await forgot({})).status).toBe(400); });
  test('correo inexistente → mismo mensaje genérico y sin INSERT (no enumera cuentas)', async () => {
    db.query.mockResolvedValueOnce([[]]);
    const res = await forgot({ correo: 'x@x.co' });
    expect(res.body.mensaje).toMatch(/Si el correo existe/);
    expect(db.query).toHaveBeenCalledTimes(1);
  });
  test('correo existente → mismo mensaje y guarda solo el HASH sha256 del token', async () => {
    db.query.mockResolvedValueOnce([[{ id_usuario: 1 }]]).mockResolvedValueOnce([{}]);
    const res = await forgot({ correo: 'a@a.co' });
    expect(res.body.mensaje).toMatch(/Si el correo existe/);
    expect(res.body.token).toBeUndefined();
    expect(db.query.mock.calls[1][1][1]).toMatch(/^[0-9a-f]{64}$/);
  });
  test('PASSWORD_RESET_RETURN_TOKEN=true devuelve el token (solo para entornos de prueba)', async () => {
    process.env.PASSWORD_RESET_RETURN_TOKEN = 'true';
    db.query.mockResolvedValueOnce([[{ id_usuario: 1 }]]).mockResolvedValueOnce([{}]);
    expect((await forgot({ correo: 'a@a.co' })).body.token).toMatch(/^[0-9a-f]{64}$/);
  });
  test('falla la BD → 500', async () => {
    db.query.mockRejectedValueOnce(new Error('x'));
    expect((await forgot({ correo: 'a@a.co' })).status).toBe(500);
  });
});

describe('POST /auth/reset-password', () => {
  const reset = (b) => api().post(URL('reset-password')).send(b);
  test('faltan datos → 400', async () => { expect((await reset({ token: 't' })).status).toBe(400); });
  test('contraseña corta → 400 sin consultar', async () => {
    expect((await reset({ token: 't', password: 'corta' })).status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('token inválido, vencido o usado → 400 y no abre transacción', async () => {
    db.query.mockResolvedValueOnce([[]]);
    expect((await reset({ token: 't', password: 'passwordlargo1' })).status).toBe(400);
    expect(db.getConnection).not.toHaveBeenCalled();
  });
  test('éxito: actualiza hash (costo 12), marca el token como usado y confirma', async () => {
    db.query.mockResolvedValueOnce([[{ id: 5, id_usuario: 1 }]]);
    conn.query.mockResolvedValue([{}]);
    const res = await reset({ token: 't', password: 'passwordlargo1' });
    expect(res.status).toBe(200);
    expect(bcrypt.hash).toHaveBeenCalledWith('passwordlargo1', 12);
    expect(conn.query.mock.calls[0][1]).toEqual(['HASH', 1]);
    expect(conn.query.mock.calls[1][0]).toContain('usado_en=NOW()');
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
  test('busca el token por su HASH, nunca en claro', async () => {
    db.query.mockResolvedValueOnce([[]]);
    await reset({ token: 'mi-token', password: 'passwordlargo1' });
    expect(db.query.mock.calls[0][1][0]).toMatch(/^[0-9a-f]{64}$/);
    expect(db.query.mock.calls[0][1][0]).not.toBe('mi-token');
  });
  test('falla dentro de la transacción → rollback, release y 500', async () => {
    db.query.mockResolvedValueOnce([[{ id: 5, id_usuario: 1 }]]);
    conn.query.mockRejectedValueOnce(new Error('x'));
    const res = await reset({ token: 't', password: 'passwordlargo1' });
    expect(res.status).toBe(500);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
});
