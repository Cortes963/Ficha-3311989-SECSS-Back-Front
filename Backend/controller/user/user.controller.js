import db from '../../db.js';

/**
 * Obtener listado de usuarios con datos generales
 */
export const getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, tipo_documento, numero_documento, primer_nombre, segundo_nombre, 
              primer_apellido, segundo_apellido, n_celular, estado, created_at 
       FROM usuario 
       WHERE estado = 1`
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    console.error('Error en user.getAllUsers:', error);
    res.status(500).json({ ok: false, mensaje: 'Error al consultar usuarios.' });
  }
};

/**
 * Obtener perfil completo de un usuario por ID (Incluyendo rol, cuenta y detalle si es aprendiz)
 */
export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const [usuario] = await db.query('SELECT * FROM usuario WHERE id = ?', [id]);
    if (usuario.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });
    }

    // Consulta de cuenta asociada
    const [cuenta] = await db.query(
      'SELECT correo, nombre_usuario, ultimo_login, estado FROM cuenta WHERE id_usuario = ?', 
      [id]
    );

    // Consulta de roles asignados
    const [roles] = await db.query(
      `SELECT r.nombre_rol FROM usuario_rol ur 
       INNER JOIN rol r ON ur.id_rol = r.id 
       WHERE ur.id_usuario = ? AND ur.estado = 1`,
      [id]
    );

    // Consulta de detalle aprendiz (si aplica)
    const [aprendiz] = await db.query(
      `SELECT da.*, c.nombre_centro 
       FROM detalle_aprendiz da
       INNER JOIN centro c ON da.id_centro = c.id
       WHERE da.id_usuario = ?`,
      [id]
    );

    res.json({
      ok: true,
      data: {
        ...usuario[0],
        cuenta: cuenta[0] || null,
        roles: roles.map(r => r.nombre_rol),
        detalle_aprendiz: aprendiz[0] || null
      }
    });

  } catch (error) {
    console.error('Error en user.getUserById:', error);
    res.status(500).json({ ok: false, mensaje: 'Error al consultar el usuario.' });
  }
};

/**
 * Registrar un nuevo usuario completo (Transacción para usuario + cuenta + asignación de rol)
 */
export const createUser = async (req, res) => {
  const {
    tipo_documento, numero_documento, primer_nombre, segundo_nombre,
    primer_apellido, segundo_apellido, n_celular,
    correo, nombre_usuario, password_hash, id_rol
  } = req.body;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Insertar datos en la tabla `usuario`
    const [userRes] = await connection.query(
      `INSERT INTO usuario (tipo_documento, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, n_celular, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [tipo_documento, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, n_celular]
    );

    const newUserId = userRes.insertId;

    // 2. Insertar cuenta de acceso
    await connection.query(
      `INSERT INTO cuenta (id_usuario, correo, nombre_usuario, password_hash, estado)
       VALUES (?, ?, ?, ?, 1)`,
      [newUserId, correo, nombre_usuario, password_hash]
    );

    // 3. Asignar rol inicial en `usuario_rol`
    if (id_rol) {
      await connection.query(
        `INSERT INTO usuario_rol (id_usuario, id_rol, estado) VALUES (?, ?, 1)`,
        [newUserId, id_rol]
      );
    }

    await connection.commit();
    res.status(201).json({ ok: true, mensaje: 'Usuario registrado correctamente.', id_usuario: newUserId });

  } catch (error) {
    await connection.rollback();
    console.error('Error en user.createUser:', error);
    res.status(500).json({ ok: false, mensaje: 'Error al registrar usuario en la base de datos.' });
  } finally {
    connection.release();
  }
};

/**
 * Asignación de celadores a un Jefe de Seguridad (Tabla `jefe_seguridad_celador`)
 */
export const assignCeladorToJefe = async (req, res) => {
  const { id_usuario_jefe_seguridad, id_usuario_celador } = req.body;

  try {
    await db.query(
      `INSERT INTO jefe_seguridad_celador (id_usuario_jefe_seguridad, id_usuario_celador) VALUES (?, ?)`,
      [id_usuario_jefe_seguridad, id_usuario_celador]
    );
    res.status(201).json({ ok: true, mensaje: 'Celador vinculado exitosamente al Jefe de Seguridad.' });
  } catch (error) {
    console.error('Error en user.assignCeladorToJefe:', error);
    res.status(500).json({ ok: false, mensaje: 'Error al establecer la relación jerárquica.' });
  }
};