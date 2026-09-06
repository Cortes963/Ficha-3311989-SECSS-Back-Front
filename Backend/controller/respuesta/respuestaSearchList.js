import pool from '../../db.js';

export async function obtenerRespuestaPorId(req, res) {
  try {
    const { id } = req.params;

    const [filas] = await pool.query(
      `SELECT
         r.id, r.id_pqrs, r.asunto, r.cuerpo, r.id_usuario_administrador,
         CONCAT(a.primer_nombre, ' ', a.primer_apellido) AS administrador
       FROM respuesta r
       INNER JOIN usuario a ON a.id = r.id_usuario_administrador
       WHERE r.id = ?`,
      [id]
    );

    if (filas.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Respuesta no encontrada' });
    }

    return res.json({ ok: true, datos: filas[0] });
  } catch (error) {
    console.error('Error al obtener la respuesta:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al obtener la respuesta' });
  }
}
