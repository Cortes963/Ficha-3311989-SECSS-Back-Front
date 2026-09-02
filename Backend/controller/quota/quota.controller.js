import pool from '../../db.js';

export const obtenerCupos = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         av.id_usuario, av.id_vehiculo, av.estado, av.id_usuario_administrador,
         u.numero_documento, u.primer_nombre, u.primer_apellido,
         v.tipo_vehiculo, v.marca, v.color,
         dm.placa, db_.numero_marco
       FROM auth_vehiculo av
       INNER JOIN usuario u ON av.id_usuario = u.id
       INNER JOIN vehiculo v ON av.id_vehiculo = v.id
       LEFT JOIN detalle_moto dm ON dm.id_vehiculo = v.id
       LEFT JOIN detalle_bicicleta db_ ON db_.id_vehiculo = v.id`
    );
    res.json({ status: 'success', data: rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Detalle de cupo/vehículo de UN usuario, incluyendo si está adentro ahora
// mismo y el id del registro de entrada abierto (para poder registrar salida).
export const obtenerCupoPorUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const [vehiculos] = await pool.query(
      `SELECT
         av.estado AS estado_cupo, av.id_usuario_administrador,
         v.id AS id_vehiculo, v.tipo_vehiculo, v.marca, v.color,
         v.imagen_url_tarjeta_propiedad, v.imagen_url_identificacion_vehiculo, v.imagen_url_vehiculo,
         dm.placa, dm.cilindraje, dm.modelo, dm.imagen_url_soat, dm.imagen_url_tecnomecanica_vigente,
         db_.numero_marco, db_.clase_bicicleta
       FROM auth_vehiculo av
       INNER JOIN vehiculo v ON av.id_vehiculo = v.id
       LEFT JOIN detalle_moto dm ON dm.id_vehiculo = v.id
       LEFT JOIN detalle_bicicleta db_ ON db_.id_vehiculo = v.id
       WHERE av.id_usuario = ?
       LIMIT 1`,
      [id]
    );

    const vehiculo = vehiculos[0] || null;
    let vehiculoEnParqueadero = false;
    let idEntradaAbierta = null;

    if (vehiculo) {
      const [abiertos] = await pool.query(
        `SELECT id FROM entrada_salida
         WHERE id_vehiculo = ? AND fecha_hora_salida IS NULL
         ORDER BY fecha_hora_ingreso DESC LIMIT 1`,
        [vehiculo.id_vehiculo]
      );
      if (abiertos.length > 0) {
        vehiculoEnParqueadero = true;
        idEntradaAbierta = abiertos[0].id;
      }
    }

    res.json({ status: 'success', data: { vehiculo, vehiculoEnParqueadero, idEntradaAbierta } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const asignarCupo = async (req, res) => {
  const { id_usuario, id_vehiculo, estado, id_usuario_administrador } = req.body;

  if (!id_usuario || !id_vehiculo || estado === undefined || !id_usuario_administrador) {
    return res.status(400).json({ status: 'error', message: 'Faltan datos requeridos para la asignación de cupo' });
  }

  try {
    const query = `
      INSERT INTO auth_vehiculo (id_usuario, id_vehiculo, estado, id_usuario_administrador)
      VALUES (?, ?, ?, ?)
    `;
    await pool.query(query, [id_usuario, id_vehiculo, estado, id_usuario_administrador]);
    res.status(201).json({ status: 'success', message: 'Cupo asignado correctamente' });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ status: 'error', message: 'id_usuario, id_vehiculo o id_usuario_administrador no corresponden a un registro existente' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Habilitar / deshabilitar un cupo ya existente.
export const actualizarEstadoCupo = async (req, res) => {
  const { idUsuario, idVehiculo } = req.params;
  const { estado } = req.body;

  if (estado === undefined) {
    return res.status(400).json({ status: 'error', message: 'Falta el campo estado' });
  }

  try {
    const [resultado] = await pool.query(
      'UPDATE auth_vehiculo SET estado = ? WHERE id_usuario = ? AND id_vehiculo = ?',
      [estado, idUsuario, idVehiculo]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'No existe ese cupo (usuario + vehículo)' });
    }

    res.json({ status: 'success', message: 'Estado del cupo actualizado' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
