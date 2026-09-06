import pool from '../../db.js';

export async function actualizarRespuesta(req, res) {
  try {
    const { id } = req.params;
    const { id_usuario_administrador, asunto, cuerpo } = req.body;

    if (!id_usuario_administrador || !asunto || !cuerpo) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Los campos id_usuario_administrador, asunto y cuerpo son obligatorios'
      });
    }

    const [administradorExiste] = await pool.query('SELECT id FROM usuario WHERE id = ?', [id_usuario_administrador]);
    if (administradorExiste.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'El usuario administrador indicado no existe' });
    }

    const [resultado] = await pool.query(
      'UPDATE respuesta SET id_usuario_administrador = ?, asunto = ?, cuerpo = ? WHERE id = ?',
      [id_usuario_administrador, asunto, cuerpo, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Respuesta no encontrada' });
    }

    return res.json({ ok: true, mensaje: 'Respuesta actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar la respuesta:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al actualizar la respuesta' });
  }
}
