import { sqlsOf } from './sql.js';

// Aplica las MISMAS reglas SQL al pool (db.query) y a la conexión transaccional (conn.query),
// de modo que las pruebas de negocio no dependen de CÓMO el backend consulta, solo de QUÉ resultado debe producir.
export function simulate(db, conn, rules) {
  const route = async (sql, params) => {
    for (const [pattern, response] of rules) {
      if (!pattern.test(sql)) continue;
      const value = typeof response === 'function' ? response(sql, params) : response;
      if (value instanceof Error) throw value;
      return value;
    }
    return [[], undefined]; // SQL sin regla: resultado vacío (no revienta; la aserción decide)
  };
  db.query.mockReset().mockImplementation(route);
  conn.query.mockReset().mockImplementation(route);
}

// Todos los SQL ejecutados, por el pool o por la conexión transaccional.
export const allSql = (db, conn) => [...sqlsOf(db.query), ...sqlsOf(conn.query)];
export const touched = (db, conn, re) => allSql(db, conn).some((s) => re.test(s));
export const wroteAny = (db, conn) => allSql(db, conn).some((s) => /^(INSERT|UPDATE|DELETE)/i.test(s));

export const ROLES5 = ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR', 'APRENDIZ', 'INVITADO'];
