/**
 * Backend module: controller/auth.controller.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { ROLES, error, required } from '../lib.js';

export async function storeAuthLogin(req, res) {
  try {
    required(req.body, ['numero_documento', 'password']);
    const { numero_documento, password } = req.body;
    const [rows] = await db.query(`SELECT c.*, u.numero_documento, u.primer_nombre, u.primer_apellido, u.estado usuario_estado
      FROM cuenta c JOIN usuario u ON u.id=c.id_usuario WHERE u.numero_documento=?`, [numero_documento]);
    if (!rows.length) return res.status(401).json({ ok: false, mensaje: 'Credenciales inválidas.' });
    const account = rows[0];
    if (!account.estado || !account.usuario_estado) return res.status(403).json({ ok: false, mensaje: 'Cuenta inactiva.' });
    if (account.bloqueada_hasta && new Date(account.bloqueada_hasta) > new Date()) return res.status(423).json({ ok: false, mensaje: 'Cuenta bloqueada temporalmente.' });
    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) {
      await db.query(`UPDATE cuenta SET intentos_fallidos=IF(bloqueada_hasta IS NOT NULL AND bloqueada_hasta<=NOW(),1,intentos_fallidos+1),
        bloqueada_hasta=IF(IF(bloqueada_hasta IS NOT NULL AND bloqueada_hasta<=NOW(),1,intentos_fallidos+1)>=3, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NULL)
        WHERE id_usuario=?`, [account.id_usuario]);
      return res.status(401).json({ ok: false, mensaje: 'Credenciales inválidas.' });
    }
    const [roleRows] = await db.query(`SELECT r.nombre_rol FROM usuario_rol ur JOIN rol r ON r.id=ur.id_rol WHERE ur.id_usuario=? AND ur.estado=1`, [account.id_usuario]);
    const roles = roleRows.map(({ nombre_rol }) => nombre_rol);
    await db.query('UPDATE cuenta SET intentos_fallidos=0,bloqueada_hasta=NULL,ultimo_login=NOW() WHERE id_usuario=?', [account.id_usuario]);
    const token = jwt.sign({ id: account.id_usuario, roles }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    return res.json({ ok: true, token, usuario: { id: account.id_usuario, nombre: `${account.primer_nombre} ${account.primer_apellido}`, correo: account.correo, roles } });
  } catch (err) { return error(res, err); }
}

// Registro público: nunca permite crear roles administrativos.
export async function storeAuthRegister(req, res) {
  const connection = await db.getConnection();
  try {
    required(req.body, ['tipo_documento', 'numero_documento', 'primer_nombre', 'primer_apellido', 'n_celular', 'correo', 'password', 'nombre_rol']);
    const { tipo_documento, numero_documento, primer_nombre, segundo_nombre=null, primer_apellido, segundo_apellido=null, n_celular, correo, password, nombre_rol, detalle_aprendiz=null } = req.body;
    if (![ROLES.APRENDIZ, ROLES.INVITADO].includes(nombre_rol)) throw Object.assign(new Error('Solo se permite registro público de APRENDIZ o INVITADO.'), { status: 403 });
    if (password.length < 10) throw Object.assign(new Error('La contraseña debe tener al menos 10 caracteres.'), { status: 400 });
    if (nombre_rol === ROLES.APRENDIZ && !detalle_aprendiz) throw Object.assign(new Error('detalle_aprendiz es obligatorio para APRENDIZ.'), { status: 400 });
    await connection.beginTransaction();
    const [u] = await connection.query('INSERT INTO usuario (tipo_documento,numero_documento,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,n_celular,estado) VALUES (?,?,?,?,?,?,?,1)', [tipo_documento,numero_documento,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,n_celular]);
    const hash = await bcrypt.hash(password, 12);
    await connection.query('INSERT INTO cuenta (id_usuario,correo,password_hash,estado) VALUES (?,?,?,1)', [u.insertId,correo,hash]);
    const [roles] = await connection.query('SELECT id FROM rol WHERE nombre_rol=?', [nombre_rol]);
    if (!roles.length) throw Object.assign(new Error('Rol inexistente.'), { status: 400 });
    await connection.query('INSERT INTO usuario_rol (id_usuario,id_rol,estado) VALUES (?,?,1)', [u.insertId,roles[0].id]);
    if (detalle_aprendiz) {
      required(detalle_aprendiz, ['id_centro','ficha','imagen_url_aprendiz','direccion','imagen_url_identificacion','imagen_url_carnet_sena','fecha_vinculacion']);
      await connection.query('INSERT INTO detalle_aprendiz (id_usuario,id_centro,ficha,imagen_url_aprendiz,direccion,imagen_url_identificacion,imagen_url_carnet_sena,fecha_vinculacion,fecha_terminacion) VALUES (?,?,?,?,?,?,?,?,?)', [u.insertId,detalle_aprendiz.id_centro,detalle_aprendiz.ficha,detalle_aprendiz.imagen_url_aprendiz,detalle_aprendiz.direccion,detalle_aprendiz.imagen_url_identificacion,detalle_aprendiz.imagen_url_carnet_sena,detalle_aprendiz.fecha_vinculacion,detalle_aprendiz.fecha_terminacion || null]);
    }
    await connection.commit();
    return res.status(201).json({ ok: true, mensaje: 'Usuario registrado.', id_usuario: u.insertId });
  } catch (err) { await connection.rollback(); return error(res, err); } finally { connection.release(); }
}

