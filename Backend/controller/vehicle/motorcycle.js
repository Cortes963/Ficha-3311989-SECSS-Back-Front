//Guardar detalle de la moto
export const crearDetalleMoto = async (connection, idVehiculo, datos) => {
  const { placa, cilindraje, modelo, imagen_url_soat, imagen_url_tecnomecanica_vigente } = datos;

  const query = `
    INSERT INTO detalle_moto 
    (id_vehiculo, placa, cilindraje, modelo, imagen_url_soat, imagen_url_tecnomecanica_vigente)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  await connection.query(query, [idVehiculo, placa, cilindraje, modelo, imagen_url_soat, imagen_url_tecnomecanica_vigente]);
};

