import db from '../db.js';
import { actorId, error, integer, page, required, ROLES } from '../lib.js';
import { createUserWithAccount, assignRole } from '../services/user.service.js';
import { saveUploadedFile } from '../services/fileStorage.service.js';

export async function indexInputOutput(req, res) {
  try {
    const { pagina, limite, offset } = page(req.query);
    const params = [];
    const filters = [];
    const ownOnly = req.user?.roles?.some((role) => [ROLES.APRENDIZ, ROLES.INVITADO].includes(role))
      && !req.user.roles.some((role) => [ROLES.ADMIN, ROLES.JEFE, ROLES.CELADOR].includes(role));
    if (ownOnly) {
      filters.push('es.id_usuario_entra=?');
      params.push(actorId(req));
    }
    if (req.query.id_usuario) { filters.push('es.id_usuario_entra=?'); params.push(integer(req.query.id_usuario, 'id_usuario')); }
    if (req.query.id_vehiculo) { filters.push('es.id_vehiculo=?'); params.push(integer(req.query.id_vehiculo, 'id_vehiculo')); }
    if (req.query.estado === 'DENTRO') filters.push('es.fecha_hora_salida IS NULL');
    if (req.query.estado === 'FUERA') filters.push('es.fecha_hora_salida IS NOT NULL');
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [[count]] = await db.query(`SELECT COUNT(*) total FROM entrada_salida es ${where}`, params);
    const [datos] = await db.query(
      `SELECT es.id AS registro_id, es.id_usuario_entra, es.id_vehiculo,
              es.fecha_hora_ingreso, es.fecha_hora_salida,
              es.id_usuario_celador_ingreso, es.id_usuario_celador_salida,
              CONCAT(u.primer_nombre,' ',u.primer_apellido) AS persona_ingresa,
              CONCAT(u.primer_nombre,' ',u.primer_apellido) AS propietario,
              u.numero_documento AS documento_persona,
              v.tipo_vehiculo, v.marca, v.color,
              COALESCE(dm.placa, dbi.numero_marco) AS identificador_vehiculo,
              dm.placa, dbi.numero_marco,
              CONCAT(ci.primer_nombre,' ',ci.primer_apellido) AS celador_ingreso,
              CONCAT(cs.primer_nombre,' ',cs.primer_apellido) AS celador_salida
       FROM entrada_salida es JOIN usuario u ON u.id=es.id_usuario_entra
       JOIN vehiculo v ON v.id=es.id_vehiculo
       LEFT JOIN detalle_moto dm ON dm.id_vehiculo=v.id
       LEFT JOIN detalle_bicicleta dbi ON dbi.id_vehiculo=v.id
       LEFT JOIN usuario ci ON ci.id=es.id_usuario_celador_ingreso
       LEFT JOIN usuario cs ON cs.id=es.id_usuario_celador_salida
       ${where} ORDER BY es.fecha_hora_ingreso DESC LIMIT ? OFFSET ?`,
      [...params, limite, offset]
    );
    const normalized = datos.map((row) => ({
      ...row,
      id: row.registro_id,
      placa: row.placa || null,
      numero_marco: row.numero_marco || null,
      persona: row.persona_ingresa,
      documento: row.documento_persona,
      fecha_ingreso: row.fecha_hora_ingreso,
      fecha_salida: row.fecha_hora_salida,
      celador_ingreso_nombre: row.celador_ingreso,
      celador_salida_nombre: row.celador_salida
    }));
    return res.json({ ok: true, pagina, limite, total: count.total, datos: normalized });
  } catch (err) { return error(res, err); }
}

export async function indexMyInputOutput(req, res) {
  req.query.id_usuario = actorId(req);
  return indexInputOutput(req, res);
}

export async function showInputOutput(req, res) {
  try {
    const id = integer(req.params.id, 'id');
    const [rows] = await db.query(
      `SELECT es.id AS registro_id, es.id_usuario_entra, es.id_vehiculo,
              es.fecha_hora_ingreso, es.fecha_hora_salida,
              CONCAT(u.primer_nombre,' ',u.primer_apellido) AS persona_ingresa,
              u.tipo_documento, u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido, u.n_celular, u.estado AS usuario_estado,
              c.correo, c.created_at AS cuenta_created_at, c.estado AS cuenta_estado,
              u.numero_documento AS documento_persona,
              da.ficha, da.fecha_vinculacion, da.fecha_terminacion, centro.nombre_centro,
              v.tipo_vehiculo, v.marca, v.color,
              COALESCE(dm.placa, dbi.numero_marco) AS identificador_vehiculo,
              v.imagen_url_tarjeta_propiedad, v.imagen_url_identificacion_vehiculo, v.imagen_url_vehiculo,
              dm.imagen_url_soat, dm.imagen_url_tecnomecanica_vigente,
              CONCAT(ci.primer_nombre,' ',ci.primer_apellido) AS celador_ingreso,
              CONCAT(cs.primer_nombre,' ',cs.primer_apellido) AS celador_salida
       FROM entrada_salida es
       JOIN usuario u ON u.id=es.id_usuario_entra
       JOIN vehiculo v ON v.id=es.id_vehiculo
       JOIN cuenta c ON c.id_usuario=u.id
       LEFT JOIN detalle_aprendiz da ON da.id_usuario=u.id
       LEFT JOIN centro ON centro.id=da.id_centro
       LEFT JOIN detalle_moto dm ON dm.id_vehiculo=v.id
       LEFT JOIN detalle_bicicleta dbi ON dbi.id_vehiculo=v.id
       LEFT JOIN usuario ci ON ci.id=es.id_usuario_celador_ingreso
       LEFT JOIN usuario cs ON cs.id=es.id_usuario_celador_salida
       WHERE es.id=?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, mensaje: 'Registro de entrada/salida no encontrado.' });
    const restricted = req.user?.roles?.some((role) => [ROLES.INVITADO, ROLES.APRENDIZ].includes(role))
      && !req.user?.roles?.some((role) => [ROLES.CELADOR, ROLES.JEFE].includes(role));
    if (restricted && Number(rows[0].id_usuario_entra) !== actorId(req)) {
      return res.status(403).json({ ok: false, mensaje: 'No puede consultar este registro.' });
    }
    return res.json({ ok: true, datos: { ...rows[0], id: rows[0].registro_id } });
  } catch (err) { return error(res, err); }
}

export async function storeInputOutput(req, res) {
  const connection = await db.getConnection();
  try {
    required(req.body, ['id_usuario_entra', 'id_vehiculo']);
    const idUsuario = integer(req.body.id_usuario_entra, 'id_usuario_entra');
    const idVehiculo = integer(req.body.id_vehiculo, 'id_vehiculo');
    await connection.beginTransaction();
    const [quota] = await connection.query('SELECT 1 FROM auth_vehiculo WHERE id_usuario=? AND id_vehiculo=? AND estado=1 FOR UPDATE', [idUsuario, idVehiculo]);
    if (!quota.length) throw Object.assign(new Error('El usuario no tiene un cupo activo para ese vehículo.'), { status: 403 });
    const [open] = await connection.query('SELECT id FROM entrada_salida WHERE id_vehiculo=? AND fecha_hora_salida IS NULL FOR UPDATE', [idVehiculo]);
    if (open.length) throw Object.assign(new Error('El vehículo ya tiene una entrada abierta.'), { status: 409 });
    const [result] = await connection.query('INSERT INTO entrada_salida (id_usuario_entra,id_vehiculo,fecha_hora_ingreso,id_usuario_celador_ingreso) VALUES (?,?,NOW(),?)', [idUsuario, idVehiculo, actorId(req)]);
    await connection.commit();
    return res.status(201).json({ ok: true, mensaje: 'Entrada registrada correctamente.', id_entrada_salida: result.insertId });
  } catch (err) { await connection.rollback(); return error(res, err); }
  finally { connection.release(); }
}

export async function updateInputOutputExit(req, res) {
  const connection = await db.getConnection();
  try {
    const id = integer(req.params.id, 'id');
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT fecha_hora_salida FROM entrada_salida WHERE id=? FOR UPDATE', [id]);
    if (!rows.length) throw Object.assign(new Error('Registro de entrada no encontrado.'), { status: 404 });
    if (rows[0].fecha_hora_salida) throw Object.assign(new Error('Este registro ya tiene una salida.'), { status: 409 });
    await connection.query('UPDATE entrada_salida SET fecha_hora_salida=NOW(),id_usuario_celador_salida=? WHERE id=?', [actorId(req), id]);
    await connection.commit();
    return res.json({ ok: true, mensaje: 'Salida registrada correctamente.' });
  } catch (err) { await connection.rollback(); return error(res, err); }
  finally { connection.release(); }
}

export async function storeGuestInputOutput(req, res) {
  const connection = await db.getConnection();
  try {
    required(req.body, ['tipo_vehiculo','marca','color','expira_en']);
    const hasExistingUser = req.body.id_usuario !== undefined && req.body.id_usuario !== null && req.body.id_usuario !== '';
    if (!hasExistingUser) required(req.body, ['tipo_documento','numero_documento','primer_nombre','primer_apellido','n_celular','correo']);
    const names = ['imagen_url_vehiculo','imagen_url_identificacion_vehiculo','imagen_url_tarjeta_propiedad'];
    const type = String(req.body.tipo_vehiculo).toUpperCase();
    if (!['MOTO','BICICLETA'].includes(type)) throw Object.assign(new Error('tipo_vehiculo debe ser MOTO o BICICLETA.'), { status: 400 });
    const expiration = new Date(req.body.expira_en);
    if (Number.isNaN(expiration.getTime()) || expiration <= new Date()) throw Object.assign(new Error('expira_en debe ser una fecha futura válida.'), { status: 400 });
    await connection.beginTransaction();
    let idUsuario;
    let credentials = null;
    if (hasExistingUser) {
      idUsuario = integer(req.body.id_usuario, 'id_usuario');
      const [users] = await connection.query('SELECT id FROM usuario WHERE id=? AND estado=1 FOR UPDATE', [idUsuario]);
      if (!users.length) throw Object.assign(new Error('Usuario no encontrado o inactivo.'), { status: 404 });
    } else {
      const created = await createUserWithAccount(connection, req.body);
      idUsuario = created.id_usuario;
      credentials = { correo: req.body.correo, password: created.password };
    }
    await assignRole(connection, idUsuario, ROLES.INVITADO);
    const genericImage = '3/6174426c-cc93-42c9-a968-28e5b470c31f.jpg';
    const paths = {
      imagen_url_tarjeta_propiedad: genericImage,
      imagen_url_identificacion_vehiculo: genericImage,
      imagen_url_vehiculo: genericImage
    };
    for (const name of names) {
      if (!req.files?.[name]?.[0]) continue;
      const saved = await saveUploadedFile(req.files[name][0], actorId(req));
      paths[name] = saved.ruta;
      await connection.query('INSERT INTO archivo (nombre_original,nombre_almacenado,mime_type,tamano,ruta,id_usuario_subida) VALUES (?,?,?,?,?,?)', [saved.nombre_original,saved.nombre_almacenado,saved.mime_type,saved.tamano,saved.ruta,actorId(req)]);
    }
    const [vehicle] = await connection.query('INSERT INTO vehiculo (tipo_vehiculo,marca,color,imagen_url_tarjeta_propiedad,imagen_url_identificacion_vehiculo,imagen_url_vehiculo,estado) VALUES (?,?,?,?,?,?,1)', [type,req.body.marca,req.body.color,paths.imagen_url_tarjeta_propiedad,paths.imagen_url_identificacion_vehiculo,paths.imagen_url_vehiculo]);
    await connection.query('INSERT INTO auth_vehiculo (id_usuario,id_vehiculo,estado,id_usuario_administrador) VALUES (?,?,1,?)', [idUsuario,vehicle.insertId,actorId(req)]);
    await connection.query('INSERT INTO entrada_salida (id_usuario_entra,id_vehiculo,fecha_hora_ingreso,id_usuario_celador_ingreso) VALUES (?,?,NOW(),?)', [idUsuario,vehicle.insertId,actorId(req)]);
    await connection.commit();
    return res.status(201).json({ ok:true, mensaje:'Invitado registrado y entrada creada.', id_usuario:idUsuario, id_vehiculo:vehicle.insertId, ...(credentials ? { credenciales_temporales: credentials } : {}) });
  } catch (err) { await connection.rollback(); return error(res, err); }
  finally { connection.release(); }
}
