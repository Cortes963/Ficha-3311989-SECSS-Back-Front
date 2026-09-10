/**
 * Backend module: controller/attention.controller.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import db from '../db.js';
import { actorId, error, integer, page, required, PQRS } from '../lib.js';

// GET /reportes: list reports with pagination.
export async function indexReport(req, res) {
  try {
    const { pagina, limite, offset } = page(req.query);

    const [[c]] = await db.query('SELECT COUNT(*) total FROM reporte');

    const [datos] = await db.query(
      `SELECT r.*, CONCAT(u.primer_nombre,' ',u.primer_apellido) celador
       FROM reporte r JOIN usuario u ON u.id=r.id_usuario_celador
       ORDER BY r.fecha_hora DESC LIMIT ? OFFSET ?`,
      [limite, offset]
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
    const args = own ? [] : [actorId(req)];

    const [[c]] = await db.query(`SELECT COUNT(*) total FROM pqrs p ${own}`, args);

    const [datos] = await db.query(
      `SELECT p.*, EXISTS(SELECT 1 FROM respuesta r WHERE r.id_pqrs=p.id) tiene_respuesta
       FROM pqrs p ${own} ORDER BY p.fecha_creacion DESC LIMIT ? OFFSET ?`,
      [...args, limite, offset]
    );

    res.json({ ok: true, pagina, limite, total: c.total, datos });
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

    res.status(201).json({ ok: true, id_pqrs: r.insertId });
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

export async function updatePqrsState(req, res) {
  try {
    const id = integer(req.params.id, 'id');
    const estado = Number(req.body.estado);

    if (!Object.values(PQRS).includes(estado)) {
      throw Object.assign(new Error('Estado PQRS inválido.'), { status: 400 });
    }

    const [r] = await db.query('UPDATE pqrs SET estado=? WHERE id=?', [estado, id]);
    if (!r.affectedRows) return res.status(404).json({ ok: false, mensaje: 'PQRS no encontrada.' });

    res.json({ ok: true, mensaje: 'Estado actualizado.' });
  } catch (e) {
    return error(res, e);
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

// POST /reportes: el celador autenticado radica un reporte sobre una entrada/salida.
export async function storeReport(req, res) {
  try {
    required(req.body, ['id_usuario_celador', 'asunto', 'cuerpo']);

    const idCelador = integer(req.body.id_usuario_celador, 'id_usuario_celador');
    const idEntradaSalida = req.body.id_entrada_salida !== undefined && req.body.id_entrada_salida !== null
      ? integer(req.body.id_entrada_salida, 'id_entrada_salida')
      : null;
    // reporte.estado es NOT NULL (0: NO_REVISADO, 1: REVISADO) según el DDL; nunca insertar NULL aquí.
    const estado = req.body.estado === undefined ? 0 : Number(req.body.estado);
    if (![0, 1].includes(estado)) {
      throw Object.assign(new Error('estado debe ser 0 o 1.'), { status: 400 });
    }

    const [celadorExiste] = await db.query('SELECT id FROM usuario WHERE id = ?', [idCelador]);
    if (!celadorExiste.length) {
      return res.status(404).json({ ok: false, mensaje: 'El usuario celador indicado no existe.' });
    }

    const [resultado] = await db.query(
      `INSERT INTO reporte (id_usuario_celador, fecha_hora, asunto, cuerpo, estado, id_entrada_salida)
       VALUES (?, NOW(), ?, ?, ?, ?)`,
      [idCelador, req.body.asunto, req.body.cuerpo, estado, idEntradaSalida]
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

    return res.json({ ok: true, datos: filas[0] });
  } catch (e) {
    return error(res, e);
  }
}
