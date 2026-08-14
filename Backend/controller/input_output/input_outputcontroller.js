import db from '../../db.js';


// Guardar todos los registros de entrada y salida 

export const obtenerRegistros = async (req, res) => {
    try {
        const [rows] = await db.query ('SELECT * FROM entrada_salida');
        res.json({ status: 'success', data: rows });
    } catch (error){
        res.status(500).json ({ status: 'error', message: error.message});
    }
};

// crear nuevo registro 

export const crearRegistro = async (req, res) => {
  const { id_usuario_entra, id_vehiculo, fecha_hora, id_usuario_celador, tipo_registro } = req.body;

  if (!id_usuario_entra || !id_vehiculo || !id_usuario_celador || !tipo_registro) {
    return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios' });
  }

  try {
     const query = `
      INSERT INTO entrada_salida (id_usuario_entra, id_vehiculo, fecha_hora, id_usuario_celador, tipo_registro)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [
      id_usuario_entra,
      id_vehiculo,
      fecha_hora || new Date(),
      id_usuario_celador,
      tipo_registro
    ]);

    res.status(201).json({
      status: 'success',
      message: 'Registro guardado exitosamente',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};


