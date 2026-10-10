// Utilidades compartidas por las pruebas unitarias de controladores.
// Simulan los objetos req/res de Express sin levantar un servidor.

export function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

export function mockReq({ body = {}, params = {}, query = {}, user = { id: 7, roles: [] }, files, headers = {} } = {}) {
  return {
    body, params, query, user, files,
    get: (name) => headers[name.toLowerCase()],
  };
}

// Conexión transaccional falsa (lo que devuelve db.getConnection()).
export function mockConnection() {
  return {
    query: jest.fn(),
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn(),
  };
}
