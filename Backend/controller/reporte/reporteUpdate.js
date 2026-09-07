import pool from '../../db.js';

export async function updateReport(req, res) {
  try {
    const { id } = req.params;
    const { id_usuario_celador, asunto, cuerpo, estado, id_entrada_salida } = req.body;

    if (!id_usuario_celador || !asunto || !cuerpo) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Los campos id_usuario_celador, asunto y cuerpo son obligatorios'
      });
    }

    const [celadorExiste] = await pool.query('SELECT id FROM usuario WHERE id = ?', [id_usuario_celador]);
    if (celadorExiste.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'El usuario celador indicado no existe' });
    }

    const [resultado] = await pool.query(
      `UPDATE reporte
       SET id_usuario_celador = ?, asunto = ?, cuerpo = ?, estado = ?, id_entrada_salida = ?
       WHERE id = ?`,
      [id_usuario_celador, asunto, cuerpo, estado ?? null, id_entrada_salida ?? null, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Reporte no encontrado' });
    }

    return res.json({ ok: true, mensaje: 'Reporte actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar el reporte:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al actualizar el reporte' });
  }
}
