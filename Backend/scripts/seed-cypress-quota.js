import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import cypressConfig from '../../frontend/cypress.config.js';

const { users, password, seed } = cypressConfig.expose;
const genericImage = '3/6174426c-cc93-42c9-a968-28e5b470c31f.jpg';
const rolesByAlias = {
  aprendiz1: 'APRENDIZ',
  aprendiz2: 'APRENDIZ',
  aprendiz3: 'APRENDIZ',
  aprendiz4: 'APRENDIZ',
  admin: 'ADMINISTRADOR',
  jefe: 'JEFE_SEGURIDAD',
  celador: 'CELADOR',
  celador2: 'CELADOR',
  invitado1: 'INVITADO',
};
const namesByAlias = {
  aprendiz2: ['Aprendiz', 'Dos'],
  aprendiz3: ['Aprendiz', 'Tres'],
  aprendiz4: ['Aprendiz', 'Cuatro'],
  celador: ['Celador', 'Prueba'],
  celador2: ['Celador', 'Dos'],
  invitado1: ['Invitado', 'Prueba'],
};
const inactiveUser = {
  id: seed.usuarioInactivoId,
  documento: '900000010',
  alias: 'usuario-inactivo',
};
const quotaVehicles = [
  { alias: 'aprendiz1', id: 2, state: 1, type: 'MOTO', plate: 'CYP0002' },
  { alias: 'aprendiz2', id: 3, state: 0, type: 'MOTO', plate: 'CYP0003' },
  { alias: 'aprendiz4', id: seed.aprendiz4.vehiculoA, state: 0, type: 'MOTO', plate: 'CYP0004' },
  { alias: 'invitado1', id: 5, state: 1, type: 'MOTO', plate: 'CYP0005' },
  { alias: 'aprendiz4', id: seed.aprendiz4.vehiculoB, state: 0, type: 'BICICLETA', frame: 'CYP0007' },
];

if (process.env.NODE_ENV === 'production' || process.env.CYPRESS_SEED_CONFIRM !== '1') {
  throw new Error('Solo para base local de pruebas: configura CYPRESS_SEED_CONFIRM=1 para continuar.');
}

if (!password || !users?.aprendiz1?.documento) {
  throw new Error('No se encontraron las credenciales de Cypress en cypress.config.js.');
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'SECSS',
});

async function findOrCreateUser(alias, credentials, { id, active = true } = {}) {
  const [byDocument] = await connection.query(
    'SELECT id FROM usuario WHERE numero_documento=? FOR UPDATE',
    [credentials.documento]
  );
  if (byDocument.length) {
    if (id && Number(byDocument[0].id) !== id) {
      throw new Error(`El usuario ${alias} existe con un ID distinto al reservado (${id}).`);
    }
    return byDocument[0].id;
  }

  if (id) {
    const [byId] = await connection.query('SELECT numero_documento FROM usuario WHERE id=? FOR UPDATE', [id]);
    if (byId.length) throw new Error(`El ID reservado ${id} ya pertenece a otro usuario.`);
  }

  const [result] = await connection.query(
    `INSERT INTO usuario
       (${id ? 'id,' : ''}tipo_documento,numero_documento,primer_nombre,primer_apellido,n_celular,estado)
     VALUES (${id ? '?,' : ''}?,?,?,?,?,?)`,
    [
      ...(id ? [id] : []),
      alias === 'invitado1' ? 'CC' : 'TI',
      credentials.documento,
      ...(namesByAlias[alias] || [alias, 'Prueba']),
      `300${credentials.documento.slice(-7)}`,
      active ? 1 : 0,
    ]
  );
  return result.insertId;
}

async function ensureAccount(userId, alias, credentials, active) {
  const [accounts] = await connection.query(
    'SELECT password_hash FROM cuenta WHERE id_usuario=? FOR UPDATE',
    [userId]
  );
  const hash = await bcrypt.hash(password, 12);
  const email = `${alias}.${credentials.documento}@cypress.test`;
  if (accounts.length) {
    const passwordMatches = await bcrypt.compare(password, accounts[0].password_hash);
    await connection.query(
      `UPDATE cuenta SET password_hash=?,estado=?,expira_en=NULL,
                         intentos_fallidos=0,bloqueada_hasta=NULL
       WHERE id_usuario=?`,
      [passwordMatches ? accounts[0].password_hash : hash, active ? 1 : 0, userId]
    );
  } else {
    await connection.query(
      'INSERT INTO cuenta (id_usuario,correo,password_hash,estado,expira_en) VALUES (?,?,?,?,NULL)',
      [userId, email, hash, active ? 1 : 0]
    );
  }
}

async function ensureRole(userId, roleName) {
  const [roleRows] = await connection.query('SELECT id FROM rol WHERE nombre_rol=?', [roleName]);
  if (!roleRows.length) throw new Error(`El rol ${roleName} no existe en la base de datos.`);
  const targetRoleId = roleRows[0].id;
  await connection.query(
    'UPDATE usuario_rol SET estado=0 WHERE id_usuario=? AND id_rol<>?',
    [userId, targetRoleId]
  );
  await connection.query(
    `INSERT INTO usuario_rol (id_usuario,id_rol,estado) VALUES (?,?,1)
     ON DUPLICATE KEY UPDATE estado=1`,
    [userId, targetRoleId]
  );
}

async function ensureApprenticeDetails(userId, centerId) {
  await connection.query(
    `INSERT INTO detalle_aprendiz
       (id_usuario,id_centro,ficha,imagen_url_aprendiz,direccion,
        imagen_url_identificacion,imagen_url_carnet_sena,fecha_vinculacion)
     VALUES (?,?,?,?,'Datos de prueba Cypress',?,?, '2026-01-15')
     ON DUPLICATE KEY UPDATE id_centro=VALUES(id_centro),ficha=VALUES(ficha),
                             imagen_url_aprendiz=VALUES(imagen_url_aprendiz),
                             direccion=VALUES(direccion),
                             imagen_url_identificacion=VALUES(imagen_url_identificacion),
                             imagen_url_carnet_sena=VALUES(imagen_url_carnet_sena),
                             fecha_vinculacion=VALUES(fecha_vinculacion)`,
    [userId, centerId, `CYP-${userId}`, genericImage, genericImage, genericImage]
  );
}

async function ensureVehicle(userId, administratorId, vehicle) {
  const [existing] = await connection.query('SELECT id FROM vehiculo WHERE id=? FOR UPDATE', [vehicle.id]);
  if (existing.length) {
    const [owners] = await connection.query(
      'SELECT id_usuario FROM auth_vehiculo WHERE id_vehiculo=? FOR UPDATE',
      [vehicle.id]
    );
    if (owners.length !== 1 || Number(owners[0].id_usuario) !== Number(userId)) {
      throw new Error(`El vehículo reservado ${vehicle.id} ya está asignado a otro usuario.`);
    }
    await connection.query(
      `UPDATE vehiculo SET tipo_vehiculo=?,marca=?,color=?,estado=1,
                           imagen_url_tarjeta_propiedad=?,imagen_url_identificacion_vehiculo=?,
                           imagen_url_vehiculo=?
       WHERE id=?`,
      [vehicle.type, 'Cypress', 'Azul', genericImage, genericImage, genericImage, vehicle.id]
    );
  } else {
    await connection.query(
      `INSERT INTO vehiculo
         (id,tipo_vehiculo,marca,color,imagen_url_tarjeta_propiedad,
          imagen_url_identificacion_vehiculo,imagen_url_vehiculo,estado)
       VALUES (?,?, 'Cypress','Azul',?,?,?,1)`,
      [vehicle.id, vehicle.type, genericImage, genericImage, genericImage]
    );
  }

  if (vehicle.type === 'MOTO') {
    await connection.query(
      `INSERT INTO detalle_moto
         (id_vehiculo,placa,cilindraje,modelo,imagen_url_soat,imagen_url_tecnomecanica_vigente)
       VALUES (?,?,125,'2024',?,?)
       ON DUPLICATE KEY UPDATE placa=VALUES(placa),cilindraje=VALUES(cilindraje),
                               modelo=VALUES(modelo),imagen_url_soat=VALUES(imagen_url_soat),
                               imagen_url_tecnomecanica_vigente=VALUES(imagen_url_tecnomecanica_vigente)`,
      [vehicle.id, vehicle.plate, genericImage, genericImage]
    );
  } else {
    await connection.query(
      `INSERT INTO detalle_bicicleta (id_vehiculo,numero_marco,clase_bicicleta)
       VALUES (?,?, 'Montaña')
       ON DUPLICATE KEY UPDATE numero_marco=VALUES(numero_marco),
                               clase_bicicleta=VALUES(clase_bicicleta)`,
      [vehicle.id, vehicle.frame]
    );
  }

  await connection.query(
    `INSERT INTO auth_vehiculo (id_usuario,id_vehiculo,estado,id_usuario_administrador)
     VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE estado=VALUES(estado),
                             id_usuario_administrador=VALUES(id_usuario_administrador)`,
    [userId, vehicle.id, vehicle.state, administratorId]
  );
}

try {
  await connection.beginTransaction();

  const inactiveId = await findOrCreateUser(
    inactiveUser.alias,
    { documento: inactiveUser.documento },
    { id: inactiveUser.id, active: false }
  );
  const aliases = Object.keys(rolesByAlias);
  const userIds = {};
  for (const alias of aliases) {
    userIds[alias] = await findOrCreateUser(alias, users[alias]);
  }

  for (const alias of aliases) {
    await connection.query('UPDATE usuario SET estado=1 WHERE id=?', [userIds[alias]]);
    await ensureAccount(userIds[alias], alias, users[alias], true);
    await ensureRole(userIds[alias], rolesByAlias[alias]);
  }
  const [centers] = await connection.query('SELECT id FROM centro ORDER BY id LIMIT 1');
  if (!centers.length) throw new Error('No existe un centro para completar los datos de aprendiz de Cypress.');
  for (const alias of ['aprendiz1', 'aprendiz2', 'aprendiz3', 'aprendiz4']) {
    await ensureApprenticeDetails(userIds[alias], centers[0].id);
  }
  await connection.query('UPDATE usuario SET estado=0 WHERE id=?', [inactiveId]);
  await ensureAccount(
    inactiveId,
    inactiveUser.alias,
    { documento: inactiveUser.documento },
    false
  );
  await ensureRole(inactiveId, 'APRENDIZ');

  const [adminRows] = await connection.query(
    'SELECT id FROM usuario WHERE numero_documento=?',
    [users.admin.documento]
  );
  if (!adminRows.length) throw new Error('No se encontró el administrador configurado en Cypress.');
  for (const vehicle of quotaVehicles) {
    await ensureVehicle(userIds[vehicle.alias], adminRows[0].id, vehicle);
  }
  await connection.query('DELETE FROM auth_vehiculo WHERE id_usuario=?', [userIds.aprendiz3]);

  await connection.commit();
  console.log(JSON.stringify({
    seededAliases: aliases,
    inactiveUserId: inactiveId,
    quotaVehicleIds: quotaVehicles.map(({ id }) => id),
  }));
} catch (error) {
  await connection.rollback();
  console.error(`No se pudo sembrar la base de pruebas: ${error.message}`);
  process.exitCode = 1;
} finally {
  await connection.end();
}
