// "Enrutador" de SQL para mocks: en vez de encadenar mockResolvedValueOnce en un orden frágil,
// declaras QUÉ responde la BD según el SQL que reciba.
//
//   mockSql(db.query, [
//     [/^SELECT COUNT/,       [[{ total: 3 }]]],                 // respuesta fija
//     [/^SELECT u\.id/,       (sql, params) => [[{ id: params[0] }]]],  // respuesta calculada
//     [/^INSERT INTO usuario/, new Error('boom')],               // un Error se LANZA
//   ]);
//
// Si llega un SQL sin regla, la prueba falla con un mensaje claro (así detectas queries inesperadas).
export function mockSql(fn, rules) {
  fn.mockReset();
  fn.mockImplementation(async (sql, params) => {
    for (const [pattern, response] of rules) {
      if (!pattern.test(sql)) continue;
      const value = typeof response === 'function' ? response(sql, params) : response;
      if (value instanceof Error) throw value;
      return value;
    }
    throw new Error(`mockSql: ninguna regla coincide con -> ${String(sql).replace(/\s+/g, ' ').trim().slice(0, 90)}`);
  });
}

// Devuelve los SQL ejecutados (normalizados) para aserciones del tipo "se ejecutó un UPDATE ...".
export const sqlsOf = (fn) => fn.mock.calls.map(([sql]) => String(sql).replace(/\s+/g, ' ').trim());
