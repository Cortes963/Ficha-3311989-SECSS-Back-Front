//Guardar detalle de la bicicleta
export const crearDetalleBicicleta = async (connection, idVehiculo, datos) => {
  const { numero_marco, clase_bicicleta } = datos;

  const query = `
    INSERT INTO detalle_bicicleta 
    (id_vehiculo, numero_marco, clase_bicicleta)
    VALUES (?, ?, ?)
  `;

  await connection.query(query, [idVehiculo, numero_marco, clase_bicicleta]);
};

