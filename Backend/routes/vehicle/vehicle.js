const express = require('express');
const router = express.Router();
const db = require('../../db.js');

//Guardar informacion del vehiculo

//crear registro de vehiculo
const crearRegistroVehiculo = async (req, res) => {
  const { tipo_vehiculo, marca, color, imagen_url_targeta_propiedad, imagen_url_identificacion_vehiculo, imagen_url_vehiculo } = req.body;

  if (!tipo_vehiculo || !marca || !color || !imagen_url_targeta_propiedad || !imagen_url_identificacion_vehiculo || !imagen_url_vehiculo) {
    return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios' });
  }

  try {
    const query = `
      INSERT INTO vehiculo 
      (tipo_vehiculo, marca, color, imagen_url_targeta_propiedad, imagen_url_identificacion_vehiculo, imagen_url_vehiculo)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      tipo_vehiculo,
      marca,
      color,
      imagen_url_targeta_propiedad,
      imagen_url_identificacion_vehiculo,
      imagen_url_vehiculo
    ]);

    return res.status(201).json({
      status: 'success',
      message: 'Vehículo registrado correctamente',
      id: result.insertId
    });

  } catch (error) {
    console.error('Error al crear registro de vehículo:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
};

router.post('/vehiculo', crearRegistroVehiculo);

module.exports = router;