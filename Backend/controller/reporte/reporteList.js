import pool from '../../db.js';

/**
 * Lista reportes. Admite filtros opcionales por celador y por estado,
 * y paginación con `pagina` (base 1) / `limite`.
 */
export async function listarReportes(req, res) {
  try {
    const { estado, id_usuario_celador } = req.query;
    const pagina = Math.max(Number(req.query.pagina) || 1, 1);
    const limite = Math.min(Number(req.query.limite) || 20, 100);
    const desplazamiento = (pagina - 1) * limite;

    const condiciones = ['1 = 1'];
    const parametros = [];

    if (estado !== undefined) {
      condiciones.push('r.estado = ?');
      parametros.push(estado);
    }
    if (id_usuario_celador !== undefined) {
      condiciones.push('r.id_usuario_celador = ?');
      parametros.push(id_usuario_celador);
    }
    const whereSql = condiciones.join(' AND ');

    const [conteoFilas] = await pool.query(
      `SELECT COUNT(*) AS total FROM reporte r WHERE ${whereSql}`,
      parametros
    );
    const total = conteoFilas[0].total;

    const [filas] = await pool.query(
      `SELECT
         r.id, r.asunto, r.estado, r.fecha_hora, r.id_usuario_celador, r.id_entrada_salida,
         CONCAT(u.primer_nombre, ' ', u.primer_apellido) AS celador
       FROM reporte r
       INNER JOIN usuario u ON u.id = r.id_usuario_celador
       WHERE ${whereSql}
       ORDER BY r.fecha_hora DESC
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
    console.error('Error al listar reportes:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al listar los reportes' });
  }
}
