import pool from '../../db.js';
import { ESTADOS_PQRS } from './estados.js';

/**
 * Permite cambiar el estado de una PQRS (ej. pasar de EN_TRAMITE a CERRADO
 * manualmente, sin pasar por una respuesta formal).
 */
export async function actualizarEstado(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = Object.values(ESTADOS_PQRS);
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        ok: false,
        mensaje: `estado inválido. Valores permitidos: ${estadosValidos.join(', ')}`
      });
    }

    const [resultado] = await pool.query('UPDATE pqrs SET estado = ? WHERE id = ?', [estado, id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: 'PQRS no encontrada' });
    }

    return res.json({ ok: true, mensaje: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al actualizar el estado' });
  }
}
