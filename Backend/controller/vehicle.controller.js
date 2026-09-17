/**
 * Backend module: controller/vehicle.controller.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import db from '../db.js';
import { actorId, error, integer, required } from '../lib.js';
import { removeUploadedFile, saveUploadedFile } from '../services/fileStorage.service.js';

function parseJsonValue(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed || !['{', '['].includes(trimmed[0])) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeVehiclePayload(req) {
  const payload = { ...req.body };
  for (const key of ['detalles', 'detalle', 'detalle_moto', 'detalle_bicicleta']) {
    if (payload[key] !== undefined) {
      payload[key] = parseJsonValue(payload[key]);
    }
  }
  const subdetails = payload.detalles && typeof payload.detalles === 'object' ? payload.detalles : {};
  const motoDetails = payload.detalle_moto && typeof payload.detalle_moto === 'object' ? payload.detalle_moto : {};
  const bicicletaDetails = payload.detalle_bicicleta && typeof payload.detalle_bicicleta === 'object' ? payload.detalle_bicicleta : {};
  return { ...payload, ...subdetails, ...motoDetails, ...bicicletaDetails };
}

function normalizeVehicleRow(row) {
  const detalle = row.tipo_vehiculo === 'MOTO' ? {
    placa: row.placa ?? null,
    cilindraje: row.cilindraje ?? null,
    modelo: row.modelo ?? null,
    imagen_url_soat: row.imagen_url_soat ?? null,
    imagen_url_tecnomecanica_vigente: row.imagen_url_tecnomecanica_vigente ?? null
  } : {
    numero_marco: row.numero_marco ?? null,
    clase_bicicleta: row.clase_bicicleta ?? null
  };

  return {
    ...row,
    detalles: detalle,
    imagenes: {
      imagen_url_vehiculo: row.imagen_url_vehiculo ?? null,
      imagen_url_identificacion_vehiculo: row.imagen_url_identificacion_vehiculo ?? null,
      imagen_url_tarjeta_propiedad: row.imagen_url_tarjeta_propiedad ?? null,
      imagen_url_soat: row.imagen_url_soat ?? null,
      imagen_url_tecnomecanica_vigente: row.imagen_url_tecnomecanica_vigente ?? null
    }
  };
}

async function persistUploadedVehicleImages(connection, req, ownerId, payload, uploaded) {
  const names = [
    'imagen_url_tarjeta_propiedad',
    'imagen_url_identificacion_vehiculo',
    'imagen_url_vehiculo',
    'imagen_url_soat',
    'imagen_url_tecnomecanica_vigente'
  ];
  const nextPayload = { ...payload };

  for (const name of names) {
    const file = req.files?.[name]?.[0];
    if (!file) continue;
    const saved = await saveUploadedFile(file, ownerId);
    uploaded.push(saved.ruta);
    nextPayload[name] = saved.ruta;
    await connection.query(
      'INSERT INTO archivo (nombre_original, nombre_almacenado, mime_type, tamano, ruta, id_usuario_subida) VALUES (?, ?, ?, ?, ?, ?)',
      [saved.nombre_original, saved.nombre_almacenado, saved.mime_type, saved.tamano, saved.ruta, ownerId]
    );
  }

  return nextPayload;
}

function coalesceDetailValue(payload, keys) {
  for (const key of keys) {
    const value = payload[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

// GET /api/vehicle/me: returns every vehicle historically linked to the owner.
export async function indexVehicle(req, res) {
  try {
    const ownerId = actorId(req);

    const [vehicles] = await db.query(
      `SELECT v.*, av.estado AS estado_cupo,
              dm.placa, dm.cilindraje, dm.modelo,
              dm.imagen_url_soat, dm.imagen_url_tecnomecanica_vigente,
              dbi.numero_marco, dbi.clase_bicicleta
       FROM auth_vehiculo av
       INNER JOIN vehiculo v ON v.id = av.id_vehiculo
       LEFT JOIN detalle_moto dm ON dm.id_vehiculo = v.id
       LEFT JOIN detalle_bicicleta dbi ON dbi.id_vehiculo = v.id
       WHERE av.id_usuario = ?
       ORDER BY v.id DESC`,
      [ownerId]
    );

    return res.json({ ok: true, datos: vehicles.map(normalizeVehicleRow) });
  } catch (err) {
    return error(res, err);
  }
}

export async function showVehicle(req, res) {
  try {
    const vehicleId = integer(req.params.id, 'id');
    const ownerId = actorId(req);

    const [rows] = await db.query(
      `SELECT v.*, av.estado AS estado_cupo,
              dm.placa, dm.cilindraje, dm.modelo,
              dm.imagen_url_soat, dm.imagen_url_tecnomecanica_vigente,
              dbi.numero_marco, dbi.clase_bicicleta
       FROM auth_vehiculo av
       INNER JOIN vehiculo v ON v.id = av.id_vehiculo
       LEFT JOIN detalle_moto dm ON dm.id_vehiculo = v.id
       LEFT JOIN detalle_bicicleta dbi ON dbi.id_vehiculo = v.id
       WHERE av.id_usuario = ? AND av.id_vehiculo = ?`,
      [ownerId, vehicleId]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, mensaje: 'Vehículo no encontrado.' });
    }

    return res.json({ ok: true, datos: normalizeVehicleRow(rows[0]) });
  } catch (err) {
    return error(res, err);
  }
}

// POST /api/vehicle: creates a vehicle and an inactive quota pending approval.
export async function storeVehicle(req, res) {
  const connection = await db.getConnection();
  const uploaded = [];

  try {
    const payload = normalizeVehiclePayload(req);
    const ownerId = actorId(req);
    const prepared = await persistUploadedVehicleImages(connection, req, ownerId, payload, uploaded);
    const vehicleType = String(prepared.tipo_vehiculo ?? '').toUpperCase();

    required(prepared, ['tipo_vehiculo', 'marca', 'color']);

    if (!['MOTO', 'BICICLETA'].includes(vehicleType)) {
      throw Object.assign(new Error('tipo_vehiculo debe ser MOTO o BICICLETA.'), { status: 400 });
    }

    await connection.beginTransaction();

    await connection.query(
      'UPDATE auth_vehiculo SET estado = 0 WHERE id_usuario = ? AND estado = 1',
      [ownerId]
    );

    const [vehicleResult] = await connection.query(
      `INSERT INTO vehiculo (
         tipo_vehiculo, marca, color, imagen_url_tarjeta_propiedad,
         imagen_url_identificacion_vehiculo, imagen_url_vehiculo, estado
       ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [vehicleType, prepared.marca, prepared.color,
       prepared.imagen_url_tarjeta_propiedad ?? null,
       prepared.imagen_url_identificacion_vehiculo ?? null,
       prepared.imagen_url_vehiculo ?? null]
    );

    if (vehicleType === 'MOTO') {
      const motoData = {
        placa: coalesceDetailValue(prepared, ['placa', 'placa_moto']),
        cilindraje: coalesceDetailValue(prepared, ['cilindraje']),
        modelo: coalesceDetailValue(prepared, ['modelo']),
        imagen_url_soat: prepared.imagen_url_soat ?? null,
        imagen_url_tecnomecanica_vigente: prepared.imagen_url_tecnomecanica_vigente ?? null
      };
      required(motoData, ['placa', 'cilindraje', 'modelo']);
      await connection.query(
        `INSERT INTO detalle_moto (
           id_vehiculo, placa, cilindraje, modelo,
           imagen_url_soat, imagen_url_tecnomecanica_vigente
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [vehicleResult.insertId, motoData.placa, motoData.cilindraje,
         motoData.modelo, motoData.imagen_url_soat,
         motoData.imagen_url_tecnomecanica_vigente]
      );
    } else {
      const bikeData = {
        numero_marco: coalesceDetailValue(prepared, ['numero_marco', 'numeroMarco']),
        clase_bicicleta: coalesceDetailValue(prepared, ['clase_bicicleta', 'tipoBicicleta'])
      };
      required(bikeData, ['numero_marco', 'clase_bicicleta']);
      await connection.query(
        `INSERT INTO detalle_bicicleta (id_vehiculo, numero_marco, clase_bicicleta)
         VALUES (?, ?, ?)`,
        [vehicleResult.insertId, bikeData.numero_marco, bikeData.clase_bicicleta]
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
    await Promise.all(uploaded.map(removeUploadedFile));
    await connection.rollback();
    return error(res, err);
  } finally {
    connection.release();
  }
}

// PATCH /api/vehicle/:id: updates owner data and requires a new review.
export async function updateVehicle(req, res) {
  const connection = await db.getConnection();
  const uploaded = [];

  try {
    const vehicleId = integer(req.params.id, 'id');
    const ownerId = actorId(req);
    const payload = normalizeVehiclePayload(req);
    const prepared = await persistUploadedVehicleImages(connection, req, ownerId, payload, uploaded);

    const [ownership] = await connection.query(
      'SELECT v.tipo_vehiculo FROM auth_vehiculo av JOIN vehiculo v ON v.id = av.id_vehiculo WHERE av.id_usuario = ? AND av.id_vehiculo = ?',
      [ownerId, vehicleId]
    );

    if (!ownership.length) {
      return res.status(404).json({ ok: false, mensaje: 'Vehículo no encontrado.' });
    }

    await connection.beginTransaction();

    const vehicleType = ownership[0].tipo_vehiculo;
    const topLevelAssignments = [];
    const topLevelValues = [];
    const topLevelFields = [
      'marca', 'color', 'imagen_url_tarjeta_propiedad', 'imagen_url_identificacion_vehiculo', 'imagen_url_vehiculo'
    ];

    for (const field of topLevelFields) {
      if (prepared[field] !== undefined) {
        topLevelAssignments.push(`${field} = ?`);
        topLevelValues.push(prepared[field] ?? null);
      }
    }

    if (topLevelAssignments.length) {
      await connection.query(
        `UPDATE vehiculo SET ${topLevelAssignments.join(', ')} WHERE id = ?`,
        [...topLevelValues, vehicleId]
      );
    }

    if (vehicleType === 'MOTO') {
      const updateFields = [];
      const updateValues = [];
      for (const field of ['placa', 'cilindraje', 'modelo', 'imagen_url_soat', 'imagen_url_tecnomecanica_vigente']) {
        const value = prepared[field];
        if (value !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(value ?? null);
        }
      }
      if (updateFields.length) {
        const [detail] = await connection.query('SELECT 1 FROM detalle_moto WHERE id_vehiculo = ?', [vehicleId]);
        if (detail.length) {
          await connection.query(
            `UPDATE detalle_moto SET ${updateFields.join(', ')} WHERE id_vehiculo = ?`,
            [...updateValues, vehicleId]
          );
        } else {
          await connection.query(
            `INSERT INTO detalle_moto (id_vehiculo, placa, cilindraje, modelo, imagen_url_soat, imagen_url_tecnomecanica_vigente)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [vehicleId, prepared.placa ?? null, prepared.cilindraje ?? null, prepared.modelo ?? null, prepared.imagen_url_soat ?? null, prepared.imagen_url_tecnomecanica_vigente ?? null]
          );
        }
      }
    } else {
      const updateFields = [];
      const updateValues = [];
      for (const field of ['numero_marco', 'clase_bicicleta']) {
        const value = prepared[field] ?? prepared[field === 'numero_marco' ? 'numeroMarco' : 'tipoBicicleta'];
        if (value !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(value ?? null);
        }
      }
      if (updateFields.length) {
        const [detail] = await connection.query('SELECT 1 FROM detalle_bicicleta WHERE id_vehiculo = ?', [vehicleId]);
        if (detail.length) {
          await connection.query(
            `UPDATE detalle_bicicleta SET ${updateFields.join(', ')} WHERE id_vehiculo = ?`,
            [...updateValues, vehicleId]
          );
        } else {
          await connection.query(
            `INSERT INTO detalle_bicicleta (id_vehiculo, numero_marco, clase_bicicleta)
             VALUES (?, ?, ?)`,
            [vehicleId, prepared.numero_marco ?? null, prepared.clase_bicicleta ?? null]
          );
        }
      }
    }

    await connection.query(
      'UPDATE auth_vehiculo SET estado = 0 WHERE id_usuario = ? AND id_vehiculo = ?',
      [ownerId, vehicleId]
    );

    await connection.commit();
    return res.json({ ok: true, mensaje: 'Vehículo actualizado; cupo pendiente de revisión.' });
  } catch (err) {
    await Promise.all(uploaded.map(removeUploadedFile));
    await connection.rollback();
    return error(res, err);
  } finally {
    connection.release();
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
