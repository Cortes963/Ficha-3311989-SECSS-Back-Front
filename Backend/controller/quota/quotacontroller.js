import pool from '../../db.js';

// Obtener la lista de cupos
// TODO: soportar filtros por query params (estado, id_usuario) como en pqrscontroller.listarPqrs,
// hoy siempre trae la tabla completa.
export const obtenerCupos = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cupo');
    res.json({ status: 'success', data: rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Asignar o registrar un cupo
export const asignarCupo = async (req, res) => {
  const { id_usuario, id_vehiculo, estado, id_usuario_administrador } = req.body;

  if (!id_usuario || !id_vehiculo || estado === undefined || !id_usuario_administrador) {
    return res.status(400).json({ status: 'error', message: 'Faltan datos requeridos para la asignación de cupo' });
  }

  try {
    const query = `
      INSERT INTO cupo (id_usuario, id_vehiculo, estado, id_usuario_administrador)
      VALUES (?, ?, ?, ?)
    `;
    await pool.query(query, [id_usuario, id_vehiculo, estado, id_usuario_administrador]);

    res.status(201).json({ status: 'success', message: 'Cupo asignado correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
