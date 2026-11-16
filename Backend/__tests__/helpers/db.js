import { mockConnection } from './http.js';

// Deja la BD simulada limpia y devuelve una conexión transaccional nueva.
// Úsalo en beforeEach:   conn = freshDb(db);
export function freshDb(db) {
  db.query.mockReset();
  const conn = mockConnection();
  db.getConnection.mockReset().mockResolvedValue(conn);
  return conn;
}

// Archivos de prueba para multipart (supertest .attach)
export const PNG = Buffer.from('89504e470d0a1a0a', 'hex');
