import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import db from '../db.js';
import { ROLES, error, required } from '../lib.js';
import { removeUploadedFile, saveUploadedFile } from '../services/fileStorage.service.js';

export async function storeAuthLogin(req, res) {
  try {
    required(req.body, ['numero_documento', 'password']);
    const [rows] = await db.query('SELECT c.*,u.numero_documento,u.primer_nombre,u.primer_apellido,u.estado usuario_estado FROM cuenta c JOIN usuario u ON u.id=c.id_usuario WHERE u.numero_documento=?', [req.body.numero_documento]);
    if (!rows.length) return res.status(401).json({ ok: false, mensaje: 'Credenciales inválidas.' });
    const account = rows[0];
    if (!account.estado || !account.usuario_estado) return res.status(403).json({ ok: false, mensaje: 'Cuenta inactiva.' });
    if (account.expira_en && new Date(account.expira_en) <= new Date()) return res.status(403).json({ ok: false, mensaje: 'La cuenta temporal ya expiró.' });
    if (account.bloqueada_hasta && new Date(account.bloqueada_hasta) > new Date()) return res.status(423).json({ ok: false, mensaje: 'Cuenta bloqueada temporalmente.' });
    if (!await bcrypt.compare(req.body.password, account.password_hash)) {
      await db.query('UPDATE cuenta SET intentos_fallidos=IF(bloqueada_hasta IS NOT NULL AND bloqueada_hasta<=NOW(),1,intentos_fallidos+1),bloqueada_hasta=IF(IF(bloqueada_hasta IS NOT NULL AND bloqueada_hasta<=NOW(),1,intentos_fallidos+1)>=3,DATE_ADD(NOW(),INTERVAL 15 MINUTE),NULL) WHERE id_usuario=?', [account.id_usuario]);
      return res.status(401).json({ ok: false, mensaje: 'Credenciales inválidas.' });
    }
    const [roleRows] = await db.query('SELECT r.nombre_rol FROM usuario_rol ur JOIN rol r ON r.id=ur.id_rol WHERE ur.id_usuario=? AND ur.estado=1', [account.id_usuario]);
    const roles = roleRows.map(({ nombre_rol }) => nombre_rol);
    await db.query('UPDATE cuenta SET intentos_fallidos=0,bloqueada_hasta=NULL,ultimo_login=NOW() WHERE id_usuario=?', [account.id_usuario]);
    const token = jwt.sign({ id: account.id_usuario, roles }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    return res.json({ ok: true, token, usuario: { id: account.id_usuario, nombre: `${account.primer_nombre} ${account.primer_apellido}`, correo: account.correo, roles } });
  } catch (err) { return error(res, err); }
}

export async function storeAuthRegister(req, res) {
  const connection = await db.getConnection();
  const uploaded = [];
  try {
    required(req.body, ['tipo_documento','numero_documento','primer_nombre','primer_apellido','n_celular','correo','password','nombre_rol']);
    const { tipo_documento,numero_documento,primer_nombre,segundo_nombre=null,primer_apellido,segundo_apellido=null,n_celular,correo,password,nombre_rol } = req.body;
    const detalle_aprendiz = typeof req.body.detalle_aprendiz === 'object'
      ? req.body.detalle_aprendiz
      : Object.fromEntries(Object.entries(req.body)
        .filter(([key]) => key.startsWith('detalle_aprendiz['))
        .map(([key, value]) => [key.slice(17, -1), value]));
    if (nombre_rol !== ROLES.APRENDIZ) throw Object.assign(new Error('El registro público solo permite APRENDIZ.'), { status: 403 });
    if (password.length < 10) throw Object.assign(new Error('La contraseña debe tener al menos 10 caracteres.'), { status: 400 });
    required(detalle_aprendiz, ['id_centro','ficha','direccion','fecha_vinculacion']);
    const imageFields = ['imagen_url_aprendiz', 'imagen_url_identificacion', 'imagen_url_carnet_sena'];
    for (const field of imageFields) {
      const file = req.files?.[field]?.[0];
      if (!file) throw Object.assign(new Error(`Falta el archivo obligatorio: ${field}.`), { status: 400 });
    }
    await connection.beginTransaction();
    const [u] = await connection.query('INSERT INTO usuario (tipo_documento,numero_documento,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,n_celular,estado) VALUES (?,?,?,?,?,?,?,1)', [tipo_documento,numero_documento,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,n_celular]);
    for (const field of imageFields) {
      const saved = await saveUploadedFile(req.files[field][0], u.insertId);
      uploaded.push(saved.ruta);
      detalle_aprendiz[field] = saved.ruta;
      await connection.query(
        'INSERT INTO archivo (nombre_original,nombre_almacenado,mime_type,tamano,ruta,id_usuario_subida) VALUES (?,?,?,?,?,?)',
        [saved.nombre_original, saved.nombre_almacenado, saved.mime_type, saved.tamano, saved.ruta, u.insertId]
      );
    }
    required(detalle_aprendiz, imageFields);
    await connection.query('INSERT INTO cuenta (id_usuario,correo,password_hash,estado) VALUES (?,?,?,1)', [u.insertId,correo,await bcrypt.hash(password,12)]);
    const [roles] = await connection.query('SELECT id FROM rol WHERE nombre_rol=?', [ROLES.APRENDIZ]);
    if (!roles.length) throw Object.assign(new Error('Rol inexistente.'), { status: 400 });
    await connection.query('INSERT INTO usuario_rol (id_usuario,id_rol,estado) VALUES (?,?,1)', [u.insertId,roles[0].id]);
    await connection.query('INSERT INTO detalle_aprendiz (id_usuario,id_centro,ficha,imagen_url_aprendiz,direccion,imagen_url_identificacion,imagen_url_carnet_sena,fecha_vinculacion,fecha_terminacion) VALUES (?,?,?,?,?,?,?,?,?)', [u.insertId,detalle_aprendiz.id_centro,detalle_aprendiz.ficha,detalle_aprendiz.imagen_url_aprendiz,detalle_aprendiz.direccion,detalle_aprendiz.imagen_url_identificacion,detalle_aprendiz.imagen_url_carnet_sena,detalle_aprendiz.fecha_vinculacion,detalle_aprendiz.fecha_terminacion || null]);
    await connection.commit();
    return res.status(201).json({ ok: true, mensaje: 'Usuario registrado.', id_usuario: u.insertId });
  } catch (err) { await Promise.all(uploaded.map(removeUploadedFile)); await connection.rollback(); return error(res, err); }
  finally { connection.release(); }
}

export async function requestPasswordReset(req, res) {
  try {
    required(req.body, ['correo']);
    const [users] = await db.query('SELECT id_usuario FROM cuenta WHERE correo=? AND estado=1', [req.body.correo]);
    if (users.length) {
      const token = crypto.randomBytes(32).toString('hex');
      await db.query('INSERT INTO password_reset_token (id_usuario,token_hash,expira_en) VALUES (?,?,DATE_ADD(NOW(),INTERVAL 30 MINUTE))', [users[0].id_usuario, crypto.createHash('sha256').update(token).digest('hex')]);
      if (process.env.PASSWORD_RESET_RETURN_TOKEN === 'true') return res.json({ ok: true, token });
    }
    return res.json({ ok: true, mensaje: 'Si el correo existe, recibirá instrucciones de recuperación.' });
  } catch (err) { return error(res, err); }
}

export async function resetPassword(req, res) {
  try {
    required(req.body, ['token','password']);
    if (String(req.body.password).length < 10) throw Object.assign(new Error('La contraseña debe tener al menos 10 caracteres.'), { status: 400 });
    const [tokens] = await db.query('SELECT id,id_usuario FROM password_reset_token WHERE token_hash=? AND usado_en IS NULL AND expira_en>NOW() ORDER BY id DESC LIMIT 1', [crypto.createHash('sha256').update(req.body.token).digest('hex')]);
    if (!tokens.length) return res.status(400).json({ ok: false, mensaje: 'Token inválido o expirado.' });
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('UPDATE cuenta SET password_hash=?,expira_en=NULL WHERE id_usuario=?', [await bcrypt.hash(req.body.password,12),tokens[0].id_usuario]);
      await connection.query('UPDATE password_reset_token SET usado_en=NOW() WHERE id=?', [tokens[0].id]);
      await connection.commit();
    } catch (err) { await connection.rollback(); throw err; } finally { connection.release(); }
    return res.json({ ok: true, mensaje: 'Contraseña actualizada.' });
  } catch (err) { return error(res, err); }
}
