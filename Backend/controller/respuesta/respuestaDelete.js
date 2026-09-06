import pool from '../../db.js';
import { ESTADOS_PQRS } from '../pqrs/estados.js';

/**
 * Elimina una respuesta. Como la PQRS deja de estar resuelta, se regresa
 * su estado a EN_TRAMITE. Ambas operaciones van en una transaccion.
 */
export async function eliminarRespuesta(req, res) {
  const { id } = req.params;

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    const [respuestaFilas] = await conexion.query('SELECT id_pqrs FROM respuesta WHERE id = ? FOR UPDATE', [id]);
    if (respuestaFilas.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ ok: false, mensaje: 'Respuesta no encontrada' });
    }
    const idPqrs = respuestaFilas[0].id_pqrs;

    await conexion.query('DELETE FROM respuesta WHERE id = ?', [id]);
    await conexion.query('UPDATE pqrs SET estado = ? WHERE id = ?', [ESTADOS_PQRS.EN_TRAMITE, idPqrs]);

    await conexion.commit();
    return res.json({ ok: true, mensaje: 'Respuesta eliminada correctamente' });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al eliminar la respuesta:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al eliminar la respuesta' });
  } finally {
    conexion.release();
  }
}
