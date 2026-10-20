import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import app from '../app.js';
import db from '../db.js';
import { bearer } from './helpers/auth.js';
import { freshDb } from './helpers/db.js';
import { mockSql } from './helpers/sql.js';
import { clearStorage } from './helpers/storage.js';

// Integración de la APLICACIÓN completa: montaje de rutas, requireAuth real, 404, errores, CORS, estáticos y arranque.
jest.mock('../db.js', () => ({ __esModule: true, default: { query: jest.fn(), getConnection: jest.fn() } }));

beforeEach(() => { freshDb(db); clearStorage(); jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => console.error.mockRestore());

const PREFIJOS = ['/api', '/api/web/v1'];

describe.each(PREFIJOS)('Autenticación global bajo %s', (p) => {
  test('ruta protegida sin token → 401', async () => {
    const res = await request(app).get(`${p}/users/me`);
    expect(res.status).toBe(401);
    expect(res.body.mensaje).toBe('Token requerido.');
    expect(db.query).not.toHaveBeenCalled();
  });
  test('token firmado con otro secreto → 401', async () => {
    const jwt = require('jsonwebtoken');
    const falso = jwt.sign({ id: 1, roles: ['ADMINISTRADOR'] }, 'otro-secreto-que-no-es-el-real-0123456789');
    expect((await request(app).get(`${p}/users/me`).set('Authorization', `Bearer ${falso}`)).status).toBe(401);
  });
  test('token EXPIRADO → 401', async () => {
    expect((await request(app).get(`${p}/users/me`).set('Authorization', bearer(['APRENDIZ'], 7, { expiresIn: -10 }))).status).toBe(401);
  });
  test('esquema distinto de Bearer → 401', async () => {
    expect((await request(app).get(`${p}/users/me`).set('Authorization', 'Basic abc')).status).toBe(401);
  });
  test('token válido llega al controlador con el id y roles del token', async () => {
    mockSql(db.query, [[/^SELECT u\.\*/, [[{ id: 7 }]]], [/^SELECT r\.nombre_rol/, [[{ nombre_rol: 'APRENDIZ' }]]], [/^SELECT da\./, [[]]]]);
    const res = await request(app).get(`${p}/users/me`).set('Authorization', bearer(['APRENDIZ'], 7));
    expect(res.status).toBe(200);
    expect(db.query.mock.calls[0][1]).toEqual([7]);
  });
  test('un token con rol insuficiente llega a 403 (autenticado pero sin permiso)', async () => {
    expect((await request(app).get(`${p}/quota`).set('Authorization', bearer(['APRENDIZ']))).status).toBe(403);
  });
  test('ruta inexistente CON token → 404 JSON del API', async () => {
    const res = await request(app).get(`${p}/no-existe`).set('Authorization', bearer(['ADMINISTRADOR']));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ ok: false, mensaje: 'Ruta no encontrada.' });
  });
  test('ruta inexistente SIN token → 401 (no revela qué rutas existen)', async () => {
    expect((await request(app).get(`${p}/no-existe`)).status).toBe(401);
  });
  test('/auth y /core/health son públicas (montadas antes de requireAuth)', async () => {
    db.query.mockResolvedValueOnce([[]]);
    const login = await request(app).post(`${p}/auth/storeAuthLogin`).send({ numero_documento: '1', password: 'x' });
    expect(login.status).toBe(401);                                // llega al controlador: credenciales inválidas, no "Token requerido"
    expect(login.body.mensaje).toBe('Credenciales inválidas.');
    db.query.mockResolvedValueOnce([[{ 1: 1 }]]);
    expect((await request(app).get(`${p}/core/health`)).status).toBe(200);
  });
  test.each([['attention', '/reportes'], ['attention', '/pqrs'], ['quota', '/quota'], ['input_output', '/input_output'], ['vehicle', '/vehicle/me'], ['users', '/users']])('el módulo %s está montado (%s no devuelve 404 de ruta)', async (_m, ruta) => {
    const res = await request(app).get(`${p}${ruta}`).set('Authorization', bearer(['INVITADO']));
    expect(res.body.mensaje).not.toBe('Ruta no encontrada.');
  });
});

describe('Manejo de errores globales', () => {
  test('error no controlado en una ruta → 500 genérico (sin stack ni detalle)', async () => {
    db.query.mockRejectedValueOnce(new Error('detalle interno secreto'));
    const res = await request(app).get('/api/core/health');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/secreto|stack/);
  });
  // HALLAZGO: body-parser lanza un error con status 400, pero el manejador global lo convierte siempre en 500
  test('DEFECTO · JSON malformado debería responder 400', async () => {
    const res = await request(app).post('/api/auth/storeAuthLogin').set('Content-Type', 'application/json').send('{roto');
    expect(res.status).toBe(400);
  });
  test('body JSON mayor a 1 MB → rechazado (límite de express.json)', async () => {
    const res = await request(app).post('/api/auth/storeAuthLogin').send({ numero_documento: '1', password: 'x'.repeat(1.2 * 1024 * 1024) });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  test('ruta fuera de /api → 404 por defecto de Express', async () => {
    expect((await request(app).get('/cualquier-cosa')).status).toBe(404);
  });
});

describe('Archivos estáticos /storage', () => {
  test('sirve archivos de LOCAL_STORAGE_PATH', async () => {
    fs.mkdirSync(path.join(process.env.LOCAL_STORAGE_PATH, '7'), { recursive: true });
    fs.writeFileSync(path.join(process.env.LOCAL_STORAGE_PATH, '7', 'a.txt'), 'hola');
    const res = await request(app).get('/storage/7/a.txt').set({ Authorization: bearer(['ADMINISTRADOR'], 1) });
    expect(res.status).toBe(200);
    expect(res.text).toBe('hola');
  });
  test('archivo inexistente → 404', async () => { expect((await request(app).get('/storage/7/nada.png').set({ Authorization: bearer(['ADMINISTRADOR'], 1) })).status).toBe(404); });
  test('no permite salir de la carpeta (path traversal) → no entrega archivos del sistema', async () => {
    const res = await request(app).get('/storage/..%2f..%2f..%2fetc%2fpasswd').set({ Authorization: bearer(['ADMINISTRADOR'], 1) });
    expect(res.status).not.toBe(200);
    expect(res.text).not.toMatch(/root:/);
  });
  // Las reglas de propiedad y autenticación de soportes pertenecen al contrato de storage [SECSS02-44].
});

describe('CORS (configurado al importar app.js)', () => {
  const cargarApp = (origenes) => {
    let cargada;
    jest.isolateModules(() => {
      if (origenes === undefined) delete process.env.CORS_ORIGIN; else process.env.CORS_ORIGIN = origenes;
      jest.doMock('../db.js', () => ({ __esModule: true, default: { query: jest.fn().mockResolvedValue([[{ 1: 1 }]]), getConnection: jest.fn() } }));
      cargada = require('../app.js').default;
    });
    return cargada;
  };
  afterEach(() => { delete process.env.CORS_ORIGIN; });

  test('sin CORS_ORIGIN: ningún origen externo recibe cabecera Access-Control-Allow-Origin', async () => {
    const res = await request(cargarApp(undefined)).get('/api/core/health').set('Origin', 'http://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
  test('con CORS_ORIGIN: solo los orígenes listados (se recortan espacios) son aceptados', async () => {
    const a = cargarApp('http://localhost:5173, https://secss.example');
    const ok = await request(a).get('/api/core/health').set('Origin', 'https://secss.example');
    expect(ok.headers['access-control-allow-origin']).toBe('https://secss.example');
    const otro = await request(a).get('/api/core/health').set('Origin', 'http://evil.example');
    expect(otro.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Validación del JWT_SECRET al arrancar', () => {
  const importar = (secreto) => {
    const previo = process.env.JWT_SECRET;
    try {
      jest.isolateModules(() => {
        if (secreto === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secreto;
        jest.doMock('../db.js', () => ({ __esModule: true, default: { query: jest.fn(), getConnection: jest.fn() } }));
        require('../app.js');
      });
    } finally { process.env.JWT_SECRET = previo; }
  };
  test('sin JWT_SECRET → la app NO arranca', () => { expect(() => importar(undefined)).toThrow(/JWT_SECRET/); });
  test('JWT_SECRET de 31 caracteres → no arranca (mínimo 32)', () => { expect(() => importar('x'.repeat(31))).toThrow(/al menos 32/); });
  test('JWT_SECRET de 32 caracteres → arranca', () => { expect(() => importar('x'.repeat(32))).not.toThrow(); });
});
