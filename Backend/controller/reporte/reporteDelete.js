import pool from '../../db.js';

export async function destroyReport(req, res) {
  try {
    const { id } = req.params;

    const [resultado] = await pool.query('DELETE FROM reporte WHERE id = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Reporte no encontrado' });
    }

    return res.json({ ok: true, mensaje: 'Reporte eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar el reporte:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al eliminar el reporte' });
  }
}
