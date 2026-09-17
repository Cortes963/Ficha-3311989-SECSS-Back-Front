/**
 * Backend module: controller/attention.controller.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import db from '../db.js';
import { actorId, assertEditableWithinWindow, error, integer, page, required, PQRS } from '../lib.js';

// GET /reportes: list reports with pagination.
export async function indexReport(req, res) {
  try {
    const { pagina, limite, offset } = page(req.query);
    const own = req.user.roles.includes('CELADOR') && !req.user.roles.includes('JEFE_SEGURIDAD');
    const where = own ? 'WHERE r.id_usuario_celador=?' : '';
    const args = own ? [actorId(req)] : [];

    const [[c]] = await db.query(`SELECT COUNT(*) total FROM reporte r ${where}`, args);

    const [datos] = await db.query(
      `SELECT r.*, CONCAT(u.primer_nombre,' ',u.primer_apellido) celador
       FROM reporte r JOIN usuario u ON u.id=r.id_usuario_celador
       ${where} ORDER BY r.fecha_hora DESC LIMIT ? OFFSET ?`,
      [...args, limite, offset]
    );

    res.json({ ok: true, pagina, limite, total: c.total, datos });
  } catch (e) {
    return error(res, e);
  }
}

export async function indexPqrs(req, res) {
  try {
    const { pagina, limite, offset } = page(req.query);
    const own = req.user.roles.includes('ADMINISTRADOR') ? '' : 'WHERE p.id_usuario=?';
    const args = own ? [actorId(req)] : [];

    const [[c]] = await db.query(`SELECT COUNT(*) total FROM pqrs p ${own}`, args);

    const [datos] = await db.query(
      `SELECT p.*, u.primer_nombre, u.primer_apellido,
              r.id AS respuesta_id, r.asunto AS respuesta_asunto, r.cuerpo AS respuesta_cuerpo,
              r.created_at AS respuesta_fecha, r.id_usuario_administrador AS respuesta_id_usuario,
              CONCAT(ra.primer_nombre,' ',ra.primer_apellido) AS respuesta_respondiente,
              EXISTS(SELECT 1 FROM respuesta rx WHERE rx.id_pqrs=p.id) tiene_respuesta
       FROM pqrs p JOIN usuario u ON u.id=p.id_usuario
       LEFT JOIN respuesta r ON r.id_pqrs=p.id
       LEFT JOIN usuario ra ON ra.id=r.id_usuario_administrador
       ${own}
       ORDER BY p.fecha_creacion DESC LIMIT ? OFFSET ?`,
      [...args, limite, offset]
    );

    res.json({ ok: true, pagina, limite, total: c.total, datos });
  } catch (e) {
    return error(res, e);
  }
}

// GET /pqrs/:id: el propio solicitante o un administrador pueden ver el detalle.
export async function showPqrsId(req, res) {
  try {
    const id = integer(req.params.id, 'id');

    const [filas] = await db.query(
      `SELECT p.*, u.primer_nombre, u.primer_apellido,
              r.id AS respuesta_id, r.asunto AS respuesta_asunto, r.cuerpo AS respuesta_cuerpo,
              r.created_at AS respuesta_fecha, r.id_usuario_administrador AS respuesta_id_usuario,
              CONCAT(ra.primer_nombre,' ',ra.primer_apellido) AS respuesta_respondiente,
              EXISTS(SELECT 1 FROM respuesta rx WHERE rx.id_pqrs=p.id) tiene_respuesta
       FROM pqrs p JOIN usuario u ON u.id=p.id_usuario
       LEFT JOIN respuesta r ON r.id_pqrs=p.id
       LEFT JOIN usuario ra ON ra.id=r.id_usuario_administrador
       WHERE p.id=?`,
      [id]
    );

    if (!filas.length) return res.status(404).json({ ok: false, mensaje: 'PQRS no encontrada.' });

    const esDueno = filas[0].id_usuario === actorId(req);
    const esAdmin = req.user.roles.includes('ADMINISTRADOR');
    if (!esDueno && !esAdmin) return res.status(403).json({ ok: false, mensaje: 'No tiene permisos para esta operación.' });

    res.json({ ok: true, datos: filas[0] });
  } catch (e) {
    return error(res, e);
  }
}

export async function storePqrs(req, res) {
  try {
    required(req.body, ['asunto', 'cuerpo']);

    const [r] = await db.query(
      'INSERT INTO pqrs (id_usuario,asunto,cuerpo,estado) VALUES (?,?,?,?)',
      [actorId(req), req.body.asunto, req.body.cuerpo, PQRS.RADICADO]
    );

    res.status(201).json({ ok: true, mensaje: 'PQRS radicada.', id_pqrs: r.insertId });
  } catch (e) {
    return error(res, e);
  }
}

// PUT /pqrs/:id: el propio solicitante puede editar asunto/cuerpo mientras no tenga respuesta.
export async function updatePqrs(req, res) {
  try {
    const id = integer(req.params.id, 'id');
    required(req.body, ['asunto', 'cuerpo']);

    const [filas] = await db.query('SELECT id_usuario, estado, fecha_creacion FROM pqrs WHERE id=?', [id]);
    if (!filas.length) return res.status(404).json({ ok: false, mensaje: 'PQRS no encontrada.' });
    if (filas[0].id_usuario !== actorId(req)) return res.status(403).json({ ok: false, mensaje: 'No tiene permisos para esta operación.' });
    if (filas[0].estado !== PQRS.RADICADO) throw Object.assign(new Error('Solo se puede editar una PQRS en estado RADICADO.'), { status: 409 });
    assertEditableWithinWindow(filas[0].fecha_creacion, 'La PQRS');

    await db.query('UPDATE pqrs SET asunto=?,cuerpo=? WHERE id=?', [req.body.asunto, req.body.cuerpo, id]);
    res.json({ ok: true, mensaje: 'PQRS actualizada.' });
  } catch (e) {
    return error(res, e);
  }
}

export async function storePqrsAnswer(req, res) {
  const c = await db.getConnection();
  try {
    required(req.body, ['asunto', 'cuerpo']);
    const id = integer(req.params.id, 'id');

    await c.beginTransaction();

    const [p] = await c.query('SELECT id FROM pqrs WHERE id=? FOR UPDATE', [id]);
    if (!p.length) throw Object.assign(new Error('PQRS no encontrada.'), { status: 404 });

    const [exists] = await c.query('SELECT id FROM respuesta WHERE id_pqrs=?', [id]);
    if (exists.length) throw Object.assign(new Error('La PQRS ya fue respondida.'), { status: 409 });

    await c.query(
      'INSERT INTO respuesta (id_pqrs,id_usuario_administrador,asunto,cuerpo) VALUES (?,?,?,?)',
      [id, actorId(req), req.body.asunto, req.body.cuerpo]
    );
    await c.query('UPDATE pqrs SET estado=? WHERE id=?', [PQRS.RESUELTO, id]);

    await c.commit();
    res.status(201).json({ ok: true, mensaje: 'Respuesta registrada.' });
  } catch (e) {
    await c.rollback();
    return error(res, e);
  } finally {
    c.release();
  }
}

export async function indexAnswer(req, res) {
  try {
    const [datos] = await db.query('SELECT * FROM respuesta ORDER BY id DESC');
    res.json({ ok: true, datos });
  } catch (e) {
    return error(res, e);
  }
}

// GET /pqrs/:id/respuesta: el propio solicitante o un administrador consultan la respuesta.
export async function showPqrsAnswer(req, res) {
  try {
    const idPqrs = integer(req.params.id, 'id');

    const [pqrsRows] = await db.query('SELECT id_usuario FROM pqrs WHERE id=?', [idPqrs]);
    if (!pqrsRows.length) return res.status(404).json({ ok: false, mensaje: 'PQRS no encontrada.' });

    const esDueno = pqrsRows[0].id_usuario === actorId(req);
    const esAdmin = req.user.roles.includes('ADMINISTRADOR');
    if (!esDueno && !esAdmin) return res.status(403).json({ ok: false, mensaje: 'No tiene permisos para esta operación.' });

    const [respuestas] = await db.query('SELECT * FROM respuesta WHERE id_pqrs=?', [idPqrs]);
    if (!respuestas.length) return res.status(404).json({ ok: false, mensaje: 'Esta PQRS aún no tiene respuesta.' });

    res.json({ ok: true, datos: respuestas[0] });
  } catch (e) {
    return error(res, e);
  }
}

// PUT /respuestas/:id: un administrador corrige el contenido de una respuesta ya registrada.
export async function updateAnswer(req, res) {
  try {
    const id = integer(req.params.id, 'id');
    required(req.body, ['asunto', 'cuerpo']);

    const [rows] = await db.query('SELECT created_at FROM respuesta WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ ok: false, mensaje: 'Respuesta no encontrada.' });
    assertEditableWithinWindow(rows[0].created_at, 'La respuesta');
    const [r] = await db.query('UPDATE respuesta SET asunto=?,cuerpo=? WHERE id=?', [req.body.asunto, req.body.cuerpo, id]);
    if (!r.affectedRows) return res.status(404).json({ ok: false, mensaje: 'Respuesta no encontrada.' });

    res.json({ ok: true, mensaje: 'Respuesta actualizada.' });
  } catch (e) {
    return error(res, e);
  }
}

// POST /reportes: el celador autenticado radica un reporte sobre una entrada/salida.
export async function storeReport(req, res) {
  try {
    required(req.body, ['asunto', 'cuerpo']);

    const idCelador = actorId(req);
    const idEntradaSalida = req.body.id_entrada_salida !== undefined && req.body.id_entrada_salida !== null
      ? integer(req.body.id_entrada_salida, 'id_entrada_salida')
      : null;
    // reporte.estado es NOT NULL (0: NO_REVISADO, 1: REVISADO) según el DDL; nunca insertar NULL aquí.
    const [celadorExiste] = await db.query('SELECT id FROM usuario WHERE id = ?', [idCelador]);
    if (!celadorExiste.length) {
      return res.status(404).json({ ok: false, mensaje: 'El usuario celador indicado no existe.' });
    }

    const [resultado] = await db.query(
      `INSERT INTO reporte (id_usuario_celador, fecha_hora, asunto, cuerpo, estado, id_entrada_salida)
       VALUES (?, NOW(), ?, ?, 0, ?)`,
      [idCelador, req.body.asunto, req.body.cuerpo, idEntradaSalida]
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'Reporte registrado correctamente.',
      id_reporte: resultado.insertId
    });
  } catch (e) {
    return error(res, e);
  }
}

// GET /reportes/:id
export async function showReportId(req, res) {
  try {
    const id = integer(req.params.id, 'id');

    const [filas] = await db.query(
      `SELECT r.id, r.asunto, r.cuerpo, r.estado, r.fecha_hora, r.id_usuario_celador, r.id_entrada_salida,
              CONCAT(u.primer_nombre, ' ', u.primer_apellido) AS celador
       FROM reporte r
       INNER JOIN usuario u ON u.id = r.id_usuario_celador
       WHERE r.id = ?`,
      [id]
    );

    if (!filas.length) {
      return res.status(404).json({ ok: false, mensaje: 'Reporte no encontrado.' });
    }
    if (req.user.roles.includes('CELADOR') && filas[0].id_usuario_celador !== actorId(req)) {
      return res.status(403).json({ ok: false, mensaje: 'No tiene permisos para este reporte.' });
    }

    return res.json({ ok: true, datos: filas[0] });
  } catch (e) {
    return error(res, e);
  }
}

// PUT /reportes/:id: corrige únicamente el contenido de un reporte ya radicado.
export async function updateReport(req, res) {
  try {
    const id = integer(req.params.id, 'id');
    const [owner] = await db.query('SELECT id_usuario_celador, fecha_hora FROM reporte WHERE id=?', [id]);
    if (!owner.length) return res.status(404).json({ ok: false, mensaje: 'Reporte no encontrado.' });
    if (owner[0].id_usuario_celador !== actorId(req)) {
      return res.status(403).json({ ok: false, mensaje: 'Solo puede editar sus propios reportes.' });
    }
    assertEditableWithinWindow(owner[0].fecha_hora, 'El reporte');

    const allowedFields = ['asunto', 'cuerpo'];
    const assignments = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        assignments.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (!assignments.length) {
      throw Object.assign(new Error('No hay campos actualizables.'), { status: 400 });
    }

    const [resultado] = await db.query(`UPDATE reporte SET ${assignments.join(', ')} WHERE id = ? AND id_usuario_celador = ?`, [...values, id, actorId(req)]);
    if (!resultado.affectedRows) return res.status(404).json({ ok: false, mensaje: 'Reporte no encontrado.' });

    return res.json({ ok: true, mensaje: 'Reporte actualizado.' });
  } catch (e) {
    return error(res, e);
  }
}

// DELETE /reportes/:id
export async function destroyReport(req, res) {
  try {
    const id = integer(req.params.id, 'id');

    const [resultado] = await db.query('DELETE FROM reporte WHERE id = ?', [id]);
    if (!resultado.affectedRows) return res.status(404).json({ ok: false, mensaje: 'Reporte no encontrado.' });

    return res.json({ ok: true, mensaje: 'Reporte eliminado.' });
  } catch (e) {
    return error(res, e);
  }
}
