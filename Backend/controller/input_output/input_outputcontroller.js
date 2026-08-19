import db from '../../db.js';

// Lista todos los registros de entrada y salida.
export const obtenerRegistros = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM entrada_salida ORDER BY fecha_hora_ingreso DESC');
        res.json({ status: 'success', data: rows });
    } catch (error) {
        console.error('Error al consultar registros de entrada/salida:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al consultar los registros' });
    }
};

// Registra el INGRESO de un usuario con su vehículo.
// Antes de insertar valida que no exista ya un registro abierto (sin salida)
// para el mismo usuario y vehículo, para no permitir dos ingresos seguidos
// sin haber registrado antes la salida.
export const registrarEntrada = async (req, res) => {
  const { id_usuario_entra, id_vehiculo, id_usuario_celador_ingreso } = req.body;

  if (!id_usuario_entra || !id_vehiculo || !id_usuario_celador_ingreso) {
    return res.status(400).json({
      status: 'error',
      message: 'Faltan campos obligatorios: id_usuario_entra, id_vehiculo, id_usuario_celador_ingreso'
    });
  }

  try {
    const [abiertos] = await db.query(
      `SELECT id FROM entrada_salida
       WHERE id_usuario_entra = ? AND id_vehiculo = ? AND fecha_hora_salida IS NULL`,
      [id_usuario_entra, id_vehiculo]
    );

    if (abiertos.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Este usuario ya tiene un ingreso registrado sin salida para este vehículo'
      });
    }

    const [result] = await db.query(
      `INSERT INTO entrada_salida (id_usuario_entra, id_vehiculo, fecha_hora_ingreso, id_usuario_celador_ingreso)
       VALUES (?, ?, NOW(), ?)`,
      [id_usuario_entra, id_vehiculo, id_usuario_celador_ingreso]
    );

    res.status(201).json({
      status: 'success',
      message: 'Ingreso registrado exitosamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error al registrar entrada:', error);
    res.status(500).json({ status: 'error', message: 'Error interno al registrar el ingreso' });
  }
};

// Registra la SALIDA de un registro de ingreso ya existente, identificado
// por el id del renglón de entrada_salida (no por usuario/vehículo, para
// evitar ambigüedad si un mismo par usuario/vehículo tuviera más de un
// registro histórico).
export const registrarSalida = async (req, res) => {
  const { id } = req.params;
  const { id_usuario_celador_salida } = req.body;

  if (!id_usuario_celador_salida) {
    return res.status(400).json({ status: 'error', message: 'Falta el campo id_usuario_celador_salida' });
  }

  try {
    const [registros] = await db.query(
      'SELECT id, fecha_hora_salida FROM entrada_salida WHERE id = ?',
      [id]
    );

    if (registros.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Registro de ingreso no encontrado' });
    }

    if (registros[0].fecha_hora_salida !== null) {
      return res.status(409).json({ status: 'error', message: 'Este registro ya tiene una salida registrada' });
    }

    await db.query(
      `UPDATE entrada_salida
       SET fecha_hora_salida = NOW(), id_usuario_celador_salida = ?
       WHERE id = ?`,
      [id_usuario_celador_salida, id]
    );

    res.json({ status: 'success', message: 'Salida registrada exitosamente' });
  } catch (error) {
    console.error('Error al registrar salida:', error);
    res.status(500).json({ status: 'error', message: 'Error interno al registrar la salida' });
  }
};
