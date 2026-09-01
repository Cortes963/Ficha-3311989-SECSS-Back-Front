import pool from '../../db.js';
import { ESTADOS_PQRS } from './estados.js';

/**
 * Radica ("file") una nueva PQRS para un usuario (aprendiz).
 */
export async function crearPqrs(req, res) {
  try {
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
      `INSERT INTO pqrs (id_usuario, asunto, cuerpo, estado, fecha_creacion)
       VALUES (?, ?, ?, ?, NOW())`,
      [id_usuario, asunto, cuerpo, ESTADOS_PQRS.RADICADO]
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'PQRS radicada correctamente',
      id_pqrs: resultado.insertId
    });
  } catch (error) {
    console.error('Error al radicar PQRS:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al radicar la PQRS' });
  }
}
