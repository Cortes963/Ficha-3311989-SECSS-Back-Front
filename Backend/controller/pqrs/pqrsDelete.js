import pool from '../../db.js';

/** Elimina una PQRS. Su respuesta (si existe) se borra en cascada segun el DDL. */
export async function eliminarPqrs(req, res) {
  try {
    const { id } = req.params;

    const [resultado] = await pool.query('DELETE FROM pqrs WHERE id = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: 'PQRS no encontrada' });
    }

    return res.json({ ok: true, mensaje: 'PQRS eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar la PQRS:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al eliminar la PQRS' });
  }
}
