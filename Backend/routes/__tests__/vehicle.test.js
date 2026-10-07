// backend/routes/__tests__/vehicle.test.js
import request from 'supertest';
import express from 'express';
import router from '../vehicle.routes.js';

// Simulamos el módulo de la base de datos
jest.mock('../../db.js');
import pool from '../../db.js';

// Creamos una app de Express mínima solo para las pruebas
const app = express();
app.use(express.json());
app.use('/vehiculos', router);

describe('Pruebas de Caja Blanca - Vehículos', () => {
  
  test('GET / sin búsqueda debe retornar lista paginada', async () => {
    // Configuramos el mock: 1ra llamada devuelve rows, 2da devuelve total
    pool.query
      .mockResolvedValueOnce([[{ idVehiculo: '1', marca: 'Test' }]])
      .mockResolvedValueOnce([[{ total: 10 }]]);

    const res = await request(app).get('/vehiculos');

    expect(res.statusCode).toBe(200);
    expect(res.body.vehiculos).toHaveLength(1);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test('GET / con búsqueda debe construir query con WHERE', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    await request(app).get('/vehiculos?search=Test');

    const queryEjecutada = pool.query.mock.calls[0][0];
    expect(queryEjecutada).toContain('WHERE');
    expect(queryEjecutada).toContain('marca LIKE ?');
  });

  test('POST / debe rechazar si faltan campos requeridos', async () => {
    const res = await request(app)
      .post('/vehiculos')
      .send({ marca: 'Incompleto' });

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled(); // No debe tocar la BD
  });
});
