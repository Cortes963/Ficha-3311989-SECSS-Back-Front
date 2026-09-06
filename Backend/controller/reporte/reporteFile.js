import pool from '../../db.js';

/**
 * Crea un reporte, registrado por un usuario con rol celador
 * (relacion REPORTE_CELADOR). `id_entrada_salida` es opcional
 * (relacion REPORTE_REGISTRO, columna nullable en el DDL).
 */
export async function crearReporte(req, res) {
  try {
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
      `INSERT INTO reporte (id_usuario_celador, fecha_hora, asunto, cuerpo, estado, id_entrada_salida)
       VALUES (?, NOW(), ?, ?, ?, ?)`,
      [id_usuario_celador, asunto, cuerpo, estado ?? null, id_entrada_salida ?? null]
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'Reporte registrado correctamente',
      id_reporte: resultado.insertId
    });
  } catch (error) {
    console.error('Error al registrar el reporte:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al registrar el reporte' });
  }
}
