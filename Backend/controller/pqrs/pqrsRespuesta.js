import pool from '../../db.js';

/**
 * Devuelve la respuesta (1 a 1) de una PQRS puntual, si ya existe.
 * Se usa desde el frontend para consultar la respuesta bajo demanda,
 * sin tener que pedir toda la PQRS de nuevo.
 */
export async function obtenerRespuestaDePqrs(req, res) {
  try {
    const { id } = req.params;

    const [filas] = await pool.query(
      `SELECT
         r.id, r.id_pqrs, r.asunto, r.cuerpo, r.id_usuario_administrador,
         CONCAT(a.primer_nombre, ' ', a.primer_apellido) AS administrador
       FROM respuesta r
       INNER JOIN usuario a ON a.id = r.id_usuario_administrador
       WHERE r.id_pqrs = ?`,
      [id]
    );

    if (filas.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Esta PQRS todavía no tiene respuesta registrada' });
    }

    return res.json({ ok: true, datos: filas[0] });
  } catch (error) {
    console.error('Error al obtener la respuesta de la PQRS:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al obtener la respuesta' });
  }
}
