/**
 * Backend module: controller/input_output.controller.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import db from '../db.js';
import { actorId, error, integer, page, required } from '../lib.js';

export async function indexInputOutput(req, res) {
  try {
    const { pagina, limite, offset } = page(req.query);
    const params = [];
    const filters = [];

    if (req.query.id_usuario) {
      filters.push('es.id_usuario_entra = ?');
      params.push(integer(req.query.id_usuario, 'id_usuario'));
    }

    if (req.query.id_vehiculo) {
      filters.push('es.id_vehiculo = ?');
      params.push(integer(req.query.id_vehiculo, 'id_vehiculo'));
    }

    if (req.query.estado === 'DENTRO') {
      filters.push('es.fecha_hora_salida IS NULL');
    }

    if (req.query.estado === 'FUERA') {
      filters.push('es.fecha_hora_salida IS NOT NULL');
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [[count]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM entrada_salida es
       ${where}`,
      params
    );

    const [rows] = await db.query(
      `SELECT
         es.id,
         es.id_usuario_entra,
         es.id_vehiculo,
         es.fecha_hora_ingreso,
         es.fecha_hora_salida,
         es.id_usuario_celador_ingreso,
         es.id_usuario_celador_salida,
         CONCAT(u.primer_nombre, ' ', u.primer_apellido) AS propietario,
         v.tipo_vehiculo,
         v.marca,
         dm.placa,
         dbi.numero_marco
       FROM entrada_salida es
       INNER JOIN usuario u ON u.id = es.id_usuario_entra
       INNER JOIN vehiculo v ON v.id = es.id_vehiculo
       LEFT JOIN detalle_moto dm ON dm.id_vehiculo = v.id
       LEFT JOIN detalle_bicicleta dbi ON dbi.id_vehiculo = v.id
       ${where}
       ORDER BY es.fecha_hora_ingreso DESC
       LIMIT ? OFFSET ?`,
      [...params, limite, offset]
    );

    return res.json({
      ok: true,
      pagina,
      limite,
      total: count.total,
      datos: rows
    });
  } catch (err) {
    return error(res, err);
  }
}

export async function storeInputOutput(req, res) {
  const connection = await db.getConnection();

  try {
    required(req.body, ['id_usuario_entra', 'id_vehiculo']);

    const idUsuario = integer(req.body.id_usuario_entra, 'id_usuario_entra');
    const idVehiculo = integer(req.body.id_vehiculo, 'id_vehiculo');
    const idCelador = actorId(req);

    await connection.beginTransaction();

    const [quota] = await connection.query(
      `SELECT id_usuario, id_vehiculo
       FROM auth_vehiculo
       WHERE id_usuario = ?
         AND id_vehiculo = ?
         AND estado = 1
       FOR UPDATE`,
      [idUsuario, idVehiculo]
    );

    if (!quota.length) {
      throw Object.assign(
        new Error('El usuario no tiene un cupo activo para ese vehículo.'),
        { status: 403 }
      );
    }

    const [openEntry] = await connection.query(
      `SELECT id
       FROM entrada_salida
       WHERE id_vehiculo = ?
         AND fecha_hora_salida IS NULL
       FOR UPDATE`,
      [idVehiculo]
    );

    if (openEntry.length) {
      throw Object.assign(
        new Error('El vehículo ya tiene una entrada abierta.'),
        { status: 409 }
      );
    }

    const [result] = await connection.query(
      `INSERT INTO entrada_salida (
         id_usuario_entra,
         id_vehiculo,
         fecha_hora_ingreso,
         id_usuario_celador_ingreso
       ) VALUES (?, ?, NOW(), ?)`,
      [idUsuario, idVehiculo, idCelador]
    );

    await connection.commit();

    return res.status(201).json({
      ok: true,
      mensaje: 'Entrada registrada correctamente.',
      id_entrada_salida: result.insertId
    });
  } catch (err) {
    await connection.rollback();
    return error(res, err);
  } finally {
    connection.release();
  }
}

export async function updateInputOutputExit(req, res) {
  const connection = await db.getConnection();

  try {
    const idEntrada = integer(req.params.id, 'id');
    const idCelador = actorId(req);

    await connection.beginTransaction();

    const [entries] = await connection.query(
      `SELECT id, fecha_hora_salida
       FROM entrada_salida
       WHERE id = ?
       FOR UPDATE`,
      [idEntrada]
    );

    if (!entries.length) {
      throw Object.assign(
        new Error('Registro de entrada no encontrado.'),
        { status: 404 }
      );
    }

    if (entries[0].fecha_hora_salida) {
      throw Object.assign(
        new Error('Este registro ya tiene una salida.'),
        { status: 409 }
      );
    }

    await connection.query(
      `UPDATE entrada_salida
       SET fecha_hora_salida = NOW(),
           id_usuario_celador_salida = ?
       WHERE id = ?`,
      [idCelador, idEntrada]
    );

    await connection.commit();

    return res.json({
      ok: true,
      mensaje: 'Salida registrada correctamente.'
    });
  } catch (err) {
    await connection.rollback();
    return error(res, err);
  } finally {
    connection.release();
  }
}
