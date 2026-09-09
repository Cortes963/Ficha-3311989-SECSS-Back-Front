import pool from '../../db.js';

export async function showReportId(req, res) {
  try {
    const { id } = req.params;

    const [filas] = await pool.query(
      `SELECT
         r.id, r.asunto, r.cuerpo, r.estado, r.fecha_hora, r.id_usuario_celador, r.id_entrada_salida,
         CONCAT(u.primer_nombre, ' ', u.primer_apellido) AS celador
       FROM reporte r
       INNER JOIN usuario u ON u.id = r.id_usuario_celador
       WHERE r.id = ?`,
      [id]
    );

    if (filas.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Reporte no encontrado' });
    }

    return res.json({ ok: true, datos: filas[0] });
  } catch (error) {
    console.error('Error al obtener el reporte:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al obtener el reporte' });
  }
}
