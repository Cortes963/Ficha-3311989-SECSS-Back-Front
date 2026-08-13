// controllers/pqrsController.js
import pool from '../../db.js';

// Estados posibles de una PQRS
export const ESTADOS_PQRS = {
  PENDIENTE: 0,
  EN_PROCESO: 1,
  RESPONDIDA: 2,
  CERRADA: 3
};

// Radica una nueva PQRS para un usuario (aprendiz).
export async function crearPqrs(req, res) {
  try {
    const { id_usuario, asunto, cuerpo } = req.body;

    if (!id_usuario || !asunto || !cuerpo) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Los campos id_usuario, asunto y cuerpo son obligatorios'
      });
    }

    // Corregido: Se quitó el "export" interno de las variables
    const [usuarioExiste] = await pool.query('SELECT id FROM usuario WHERE id = ?', [id_usuario]);
    if (usuarioExiste.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'El usuario indicado no existe' });
    }

    const [resultado] = await pool.query(
      `INSERT INTO pqrs (id_usuario, asunto, cuerpo, estado, fecha_hora)
       VALUES (?, ?, ?, ?, NOW())`,
      [id_usuario, asunto, cuerpo, ESTADOS_PQRS.PENDIENTE]
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'PQRS radicada correctamente',
      id_pqrs: resultado.insertId
    });
  } catch (error) {
    console.error('Error al crear PQRS:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al crear la PQRS' });
  }
}

// Lista las PQRS. Admite filtros opcionales
export async function listarPqrs(req, res) {
  try {
    const { estado, id_usuario } = req.query;
    const pagina = Math.max(Number(req.query.pagina) || 1, 1);
    const limite = Math.min(Number(req.query.limite) || 20, 100);
    const desplazamiento = (pagina - 1) * limite;

    let sql = `
      SELECT
        p.id, p.asunto, p.estado, p.fecha_hora, p.id_usuario,
        CONCAT(u.primer_nombre, ' ', u.primer_apellido) AS solicitante,
        (r.id IS NOT NULL) AS tiene_respuesta
      FROM pqrs p
      INNER JOIN usuario u ON u.id = p.id_usuario
      LEFT JOIN respuesta r ON r.id_pqrs = p.id
      WHERE 1 = 1
    `;
    const parametros = [];

    if (estado !== undefined) {
      sql += ' AND p.estado = ?';
      parametros.push(estado);
    }
    if (id_usuario !== undefined) {
      sql += ' AND p.id_usuario = ?';
      parametros.push(id_usuario);
    }

    sql += ' ORDER BY p.fecha_hora DESC LIMIT ? OFFSET ?'; 
    parametros.push(limite, desplazamiento);

    const [filas] = await pool.query(sql, parametros);
    return res.json({ ok: true, pagina, limite, datos: filas });
  } catch (error) {
    console.error('Error al listar PQRS:', error);   
    return res.status(500).json({ ok: false, mensaje: 'Error interno al listar las PQRS' });
  }
}

// Detalle de una PQRS puntual, incluyendo su respuesta si ya existe.
export async function obtenerPqrsPorId(req, res) {
  try {
    const { id } = req.params;

    const [pqrsFilas] = await pool.query(
      `SELECT
         p.id, p.asunto, p.cuerpo, p.estado, p.fecha_hora, p.id_usuario,
         CONCAT(u.primer_nombre, ' ', u.primer_apellido) AS solicitante
       FROM pqrs p
       INNER JOIN usuario u ON u.id = p.id_usuario
       WHERE p.id = ?`,
      [id]
    );

    if (pqrsFilas.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'PQRS no encontrada' });
    }

    const [respuestaFilas] = await pool.query(
      `SELECT
         r.id, r.asunto, r.cuerpo, r.id_usuario_administrador,
         CONCAT(a.primer_nombre, ' ', a.primer_apellido) AS administrador
       FROM respuesta r
       INNER JOIN usuario a ON a.id = r.id_usuario_administrador
       WHERE r.id_pqrs = ?`,
      [id]
    );

    return res.json({
      ok: true,
      datos: {
        ...pqrsFilas[0],
        respuesta: respuestaFilas[0] || null
      }
    });
  } catch (error) {
    console.error('Error al obtener la PQRS:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno al obtener la PQRS' });
  }
}

// Registra la respuesta de un administrador a una PQRS puntual.
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

    await conexion.query('UPDATE pqrs SET estado = ? WHERE id = ?', [ESTADOS_PQRS.RESPONDIDA, id]);

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

// Permite cambiar el estado de una PQRS
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
};