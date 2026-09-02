import pool from '../../db.js';

/**
 * Detalle de una PQRS puntual, incluyendo su respuesta si ya existe.
 */
export async function obtenerPqrsPorId(req, res) {
  try {
    const { id } = req.params;

    const [pqrsFilas] = await pool.query(
      `SELECT
         p.id, p.asunto, p.cuerpo, p.estado, p.fecha_creacion, p.id_usuario,
         CONCAT(u.primer_nombre, ' ', u.primer_apellido) AS solicitante
       FROM pqrs p
       INNER JOIN usuario u ON u.id = p.id_usuario
       WHERE p.id = ?`,
      [id]
    );

    if (pqrsFilas.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'PQRS no encontrada' });
    }

    const [respuestaFilas] = await pool.query(
      `SELECT
         r.id, r.asunto, r.cuerpo, r.id_usuario_administrador,
         CONCAT(a.primer_nombre, ' ', a.primer_apellido) AS administrador
       FROM respuesta r
       INNER JOIN usuario a ON a.id = r.id_usuario_administrador
       WHERE r.id_pqrs = ?`,
      [id]
    );

    return res.json({
      ok: true,
      datos: {
        ...pqrsFilas[0],
        respuesta: respuestaFilas[0] || null
      }
    });
  } catch (error) {
    console.error('Error al obtener la PQRS:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al obtener la PQRS' });
  }
}
