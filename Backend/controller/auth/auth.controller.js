import db from '../../db.js';

/**
 * Autenticación de usuario
 * Valida estado de cuenta, intentos fallidos y bloqueos temporales según DDL
 */
export const login = async (req, res) => {
  const { nombre_usuario, password } = req.body;

  if (!nombre_usuario || !password) {
    return res.status(400).json({ ok: false, mensaje: 'Usuario y contraseña son requeridos.' });
  }

  try {
    //  Buscar la cuenta asociando el correo o nombre_usuario
    const [cuentas] = await db.query(
      `SELECT c.*, u.tipo_documento, u.numero_documento, u.primer_nombre, u.primer_apellido, u.estado AS estado_usuario
       FROM cuenta c
       INNER JOIN usuario u ON c.id_usuario = u.id
       WHERE c.nombre_usuario = ? OR c.correo = ?`,
      [nombre_usuario, nombre_usuario]
    );

    if (cuentas.length === 0) {
      return res.status(401).json({ ok: false, mensaje: 'Credenciales inválidas.' });
    }

    const cuenta = cuentas[0];

    //  Validar estados (Borrado lógico o inactividad)
    if (cuenta.estado === 0 || cuenta.estado_usuario === 0) {
      return res.status(403).json({ ok: false, mensaje: 'Usuario o cuenta inactiva.' });
    }

    //  Validar si está bloqueada por intentos fallidos
    if (cuenta.bloqueada_hasta && new Date(cuenta.bloqueada_hasta) > new Date()) {
      return res.status(403).json({ 
        ok: false, 
        mensaje: `Cuenta bloqueada hasta: ${cuenta.bloqueada_hasta}` 
      });
    }

    //  Verificación de hash de contraseña
    if (cuenta.password_hash !== password) {
      const intentos = cuenta.intentos_fallidos + 1;
      let bloqueo = null;

      // Bloqueo temporal tras 3 intentos
      if (intentos >= 3) {
        bloqueo = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      }

      await db.query(
        'UPDATE cuenta SET intentos_fallidos = ?, bloqueada_hasta = ? WHERE id_usuario = ?',
        [intentos, bloqueo, cuenta.id_usuario]
      );

      return res.status(401).json({ ok: false, mensaje: 'Credenciales inválidas.' });
    }

    // . Restablecer fallos y actualizar fecha de último login
    await db.query(
      'UPDATE cuenta SET intentos_fallidos = 0, bloqueada_hasta = NULL, ultimo_login = NOW() WHERE id_usuario = ?',
      [cuenta.id_usuario]
    );

    // . Obtener los roles del usuario
    const [roles] = await db.query(
      `SELECT r.id, r.nombre_rol 
       FROM usuario_rol ur
       INNER JOIN rol r ON ur.id_rol = r.id
       WHERE ur.id_usuario = ? AND ur.estado = 1`,
      [cuenta.id_usuario]
    );

    res.json({
      ok: true,
      mensaje: 'Inicio de sesión exitoso.',
      usuario: {
        id: cuenta.id_usuario,
        nombre: `${cuenta.primer_nombre} ${cuenta.primer_apellido}`,
        documento: cuenta.numero_documento,
        correo: cuenta.correo,
        roles: roles.map(r => r.nombre_rol)
      }
    });

  } catch (error) {
    console.error('Error en auth.login:', error);
    res.status(500).json({ ok: false, mensaje: 'Error interno en el servidor.' });
  }
};