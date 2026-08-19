// controller/pqr/pqrscontroller.js
//
// Punto de entrada del módulo de PQRS: mantiene el listado (la única
// operación que no ameritaba su propio archivo) y reexporta el resto,
// cada una separada por responsabilidad en su propio archivo:
//   pqrsFile.js     -> crearPqrs        (radicar)
//   pqrsSearchID.js -> obtenerPqrsPorId
//   pqrsAnswer.js   -> responderPqrs
//   pqrsState.js    -> actualizarEstado
import pool from '../../db.js';

export { ESTADOS_PQRS } from './estados.js';
export { crearPqrs } from './pqrsFile.js';
export { obtenerPqrsPorId } from './pqrsSearchID.js';
export { responderPqrs } from './pqrsAnswer.js';
export { actualizarEstado } from './pqrsState.js';

/**
 * Lista las PQRS. Admite filtros opcionales por estado y por usuario,
 * y paginación con `pagina` / `limite`.
 */
export async function listarPqrs(req, res) {
  try {
    const { estado, id_usuario } = req.query;
    const pagina = Math.max(Number(req.query.pagina) || 1, 1);
    const limite = Math.min(Number(req.query.limite) || 20, 100);
    const desplazamiento = (pagina - 1) * limite;

    let sql = `
      SELECT
        p.id, p.asunto, p.estado, p.fecha_creacion, p.id_usuario,
        CONCAT(u.primer_nombre, ' ', u.primer_apellido) AS solicitante,
        (r.id IS NOT NULL) AS tiene_respuesta
      FROM pqrs p
      INNER JOIN usuario u ON u.id = p.id_usuario
      LEFT JOIN respuesta r ON r.id_pqrs = p.id
      WHERE 1 = 1
    `;
    const parametros = [];

    if (estado !== undefined) {
      sql += ' AND p.estado = ?';
      parametros.push(estado);
    }
    if (id_usuario !== undefined) {
      sql += ' AND p.id_usuario = ?';
      parametros.push(id_usuario);
    }

    sql += ' ORDER BY p.fecha_creacion DESC LIMIT ? OFFSET ?';
    parametros.push(limite, desplazamiento);

    const [filas] = await pool.query(sql, parametros);
    return res.json({ ok: true, pagina, limite, datos: filas });
  } catch (error) {
    console.error('Error al listar PQRS:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al listar las PQRS' });
  }
}
