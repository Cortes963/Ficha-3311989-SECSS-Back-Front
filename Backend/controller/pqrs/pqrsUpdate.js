import pool from '../../db.js';

/**
 * Actualiza asunto/cuerpo (y opcionalmente el usuario) de una PQRS existente.
 */
export async function actualizarPqrs(req, res) {
  try {
    const { id } = req.params;
    const { id_usuario, asunto, cuerpo } = req.body;

    if (!id_usuario || !asunto || !cuerpo) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Los campos id_usuario, asunto y cuerpo son obligatorios'
      });
    }

    const [usuarioExiste] = await pool.query('SELECT id FROM usuario WHERE id = ?', [id_usuario]);
    if (usuarioExiste.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'El usuario indicado no existe' });
    }

    const [resultado] = await pool.query(
      'UPDATE pqrs SET id_usuario = ?, asunto = ?, cuerpo = ? WHERE id = ?',
      [id_usuario, asunto, cuerpo, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: 'PQRS no encontrada' });
    }

    return res.json({ ok: true, mensaje: 'PQRS actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar la PQRS:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al actualizar la PQRS' });
  }
}
