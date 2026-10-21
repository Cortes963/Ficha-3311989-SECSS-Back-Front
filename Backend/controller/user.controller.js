import bcrypt from 'bcryptjs';
import fs from 'node:fs/promises';
import db from '../db.js';
import { actorId, error, integer, page, required, ROLES, validatePassword } from '../lib.js';
import { assignRole, createUserWithAccount } from '../services/user.service.js';
import { removeUploadedFile, saveUploadedFile } from '../services/fileStorage.service.js';

function parseJsonValue(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed || !['{', '['].includes(trimmed[0])) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeAcademicPayload(req) {
  const payload = { ...req.body };
  if (payload.detalle_aprendiz !== undefined) {
    payload.detalle_aprendiz = parseJsonValue(payload.detalle_aprendiz);
  }
  const detail = payload.detalle_aprendiz && typeof payload.detalle_aprendiz === 'object' ? payload.detalle_aprendiz : {};
  return { ...payload, ...detail };
}

async function persistUploadedAcademicImages(connection, req, userId, payload, uploaded) {
  const names = ['imagen_url_aprendiz', 'imagen_url_identificacion', 'imagen_url_carnet_sena'];
  const nextPayload = { ...payload };

  for (const name of names) {
    const file = req.files?.[name]?.[0];
    if (!file) continue;
    const saved = await saveUploadedFile(file, userId);
    uploaded.push(saved.ruta);
    nextPayload[name] = saved.ruta;
    await connection.query(
      'INSERT INTO archivo (nombre_original, nombre_almacenado, mime_type, tamano, ruta, id_usuario_subida) VALUES (?, ?, ?, ?, ?, ?)',
      [saved.nombre_original, saved.nombre_almacenado, saved.mime_type, saved.tamano, saved.ruta, userId]
    );
  }

  return nextPayload;
}

export async function indexUser(req, res) {
  try {
    if (req.user.roles.includes(ROLES.CELADOR) && req.query.rol !== ROLES.INVITADO) {
      return res.status(403).json({ ok: false, mensaje: 'El celador solo puede consultar invitados.' });
    }
    const { pagina, limite, offset } = page(req.query);
    const params = [];
    let where = 'WHERE 1=1';
    if (req.query.rol) { where += ' AND EXISTS (SELECT 1 FROM usuario_rol ur JOIN rol r ON r.id=ur.id_rol WHERE ur.id_usuario=u.id AND ur.estado=1 AND r.nombre_rol=?)'; params.push(req.query.rol); }
    if (req.query.q) {
      where += ` AND (u.numero_documento LIKE ? OR CONCAT_WS(' ',NULLIF(u.primer_nombre,''),NULLIF(u.segundo_nombre,''),NULLIF(u.primer_apellido,''),NULLIF(u.segundo_apellido,'')) LIKE ?)`;
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
         AND (u.numero_documento LIKE ? OR CONCAT_WS(' ',NULLIF(u.primer_nombre,''),NULLIF(u.segundo_nombre,''),NULLIF(u.primer_apellido,''),NULLIF(u.segundo_apellido,'')) LIKE ?)
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
    if (req.user.roles.includes(ROLES.CELADOR) && id !== actorId(req)) {
      const [guestRole] = await db.query(
        `SELECT 1 FROM usuario_rol ur JOIN rol r ON r.id=ur.id_rol WHERE ur.id_usuario=? AND ur.estado=1 AND r.nombre_rol=?`,
        [id, ROLES.INVITADO]
      );
      if (!guestRole.length) return res.status(403).json({ ok: false, mensaje: 'El celador solo puede consultar invitados.' });
    }
    const [rows] = await db.query('SELECT u.*,c.correo,c.ultimo_login,c.created_at AS cuenta_created_at,c.estado AS cuenta_estado FROM usuario u JOIN cuenta c ON c.id_usuario=u.id WHERE u.id=?', [id]);
    if (!rows.length) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });
    const [roles] = await db.query('SELECT r.nombre_rol FROM usuario_rol ur JOIN rol r ON r.id=ur.id_rol WHERE ur.id_usuario=? AND ur.estado=1', [id]);
    const [aprendiz] = await db.query('SELECT da.*,c.nombre_centro FROM detalle_aprendiz da LEFT JOIN centro c ON c.id=da.id_centro WHERE da.id_usuario=?', [id]);
    return res.json({ ok: true, datos: { ...rows[0], roles: roles.map((item) => item.nombre_rol), detalle_aprendiz: aprendiz[0] || null } });
  } catch (err) { return error(res, err); }
}

export async function showAcademicDetail(req, res) {
  try {
    const id = integer(req.params.id, 'id');
    const [rows] = await db.query(
      'SELECT da.*, c.nombre_centro FROM detalle_aprendiz da LEFT JOIN centro c ON c.id = da.id_centro WHERE da.id_usuario = ?',
      [id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, mensaje: 'Detalle académico no encontrado.' });
    return res.json({ ok: true, datos: rows[0] });
  } catch (err) { return error(res, err); }
}

export async function updateAcademicDetail(req, res) {
  const connection = await db.getConnection();
  const uploaded = [];
  try {
    const id = integer(req.params.id, 'id');
    if (id !== actorId(req)) return res.status(403).json({ ok: false, mensaje: 'No tiene permisos para esta operación.' });
    const payload = normalizeAcademicPayload(req);
    const prepared = await persistUploadedAcademicImages(connection, req, id, payload, uploaded);
    const assignments = [];
    const values = [];
    const fields = ['id_centro', 'ficha', 'direccion', 'fecha_vinculacion', 'fecha_terminacion', 'imagen_url_aprendiz', 'imagen_url_identificacion', 'imagen_url_carnet_sena'];

    for (const field of fields) {
      if (prepared[field] !== undefined) {
        assignments.push(`${field} = ?`);
        values.push(prepared[field] ?? null);
      }
    }

    if (!assignments.length) {
      throw Object.assign(new Error('No hay campos actualizables.'), { status: 400 });
    }

    await connection.beginTransaction();
    const [existing] = await connection.query('SELECT 1 FROM detalle_aprendiz WHERE id_usuario = ?', [id]);
    if (!existing.length) {
      const insertColumns = ['id_usuario', ...fields];
      const insertValues = [id, ...fields.map((field) => prepared[field] ?? null)];
      await connection.query(`INSERT INTO detalle_aprendiz (${insertColumns.join(', ')}) VALUES (${insertColumns.map(() => '?').join(', ')})`, insertValues);
    } else {
      await connection.query(`UPDATE detalle_aprendiz SET ${assignments.join(', ')} WHERE id_usuario = ?`, [...values, id]);
    }
    await connection.commit();
    return res.json({ ok: true, mensaje: 'Detalle académico actualizado.' });
  } catch (err) {
    const temporaryFiles = Object.values(req.files || {}).flat().map(({ path: filepath }) => fs.rm(filepath, { force: true }));
    await Promise.all([...uploaded.map(removeUploadedFile), ...temporaryFiles]);
    await connection.rollback();
    return error(res, err);
  } finally {
    connection.release();
  }
}

export async function updateUser(req, res) {
  let connection;
  let transactionStarted = false;
  try {
    const body = req.body ?? {};
    if (req.user.roles.includes(ROLES.INVITADO)) {
      return res.status(403).json({ ok: false, mensaje: 'Los invitados no pueden editar su perfil.' });
    }
    const id = actorId(req);
    const fields = ['primer_nombre','segundo_nombre','primer_apellido','segundo_apellido','n_celular'];
    const assignments = [];
    const values = [];
    fields.forEach((field) => { if (body[field] !== undefined) { assignments.push(`${field}=?`); values.push(body[field]); } });
    if (!assignments.length && body.correo === undefined) throw Object.assign(new Error('No hay datos para actualizar.'), { status: 400 });
    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;
    if (body.correo !== undefined) await connection.query('UPDATE cuenta SET correo=? WHERE id_usuario=?', [body.correo, id]);
    if (assignments.length) await connection.query(`UPDATE usuario SET ${assignments.join(',')} WHERE id=?`, [...values, id]);
    await connection.query('UPDATE auth_vehiculo SET estado=0 WHERE id_usuario=? AND estado=1', [id]);
    await connection.commit();
    return res.json({ ok: true, mensaje: 'Perfil actualizado.' });
  } catch (err) {
    if (transactionStarted) await connection.rollback();
    return error(res, err);
  } finally { connection?.release(); }
}

export async function updateUserState(req, res) {
  try {
    const body = req.body ?? {};
    const id = integer(req.params.id, 'id');
    if (![0, 1, '0', '1'].includes(body.estado)) throw Object.assign(new Error('estado debe ser 0 o 1.'), { status: 400 });
    const estado = Number(body.estado);

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.query(
        'SELECT u.id FROM usuario u JOIN cuenta c ON c.id_usuario=u.id WHERE u.id=? FOR UPDATE',
        [id]
      );
      if (!users.length) {
        await connection.rollback();
        return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });
      }

      const [roles] = await connection.query(
        'SELECT r.nombre_rol FROM usuario_rol ur JOIN rol r ON r.id=ur.id_rol WHERE ur.id_usuario=?',
        [id]
      );
      const targetRoles = roles.map((row) => row.nombre_rol);
      const actorRoles = req.user.roles;
      const selfDeactivation = req.selfStatusChange === true && id === actorId(req) && estado === 0;
      const targetIsAdmin = targetRoles.includes(ROLES.ADMIN);
      const targetIsGuest = targetRoles.includes(ROLES.INVITADO);
      const targetIsLearner = targetRoles.includes(ROLES.APRENDIZ);
      const targetIsChief = targetRoles.includes(ROLES.JEFE);
      const targetIsGuard = targetRoles.includes(ROLES.CELADOR);
      const allowedByMatrix = !targetIsAdmin && (
        actorRoles.includes(ROLES.ADMIN)
          ? (targetIsChief || targetIsLearner || targetIsGuest)
          : actorRoles.includes(ROLES.JEFE)
            ? targetIsGuard
            : actorRoles.includes(ROLES.CELADOR) && estado === 1 && targetIsGuest
      );

      if (!selfDeactivation && !allowedByMatrix) {
        await connection.rollback();
        return res.status(403).json({ ok: false, mensaje: 'No tiene permisos para cambiar el estado de este usuario.' });
      }

      await connection.query('UPDATE usuario SET estado=? WHERE id=?', [estado, id]);
      if (estado === 1 && targetIsGuest) {
        const expiration = new Date();
        expiration.setMonth(expiration.getMonth() + 6);
        await connection.query(
          'UPDATE cuenta SET estado=?,expira_en=? WHERE id_usuario=?',
          [estado, expiration, id]
        );
      } else {
        await connection.query('UPDATE cuenta SET estado=? WHERE id_usuario=?', [estado, id]);
      }
      if (estado === 0) {
        await connection.query('UPDATE usuario_rol SET estado=0 WHERE id_usuario=?', [id]);
      } else {
        const roleToReactivate = targetIsGuest ? ROLES.INVITADO
          : targetIsGuard ? ROLES.CELADOR
            : targetIsChief ? ROLES.JEFE : ROLES.APRENDIZ;
        await connection.query(
          'UPDATE usuario_rol SET estado=1 WHERE id_usuario=? AND id_rol=(SELECT id FROM rol WHERE nombre_rol=?)',
          [id, roleToReactivate]
        );
      }
      await connection.commit();
      return res.json({ ok: true, mensaje: 'Estado actualizado.' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) { return error(res, err); }
}

export async function storeSecurityChiefGuard(req, res) {
  try {
    const body = req.body ?? {};
    required(body, ['id_usuario_jefe_seguridad','id_usuario_celador']);
    const jefeId = integer(body.id_usuario_jefe_seguridad, 'id_usuario_jefe_seguridad');
    const celadorId = integer(body.id_usuario_celador, 'id_usuario_celador');
    const [roles] = await db.query(
      `SELECT u.id, r.nombre_rol
       FROM usuario u
       JOIN cuenta c ON c.id_usuario=u.id AND c.estado=1
       JOIN usuario_rol ur ON ur.id_usuario=u.id AND ur.estado=1
       JOIN rol r ON r.id=ur.id_rol
       WHERE u.id IN (?,?) AND u.estado=1`,
      [jefeId, celadorId]
    );
    const rolesJefe = roles.filter((row) => row.id === jefeId).map((row) => row.nombre_rol);
    const rolesCelador = roles.filter((row) => row.id === celadorId).map((row) => row.nombre_rol);
    if (!rolesJefe.length || !rolesCelador.length) {
      throw Object.assign(new Error('Una referencia indicada no existe.'), { status: 400 });
    }
    if (!rolesJefe.includes(ROLES.JEFE) || !rolesCelador.includes(ROLES.CELADOR)) {
      throw Object.assign(new Error('La relación requiere un JEFE_SEGURIDAD y un CELADOR activos.'), { status: 409 });
    }
    await db.query(
      'INSERT INTO jefe_seguridad_celador (id_usuario_jefe_seguridad,id_usuario_celador) VALUES (?,?)',
      [jefeId, celadorId]
    );
    return res.status(201).json({ ok: true, mensaje: 'Celador asignado.' });
  } catch (err) { return error(res, err); }
}

export async function storeCelador(req, res) {
  const connection = await db.getConnection();
  try {
    const body = req.body ?? {};
    const hasExisting = body.id_usuario !== undefined;
    const hasNew = body.usuario !== undefined;
    if (hasExisting === hasNew) throw Object.assign(new Error('Debe indicar id_usuario o usuario, pero no ambos.'), { status: 400 });
    await connection.beginTransaction();
    let userId;
    let credentials = null;
    if (hasExisting) {
      userId = integer(body.id_usuario, 'id_usuario');
      const [users] = await connection.query('SELECT id FROM usuario WHERE id=? FOR UPDATE', [userId]);
      if (!users.length) throw Object.assign(new Error('Usuario no encontrado.'), { status: 404 });
    } else {
      required(body.usuario, ['tipo_documento','numero_documento','primer_nombre','primer_apellido','n_celular','correo']);
      if (body.usuario.password !== undefined) validatePassword(body.usuario.password);
      const created = await createUserWithAccount(connection, body.usuario);
      userId = created.id_usuario;
      credentials = { correo: body.usuario.correo, password: created.password };
    }
    const [privileged] = await connection.query('SELECT r.nombre_rol FROM usuario_rol ur JOIN rol r ON r.id=ur.id_rol WHERE ur.id_usuario=? AND ur.estado=1 AND r.nombre_rol IN (?,?,?,?)', [userId, ROLES.ADMIN, ROLES.JEFE, ROLES.APRENDIZ, ROLES.INVITADO]);
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
    const body = req.body ?? {};
    const hasExisting = body.id_usuario !== undefined;
    const hasNew = body.usuario !== undefined;
    if (hasExisting === hasNew) throw Object.assign(new Error('Debe indicar id_usuario o usuario, pero no ambos.'), { status: 400 });
    await connection.beginTransaction();
    let userId;
    let credentials = null;
    if (hasExisting) {
      userId = integer(body.id_usuario, 'id_usuario');
      const [users] = await connection.query('SELECT id FROM usuario WHERE id=? FOR UPDATE', [userId]);
      if (!users.length) throw Object.assign(new Error('Usuario no encontrado.'), { status: 404 });
    } else {
      required(body.usuario, ['tipo_documento','numero_documento','primer_nombre','primer_apellido','n_celular','correo']);
      if (body.usuario.password !== undefined) validatePassword(body.usuario.password);
      const created = await createUserWithAccount(connection, body.usuario);
      userId = created.id_usuario;
      credentials = { correo: body.usuario.correo, password: created.password };
    }
    await assignRole(connection, userId, ROLES.JEFE);
    await connection.commit();
    return res.status(201).json({ ok: true, mensaje: 'Jefe de seguridad registrado.', id_usuario: userId, ...(credentials ? { credenciales_temporales: credentials } : {}) });
  } catch (err) { await connection.rollback(); return error(res, err); }
  finally { connection.release(); }
}

export async function updateMyPassword(req, res) {
  try {
    const body = req.body ?? {};
    required(body, ['password_actual','password_nueva']);
    validatePassword(body.password_nueva);
    if (typeof body.password_actual !== 'string') throw Object.assign(new Error('password_actual debe ser texto.'), { status: 400 });
    const [rows] = await db.query('SELECT password_hash FROM cuenta WHERE id_usuario=?', [actorId(req)]);
    if (!rows.length || !await bcrypt.compare(body.password_actual, rows[0].password_hash)) return res.status(401).json({ ok: false, mensaje: 'Contraseña actual inválida.' });
    await db.query('UPDATE cuenta SET password_hash=?,expira_en=NULL WHERE id_usuario=?', [await bcrypt.hash(body.password_nueva, 12), actorId(req)]);
    return res.json({ ok: true, mensaje: 'Contraseña actualizada.' });
  } catch (err) { return error(res, err); }
}
