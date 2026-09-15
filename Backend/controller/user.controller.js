import bcrypt from 'bcryptjs';
import db from '../db.js';
import { actorId, error, integer, page, required, ROLES } from '../lib.js';
import { assignRole, createUserWithAccount } from '../services/user.service.js';

export async function indexUser(req, res) {
  try {
    const { pagina, limite, offset } = page(req.query);
    const params = [];
    let where = 'WHERE u.estado=1';
    if (req.query.rol) { where += ' AND EXISTS (SELECT 1 FROM usuario_rol ur JOIN rol r ON r.id=ur.id_rol WHERE ur.id_usuario=u.id AND ur.estado=1 AND r.nombre_rol=?)'; params.push(req.query.rol); }
    if (req.query.q) {
      where += ` AND (u.numero_documento LIKE ? OR CONCAT_WS(' ',u.primer_nombre,u.segundo_nombre,u.primer_apellido,u.segundo_apellido) LIKE ?)`;
      params.push(`%${req.query.q}%`, `%${req.query.q}%`);
    }
    const [[count]] = await db.query(`SELECT COUNT(*) total FROM usuario u ${where}`, params);
    const [datos] = await db.query(`SELECT u.id,u.tipo_documento,u.numero_documento,u.primer_nombre,u.segundo_nombre,u.primer_apellido,u.segundo_apellido,u.n_celular,u.estado,
      da.ficha,da.fecha_vinculacion,da.fecha_terminacion,
      c.nombre_centro,
      GROUP_CONCAT(DISTINCT r.nombre_rol ORDER BY r.nombre_rol SEPARATOR ',') AS roles_activos
      FROM usuario u LEFT JOIN detalle_aprendiz da ON da.id_usuario=u.id
      LEFT JOIN centro c ON c.id=da.id_centro
      LEFT JOIN usuario_rol ur ON ur.id_usuario=u.id AND ur.estado=1
      LEFT JOIN rol r ON r.id=ur.id_rol
      ${where} GROUP BY u.id ORDER BY u.id DESC LIMIT ? OFFSET ?`, [...params, limite, offset]);
    const normalized = datos.map((row) => ({
      ...row,
      nombre: [row.primer_nombre, row.segundo_nombre, row.primer_apellido, row.segundo_apellido].filter(Boolean).join(' ')
      ,roles: row.roles_activos ? row.roles_activos.split(',') : []
    }));
    return res.json({ ok: true, pagina, limite, total: count.total, datos: normalized });
  } catch (err) { return error(res, err); }
}

export async function indexEligibleUsers(req, res) {
  try {
    const { q = '', rol } = req.query;
    const targetRole = rol || (req.user.roles.includes(ROLES.ADMIN) ? ROLES.JEFE : ROLES.CELADOR);
    const [datos] = await db.query(
      `SELECT u.id,u.tipo_documento,u.numero_documento,u.primer_nombre,u.segundo_nombre,
              u.primer_apellido,u.segundo_apellido,u.n_celular,c.correo,
              GROUP_CONCAT(DISTINCT r.nombre_rol ORDER BY r.nombre_rol SEPARATOR ',') roles_activos
       FROM usuario u JOIN cuenta c ON c.id_usuario=u.id AND c.estado=1
       LEFT JOIN usuario_rol ur ON ur.id_usuario=u.id AND ur.estado=1
       LEFT JOIN rol r ON r.id=ur.id_rol
       WHERE u.estado=1
         AND (u.numero_documento LIKE ? OR CONCAT_WS(' ',u.primer_nombre,u.segundo_nombre,u.primer_apellido,u.segundo_apellido) LIKE ?)
         AND NOT EXISTS (
           SELECT 1 FROM usuario_rol ux JOIN rol rx ON rx.id=ux.id_rol
           WHERE ux.id_usuario=u.id AND ux.estado=1 AND rx.nombre_rol=?
         )
       GROUP BY u.id ORDER BY u.primer_apellido,u.primer_nombre LIMIT 25`,
      [`%${q}%`, `%${q}%`, targetRole]
    );
    return res.json({ ok: true, datos: datos.map((row) => ({
      ...row,
      nombre: [row.primer_nombre,row.segundo_nombre,row.primer_apellido,row.segundo_apellido].filter(Boolean).join(' '),
      roles: row.roles_activos ? row.roles_activos.split(',') : []
    })) });
  } catch (err) { return error(res, err); }
}

export async function showUserId(req, res) {
  try {
    const id = integer(req.params.id, 'id');
    const [rows] = await db.query('SELECT u.*,c.correo,c.ultimo_login FROM usuario u JOIN cuenta c ON c.id_usuario=u.id WHERE u.id=?', [id]);
    if (!rows.length) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });
    const [roles] = await db.query('SELECT r.nombre_rol FROM usuario_rol ur JOIN rol r ON r.id=ur.id_rol WHERE ur.id_usuario=? AND ur.estado=1', [id]);
    const [aprendiz] = await db.query('SELECT da.*,c.nombre_centro FROM detalle_aprendiz da LEFT JOIN centro c ON c.id=da.id_centro WHERE da.id_usuario=?', [id]);
    return res.json({ ok: true, datos: { ...rows[0], roles: roles.map((item) => item.nombre_rol), detalle_aprendiz: aprendiz[0] || null } });
  } catch (err) { return error(res, err); }
}

export async function updateUser(req, res) {
  try {
    const id = actorId(req);
    const fields = ['primer_nombre','segundo_nombre','primer_apellido','segundo_apellido','n_celular'];
    const assignments = [];
    const values = [];
    fields.forEach((field) => { if (req.body[field] !== undefined) { assignments.push(`${field}=?`); values.push(req.body[field]); } });
    if (req.body.correo !== undefined) await db.query('UPDATE cuenta SET correo=? WHERE id_usuario=?', [req.body.correo, id]);
    if (!assignments.length && req.body.correo === undefined) throw Object.assign(new Error('No hay datos para actualizar.'), { status: 400 });
    if (assignments.length) await db.query(`UPDATE usuario SET ${assignments.join(',')} WHERE id=?`, [...values, id]);
    await db.query('UPDATE auth_vehiculo SET estado=0 WHERE id_usuario=? AND estado=1', [id]);
    return res.json({ ok: true, mensaje: 'Perfil actualizado.' });
  } catch (err) { return error(res, err); }
}

export async function updateUserState(req, res) {
  try {
    const estado = Number(req.body.estado);
    if (![0, 1].includes(estado)) throw Object.assign(new Error('estado debe ser 0 o 1.'), { status: 400 });
    const [result] = await db.query('UPDATE usuario u JOIN cuenta c ON c.id_usuario=u.id SET u.estado=?,c.estado=? WHERE u.id=?', [estado, estado, integer(req.params.id, 'id')]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });
    return res.json({ ok: true, mensaje: 'Estado actualizado.' });
  } catch (err) { return error(res, err); }
}

export async function storeSecurityChiefGuard(req, res) {
  try {
    required(req.body, ['id_usuario_jefe_seguridad','id_usuario_celador']);
    await db.query('INSERT INTO jefe_seguridad_celador (id_usuario_jefe_seguridad,id_usuario_celador) VALUES (?,?)', [integer(req.body.id_usuario_jefe_seguridad, 'id_usuario_jefe_seguridad'), integer(req.body.id_usuario_celador, 'id_usuario_celador')]);
    return res.status(201).json({ ok: true, mensaje: 'Celador asignado.' });
  } catch (err) { return error(res, err); }
}

export async function storeCelador(req, res) {
  const connection = await db.getConnection();
  try {
    const hasExisting = req.body.id_usuario !== undefined;
    const hasNew = req.body.usuario !== undefined;
    if (hasExisting === hasNew) throw Object.assign(new Error('Debe indicar id_usuario o usuario, pero no ambos.'), { status: 400 });
    await connection.beginTransaction();
    let userId;
    let credentials = null;
    if (hasExisting) {
      userId = integer(req.body.id_usuario, 'id_usuario');
      const [users] = await connection.query('SELECT id FROM usuario WHERE id=? FOR UPDATE', [userId]);
      if (!users.length) throw Object.assign(new Error('Usuario no encontrado.'), { status: 404 });
    } else {
      required(req.body.usuario, ['tipo_documento','numero_documento','primer_nombre','primer_apellido','n_celular','correo']);
      const created = await createUserWithAccount(connection, req.body.usuario);
      userId = created.id_usuario;
      credentials = { correo: req.body.usuario.correo, password: created.password };
    }
    const [privileged] = await connection.query('SELECT r.nombre_rol FROM usuario_rol ur JOIN rol r ON r.id=ur.id_rol WHERE ur.id_usuario=? AND ur.estado=1 AND r.nombre_rol IN (?,?,?)', [userId, ROLES.ADMIN, ROLES.JEFE, ROLES.APRENDIZ]);
    if (privileged.length) throw Object.assign(new Error('No se puede asignar CELADOR a un usuario privilegiado o aprendiz.'), { status: 409 });
    await assignRole(connection, userId, ROLES.CELADOR);
    await connection.query('INSERT INTO jefe_seguridad_celador (id_usuario_jefe_seguridad,id_usuario_celador) VALUES (?,?) ON DUPLICATE KEY UPDATE id_usuario_jefe_seguridad=VALUES(id_usuario_jefe_seguridad)', [actorId(req), userId]);
    await connection.commit();
    return res.status(201).json({ ok: true, mensaje: 'Celador registrado y asignado.', id_usuario: userId, ...(credentials ? { credenciales_temporales: credentials } : {}) });
  } catch (err) { await connection.rollback(); return error(res, err); }
  finally { connection.release(); }
}

export async function storeJefe(req, res) {
  const connection = await db.getConnection();
  try {
    const hasExisting = req.body.id_usuario !== undefined;
    const hasNew = req.body.usuario !== undefined;
    if (hasExisting === hasNew) throw Object.assign(new Error('Debe indicar id_usuario o usuario, pero no ambos.'), { status: 400 });
    await connection.beginTransaction();
    let userId;
    let credentials = null;
    if (hasExisting) {
      userId = integer(req.body.id_usuario, 'id_usuario');
      const [users] = await connection.query('SELECT id FROM usuario WHERE id=? FOR UPDATE', [userId]);
      if (!users.length) throw Object.assign(new Error('Usuario no encontrado.'), { status: 404 });
    } else {
      required(req.body.usuario, ['tipo_documento','numero_documento','primer_nombre','primer_apellido','n_celular','correo']);
      const created = await createUserWithAccount(connection, req.body.usuario);
      userId = created.id_usuario;
      credentials = { correo: req.body.usuario.correo, password: created.password };
    }
    await assignRole(connection, userId, ROLES.JEFE);
    await connection.commit();
    return res.status(201).json({ ok: true, mensaje: 'Jefe de seguridad registrado.', id_usuario: userId, ...(credentials ? { credenciales_temporales: credentials } : {}) });
  } catch (err) { await connection.rollback(); return error(res, err); }
  finally { connection.release(); }
}

export async function updateMyPassword(req, res) {
  try {
    required(req.body, ['password_actual','password_nueva']);
    if (String(req.body.password_nueva).length < 10) throw Object.assign(new Error('La contraseña debe tener al menos 10 caracteres.'), { status: 400 });
    const [rows] = await db.query('SELECT password_hash FROM cuenta WHERE id_usuario=?', [actorId(req)]);
    if (!rows.length || !await bcrypt.compare(req.body.password_actual, rows[0].password_hash)) return res.status(401).json({ ok: false, mensaje: 'Contraseña actual inválida.' });
    await db.query('UPDATE cuenta SET password_hash=?,expira_en=NULL WHERE id_usuario=?', [await bcrypt.hash(req.body.password_nueva, 12), actorId(req)]);
    return res.json({ ok: true, mensaje: 'Contraseña actualizada.' });
  } catch (err) { return error(res, err); }
}
