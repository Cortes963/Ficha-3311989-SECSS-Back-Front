import pool from '../../db.js';
import { ESTADOS_PQRS } from './estados.js';

/**
 * Registra la respuesta de un administrador a una PQRS puntual.
 * La relación pqrs -> respuesta es 1 a 1 (uc_id_pqrs en el DDL), por eso se
 * valida primero que no exista ya una respuesta antes de insertar.
 */
export async function responderPqrs(req, res) {
  const { id } = req.params;
  const { id_usuario_administrador, asunto, cuerpo } = req.body;

  if (!id_usuario_administrador || !asunto || !cuerpo) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Los campos id_usuario_administrador, asunto y cuerpo son obligatorios'
    });
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    const [pqrsFilas] = await conexion.query('SELECT id FROM pqrs WHERE id = ? FOR UPDATE', [id]);
    if (pqrsFilas.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ ok: false, mensaje: 'PQRS no encontrada' });
    }

    const [respuestaExistente] = await conexion.query('SELECT id FROM respuesta WHERE id_pqrs = ?', [id]);
    if (respuestaExistente.length > 0) {
      await conexion.rollback();
      return res.status(409).json({ ok: false, mensaje: 'Esta PQRS ya tiene una respuesta registrada' });
    }

    await conexion.query(
      `INSERT INTO respuesta (id_pqrs, id_usuario_administrador, asunto, cuerpo)
       VALUES (?, ?, ?, ?)`,
      [id, id_usuario_administrador, asunto, cuerpo]
    );

    await conexion.query('UPDATE pqrs SET estado = ? WHERE id = ?', [ESTADOS_PQRS.RESUELTO, id]);

    await conexion.commit();
    return res.status(201).json({ ok: true, mensaje: 'Respuesta registrada correctamente' });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al responder la PQRS:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al responder la PQRS' });
  } finally {
    conexion.release();
  }
}
