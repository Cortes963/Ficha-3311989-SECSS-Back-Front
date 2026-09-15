import { createAccount, temporaryPassword } from './account.service.js';

export async function assignRole(connection, userId, role) {
  const [rows] = await connection.query('SELECT id FROM rol WHERE nombre_rol=?', [role]);
  if (!rows.length) throw Object.assign(new Error('Rol inexistente.'), { status: 400 });
  await connection.query(
    `INSERT INTO usuario_rol (id_usuario,id_rol,estado) VALUES (?,?,1)
     ON DUPLICATE KEY UPDATE estado=1`,
    [userId, rows[0].id]
  );
}

export async function createUserWithAccount(connection, data) {
  const [result] = await connection.query(
    `INSERT INTO usuario
      (tipo_documento,numero_documento,primer_nombre,segundo_nombre,
       primer_apellido,segundo_apellido,n_celular,estado)
     VALUES (?,?,?,?,?,?,?,1)`,
    [
      data.tipo_documento, data.numero_documento, data.primer_nombre,
      data.segundo_nombre || null, data.primer_apellido,
      data.segundo_apellido || null, data.n_celular
    ]
  );
  const password = temporaryPassword();
  await createAccount(connection, {
    userId: result.insertId,
    correo: data.correo,
    password,
    expiraEn: data.expira_en || null
  });
  return { id_usuario: result.insertId, password };
}
