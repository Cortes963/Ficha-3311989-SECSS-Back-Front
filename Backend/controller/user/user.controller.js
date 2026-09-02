import db from '../../db.js';

/**
 * Obtener listado de usuarios con datos generales.
 * Soporta ?rol=APRENDIZ (o CELADOR, etc.) para filtrar, y trae ficha/fechas
 * de detalle_aprendiz cuando aplica (ApprenListPage las necesita).
 */
export const getAllUsers = async (req, res) => {
  const { rol } = req.query;
  try {
    const params = [];
    let query = `
      SELECT u.id, u.tipo_documento, u.numero_documento, u.primer_nombre, u.segundo_nombre,
             u.primer_apellido, u.segundo_apellido, u.n_celular, u.estado, u.created_at,
             da.ficha, da.fecha_vinculacion, da.fecha_terminacion
      FROM usuario u
      LEFT JOIN detalle_aprendiz da ON da.id_usuario = u.id
      WHERE u.estado = 1
    `;

    if (rol) {
      query += `
        AND EXISTS (
          SELECT 1 FROM usuario_rol ur
          INNER JOIN rol r ON ur.id_rol = r.id
          WHERE ur.id_usuario = u.id AND ur.estado = 1 AND r.nombre_rol = ?
        )
      `;
      params.push(rol);
    }

    const [rows] = await db.query(query, params);
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

    // cuenta.nombre_usuario no existe en el DDL actual — se quitó de aquí
    const [cuenta] = await db.query(
      'SELECT correo, ultimo_login, estado FROM cuenta WHERE id_usuario = ?',
      [id]
    );

    const [roles] = await db.query(
      `SELECT r.nombre_rol FROM usuario_rol ur 
       INNER JOIN rol r ON ur.id_rol = r.id 
       WHERE ur.id_usuario = ? AND ur.estado = 1`,
      [id]
    );

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
 * Registrar un nuevo usuario completo (Transacción para usuario + cuenta + rol
 * + detalle_aprendiz si aplica). Recibe nombre_rol y nombre_centro como texto
 * (no IDs) porque el frontend no conoce los IDs internos de esas tablas.
 */
export const createUser = async (req, res) => {
  const {
    tipo_documento, numero_documento, primer_nombre, segundo_nombre,
    primer_apellido, segundo_apellido, n_celular,
    correo, password_hash, nombre_rol,
    detalle_aprendiz
  } = req.body;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [userRes] = await connection.query(
      `INSERT INTO usuario (tipo_documento, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, n_celular, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [tipo_documento, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, n_celular]
    );
    const newUserId = userRes.insertId;

    await connection.query(
      `INSERT INTO cuenta (id_usuario, correo, password_hash, estado)
       VALUES (?, ?, ?, 1)`,
      [newUserId, correo, password_hash]
    );

    if (nombre_rol) {
      const [roles] = await connection.query('SELECT id FROM rol WHERE nombre_rol = ?', [nombre_rol]);
      if (roles.length === 0) {
        throw Object.assign(new Error(`El rol '${nombre_rol}' no existe`), { status: 400 });
      }
      await connection.query(
        `INSERT INTO usuario_rol (id_usuario, id_rol, estado) VALUES (?, ?, 1)`,
        [newUserId, roles[0].id]
      );
    }

    if (detalle_aprendiz) {
      const { nombre_centro, ficha, imagen_url_aprendiz, direccion, imagen_url_identificacion, imagen_url_carnet_sena, fecha_vinculacion } = detalle_aprendiz;

      const [centros] = await connection.query('SELECT id FROM centro WHERE nombre_centro = ?', [nombre_centro]);
      if (centros.length === 0) {
        throw Object.assign(new Error(`El centro de formación '${nombre_centro}' no existe`), { status: 400 });
      }

      await connection.query(
        `INSERT INTO detalle_aprendiz (id_usuario, id_centro, ficha, imagen_url_aprendiz, direccion, imagen_url_identificacion, imagen_url_carnet_sena, fecha_vinculacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newUserId, centros[0].id, ficha, imagen_url_aprendiz, direccion, imagen_url_identificacion, imagen_url_carnet_sena, fecha_vinculacion]
      );
    }

    await connection.commit();
    res.status(201).json({ ok: true, mensaje: 'Usuario registrado correctamente.', id_usuario: newUserId });

  } catch (error) {
    await connection.rollback();
    console.error('Error en user.createUser:', error);
    res.status(error.status || 500).json({ ok: false, mensaje: error.status ? error.message : 'Error al registrar usuario en la base de datos.' });
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
