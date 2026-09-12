/**
 * Backend module: controller/vehicle.controller.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import db from '../db.js';
import { actorId, error, integer, required } from '../lib.js';

// GET /api/vehicle/me: returns every vehicle historically linked to the owner.
export async function indexVehicle(req, res) {
  try {
    const ownerId = actorId(req);

    const [vehicles] = await db.query(
      `SELECT v.*, av.estado AS estado_cupo,
              dm.placa, dm.cilindraje, dm.modelo,
              dbi.numero_marco, dbi.clase_bicicleta
       FROM auth_vehiculo av
       INNER JOIN vehiculo v ON v.id = av.id_vehiculo
       LEFT JOIN detalle_moto dm ON dm.id_vehiculo = v.id
       LEFT JOIN detalle_bicicleta dbi ON dbi.id_vehiculo = v.id
       WHERE av.id_usuario = ?
       ORDER BY v.id DESC`,
      [ownerId]
    );

    return res.json({ ok: true, datos: vehicles });
  } catch (err) {
    return error(res, err);
  }
}

// POST /api/vehicle: creates a vehicle and an inactive quota pending approval.
export async function storeVehicle(req, res) {
  const connection = await db.getConnection();

  try {
    required(req.body, [
      'tipo_vehiculo', 'marca', 'color', 'imagen_url_tarjeta_propiedad',
      'imagen_url_identificacion_vehiculo', 'imagen_url_vehiculo'
    ]);

    const ownerId = actorId(req);
    const vehicleType = String(req.body.tipo_vehiculo).toUpperCase();

    if (!['MOTO', 'BICICLETA'].includes(vehicleType)) {
      throw Object.assign(new Error('tipo_vehiculo debe ser MOTO o BICICLETA.'), { status: 400 });
    }

    await connection.beginTransaction();

    // Business rule: one active vehicle quota per owner.
    await connection.query(
      'UPDATE auth_vehiculo SET estado = 0 WHERE id_usuario = ? AND estado = 1',
      [ownerId]
    );

    const [vehicleResult] = await connection.query(
      `INSERT INTO vehiculo (
         tipo_vehiculo, marca, color, imagen_url_tarjeta_propiedad,
         imagen_url_identificacion_vehiculo, imagen_url_vehiculo, estado
       ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [vehicleType, req.body.marca, req.body.color,
       req.body.imagen_url_tarjeta_propiedad,
       req.body.imagen_url_identificacion_vehiculo,
       req.body.imagen_url_vehiculo]
    );

    if (vehicleType === 'MOTO') {
      required(req.body, ['placa', 'cilindraje', 'modelo', 'imagen_url_soat', 'imagen_url_tecnomecanica_vigente']);
      await connection.query(
        `INSERT INTO detalle_moto (
           id_vehiculo, placa, cilindraje, modelo,
           imagen_url_soat, imagen_url_tecnomecanica_vigente
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [vehicleResult.insertId, req.body.placa, req.body.cilindraje,
         req.body.modelo, req.body.imagen_url_soat,
         req.body.imagen_url_tecnomecanica_vigente]
      );
    } else {
      required(req.body, ['numero_marco', 'clase_bicicleta']);
      await connection.query(
        `INSERT INTO detalle_bicicleta (id_vehiculo, numero_marco, clase_bicicleta)
         VALUES (?, ?, ?)`,
        [vehicleResult.insertId, req.body.numero_marco, req.body.clase_bicicleta]
      );
    }

    await connection.query(
      `INSERT INTO auth_vehiculo (
         id_usuario, id_vehiculo, estado, id_usuario_administrador
       ) VALUES (?, ?, 0, NULL)`,
      [ownerId, vehicleResult.insertId]
    );

    await connection.commit();

    return res.status(201).json({
      ok: true,
      id_vehiculo: vehicleResult.insertId,
      mensaje: 'Vehículo registrado; cupo pendiente de aprobación.'
    });
  } catch (err) {
    await connection.rollback();
    return error(res, err);
  } finally {
    connection.release();
  }
}

// PATCH /api/vehicle/:id: updates owner data and requires a new review.
export async function updateVehicle(req, res) {
  try {
    const vehicleId = integer(req.params.id, 'id');
    const ownerId = actorId(req);

    const [ownership] = await db.query(
      'SELECT 1 FROM auth_vehiculo WHERE id_usuario = ? AND id_vehiculo = ?',
      [ownerId, vehicleId]
    );

    if (!ownership.length) {
      return res.status(404).json({ ok: false, mensaje: 'Vehículo no encontrado.' });
    }

    const allowedFields = [
      'marca', 'color', 'imagen_url_tarjeta_propiedad',
      'imagen_url_identificacion_vehiculo', 'imagen_url_vehiculo'
    ];
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

    await db.query(
      `UPDATE vehiculo SET ${assignments.join(', ')} WHERE id = ?`,
      [...values, vehicleId]
    );

    await db.query(
      'UPDATE auth_vehiculo SET estado = 0 WHERE id_usuario = ? AND id_vehiculo = ?',
      [ownerId, vehicleId]
    );

    return res.json({ ok: true, mensaje: 'Vehículo actualizado; cupo pendiente de revisión.' });
  } catch (err) {
    return error(res, err);
  }
}

// PATCH /api/vehicle/:id/inactivar: preserves audit history and disables the quota.
export async function destroyVehicle(req, res) {
  try {
    const [result] = await db.query(
      'UPDATE auth_vehiculo SET estado = 0 WHERE id_usuario = ? AND id_vehiculo = ? AND estado = 1',
      [actorId(req), integer(req.params.id, 'id')]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, mensaje: 'Vehículo no encontrado o ya estaba inactivo.' });
    }

    return res.json({ ok: true, mensaje: 'Vehículo inactivado.' });
  } catch (err) {
    return error(res, err);
  }
}

