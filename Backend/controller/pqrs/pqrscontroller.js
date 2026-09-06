// controller/pqr/pqrscontroller.js
//
// Punto de entrada del módulo de PQRS: mantiene el listado (la única
// operación que no ameritaba su propio archivo) y reexporta el resto,
// cada una separada por responsabilidad en su propio archivo:
//   pqrsFile.js      -> crearPqrs             (radicar)
//   pqrsSearchID.js  -> obtenerPqrsPorId
//   pqrsRespuesta.js -> obtenerRespuestaDePqrs
//   pqrsAnswer.js    -> responderPqrs
//   pqrsState.js     -> actualizarEstado
//   pqrsUpdate.js    -> actualizarPqrs
//   pqrsDelete.js    -> eliminarPqrs
import pool from '../../db.js';

export { ESTADOS_PQRS } from './estados.js';
export { crearPqrs } from './pqrsFile.js';
export { obtenerPqrsPorId } from './pqrsSearchID.js';
export { obtenerRespuestaDePqrs } from './pqrsRespuesta.js';
export { responderPqrs } from './pqrsAnswer.js';
export { actualizarEstado } from './pqrsState.js';
export { actualizarPqrs } from './pqrsUpdate.js';
export { eliminarPqrs } from './pqrsDelete.js';

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
    
    const condiciones = ['1 = 1'];
    const parametros = [];

    if (estado !== undefined) {
      condiciones.push('p.estado = ?');
      parametros.push(estado);
    }
    if (id_usuario !== undefined) {
      condiciones.push('p.id_usuario = ?');
      parametros.push(id_usuario);
    }
    const whereSql = condiciones.join(' AND ');

    const [conteoFilas] = await pool.query(
      `SELECT COUNT(*) AS total FROM pqrs p WHERE ${whereSql}`,
      parametros
    );
    const total = conteoFilas[0].total;
      const [filas] = await pool.query(
      `SELECT
         p.id, p.asunto, p.estado, p.fecha_hora, p.id_usuario,
         CONCAT(u.primer_nombre, ' ', u.primer_apellido) AS solicitante,
         (r.id IS NOT NULL) AS tiene_respuesta
       FROM pqrs p
       INNER JOIN usuario u ON u.id = p.id_usuario
       LEFT JOIN respuesta r ON r.id_pqrs = p.id
       WHERE ${whereSql}
       ORDER BY p.fecha_hora DESC
       LIMIT ? OFFSET ?`,
      [...parametros, limite, desplazamiento]
    );

    return res.json({
      ok: true,
      pagina,
      limite,
      total,
      totalPaginas: Math.max(Math.ceil(total / limite), 1),
      datos: filas
    });

  } catch (error) {
    console.error('Error al listar PQRS:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al listar las PQRS' });
  }
}
