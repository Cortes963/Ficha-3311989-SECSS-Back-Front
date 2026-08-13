import pool from '../../db.js';


//crear registro de vehiculo
 export const crearRegistroVehiculo = async (req, res) => {
  const {
    tipo_vehiculo, marca, color,
    imagen_url_targeta_propiedad, imagen_url_identificacion_vehiculo, imagen_url_vehiculo,
    placa, cilindraje, modelo, imagen_url_soat, imagen_url_tecnomecanica_vigente,
    numero_marco, clase_bicicleta
  } = req.body;

  if (!tipo_vehiculo || !marca || !color || !imagen_url_targeta_propiedad || !imagen_url_identificacion_vehiculo || !imagen_url_vehiculo) {
    return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios del vehículo' });
  }

  if (tipo_vehiculo === 'moto') {
    if (!placa || !cilindraje || !modelo || !imagen_url_soat || !imagen_url_tecnomecanica_vigente) {
      return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios de la moto' });
    }
  } else if (tipo_vehiculo === 'bicicleta') {
    if (!numero_marco || !clase_bicicleta) {
      return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios de la bicicleta' });
    }
  } else {
    return res.status(400).json({ status: 'error', message: 'tipo_vehiculo debe ser "moto" o "bicicleta"' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const queryVehiculo = `
      INSERT INTO vehiculo 
      (tipo_vehiculo, marca, color, imagen_url_targeta_propiedad, imagen_url_identificacion_vehiculo, imagen_url_vehiculo)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [resultVehiculo] = await connection.query(queryVehiculo, [
      tipo_vehiculo, marca, color,
      imagen_url_targeta_propiedad, imagen_url_identificacion_vehiculo, imagen_url_vehiculo
    ]);

    const idVehiculo = resultVehiculo.insertId;

    if (tipo_vehiculo === 'moto') {
      await crearDetalleMoto(connection, idVehiculo, { placa, cilindraje, modelo, imagen_url_soat, imagen_url_tecnomecanica_vigente });
    } else {
      await crearDetalleBicicleta(connection, idVehiculo, { numero_marco, clase_bicicleta });
    }

    await connection.commit();

    return res.status(201).json({
      status: 'success',
      message: 'Vehículo registrado correctamente',
      id: idVehiculo
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al crear registro de vehículo:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'La placa o el número de marco ya está registrado' });
    }

    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};

