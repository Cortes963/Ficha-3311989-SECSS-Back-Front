import pool from '../../db.js';

export async function indexAnswer(req, res) {
  try {
    const pagina = Math.max(Number(req.query.pagina) || 1, 1);
    const limite = Math.min(Number(req.query.limite) || 20, 100);
    const desplazamiento = (pagina - 1) * limite;

    const [conteoFilas] = await pool.query('SELECT COUNT(*) AS total FROM respuesta');
    const total = conteoFilas[0].total;

    const [filas] = await pool.query(
      `SELECT
         r.id, r.id_pqrs, r.asunto, r.cuerpo, r.id_usuario_administrador,
         CONCAT(a.primer_nombre, ' ', a.primer_apellido) AS administrador
       FROM respuesta r
       INNER JOIN usuario a ON a.id = r.id_usuario_administrador
       ORDER BY r.id DESC
       LIMIT ? OFFSET ?`,
      [limite, desplazamiento]
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
    console.error('Error al listar respuestas:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al listar las respuestas' });
  }
}
