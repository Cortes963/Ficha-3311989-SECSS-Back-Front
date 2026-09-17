/**
 * Backend module: controller/quota.controller.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import db from '../db.js'; import { ROLES, actorId,error,integer,page } from '../lib.js';

export async function indexQuota(req,res){try{const {pagina,limite,offset}=page(req.query);
const [[total]]=await db.query('SELECT COUNT(*) total FROM auth_vehiculo');
const [datos]=await db.query(`SELECT av.id_usuario,av.id_vehiculo,av.estado,av.id_usuario_administrador,
u.numero_documento,CONCAT(u.primer_nombre,' ',u.primer_apellido) AS usuario,
da.ficha,da.fecha_vinculacion,da.fecha_terminacion,c.nombre_centro,
v.tipo_vehiculo,v.marca,v.color,COALESCE(dm.placa,db.numero_marco) AS identificador_vehiculo,
CONCAT(a.primer_nombre,' ',a.primer_apellido) AS administrador_auditor
FROM auth_vehiculo av JOIN usuario u ON u.id=av.id_usuario
JOIN vehiculo v ON v.id=av.id_vehiculo
LEFT JOIN detalle_aprendiz da ON da.id_usuario=u.id
LEFT JOIN centro c ON c.id=da.id_centro
LEFT JOIN usuario a ON a.id=av.id_usuario_administrador
LEFT JOIN detalle_moto dm ON dm.id_vehiculo=v.id
LEFT JOIN detalle_bicicleta db ON db.id_vehiculo=v.id
ORDER BY av.updated_at DESC LIMIT ? OFFSET ?`,[limite,offset]);
const normalized=datos.map((row)=>({
...row,
estado_autorizacion:({0:'INACTIVO',1:'ACTIVO'})[row.estado] || row.estado,
vehiculo:row.tipo_vehiculo,
identificador:row.identificador_vehiculo
}));
res.json({ok:true,pagina,limite,total:total.total,datos:normalized});
}catch(e){return error(res,e);}}

// GET /api/quota/usuario/:idUsuario — cupo/vehículo vigente de un usuario puntual,
// más si el vehículo está actualmente dentro del parqueadero (entrada sin salida).
// Un usuario sin rol privilegiado solo puede consultar su propio cupo.
export async function showQuotaByUser(req,res){try{
  const idUsuario=integer(req.params.idUsuario,'idUsuario');
  const privilegiado=[ROLES.ADMIN,ROLES.JEFE,ROLES.CELADOR].some(rol=>req.user.roles.includes(rol));
  if(!privilegiado && actorId(req)!==idUsuario) return res.status(403).json({ok:false,mensaje:'No tiene permisos para esta operación.'});

  const [vehiculos]=await db.query(
    `SELECT av.id_usuario,av.id_vehiculo,av.estado AS estado_cupo,
            u.numero_documento,CONCAT(u.primer_nombre,' ',u.primer_apellido) AS usuario,
            v.tipo_vehiculo,v.marca,v.color,
            COALESCE(dm.placa,db.numero_marco) AS identificador_vehiculo,
            dm.placa,dm.cilindraje,dm.modelo,
            db.numero_marco,db.clase_bicicleta
     FROM auth_vehiculo av
     JOIN usuario u ON u.id=av.id_usuario
     JOIN vehiculo v ON v.id=av.id_vehiculo
     LEFT JOIN detalle_moto dm ON dm.id_vehiculo=v.id
     LEFT JOIN detalle_bicicleta db ON db.id_vehiculo=v.id
     WHERE av.id_usuario=?
     ORDER BY av.updated_at DESC
     LIMIT 1`,
    [idUsuario]
  );

  const vehiculo=vehiculos[0]||null;
  let vehiculoEnParqueadero=false;
  let idEntradaAbierta=null;

  if(vehiculo){
    const [abiertas]=await db.query(
      'SELECT id FROM entrada_salida WHERE id_vehiculo=? AND fecha_hora_salida IS NULL',
      [vehiculo.id_vehiculo]
    );
    if(abiertas.length){vehiculoEnParqueadero=true;idEntradaAbierta=abiertas[0].id;}
  }

  res.json({ok:true,vehiculo,vehiculoEnParqueadero,idEntradaAbierta});
}catch(e){return error(res,e);}}

export async function showQuotaDetail(req, res) {
  try {
    const idUsuario = integer(req.params.idUsuario, 'idUsuario');
    const idVehiculo = integer(req.params.idVehiculo, 'idVehiculo');
    const privileged = [ROLES.ADMIN, ROLES.JEFE, ROLES.CELADOR].some((role) => req.user.roles.includes(role));
    if (!privileged && actorId(req) !== idUsuario) return res.status(403).json({ ok: false, mensaje: 'No tiene permisos para esta operación.' });
    const [rows] = await db.query(
      `SELECT av.id_usuario,av.id_vehiculo,av.estado,av.id_usuario_administrador,
              u.numero_documento,CONCAT(u.primer_nombre,' ',u.primer_apellido) AS usuario,
              da.ficha,da.fecha_vinculacion,da.fecha_terminacion,c.nombre_centro,
              v.tipo_vehiculo,v.marca,v.color,
              dm.placa,dm.cilindraje,dm.modelo,
              db.numero_marco,db.clase_bicicleta,
              COALESCE(dm.placa,db.numero_marco) AS identificador_vehiculo,
              CONCAT(a.primer_nombre,' ',a.primer_apellido) AS administrador_auditor
       FROM auth_vehiculo av
       JOIN usuario u ON u.id=av.id_usuario
       JOIN vehiculo v ON v.id=av.id_vehiculo
       LEFT JOIN detalle_aprendiz da ON da.id_usuario=u.id
       LEFT JOIN centro c ON c.id=da.id_centro
       LEFT JOIN detalle_moto dm ON dm.id_vehiculo=v.id
       LEFT JOIN detalle_bicicleta db ON db.id_vehiculo=v.id
       LEFT JOIN usuario a ON a.id=av.id_usuario_administrador
       WHERE av.id_usuario=? AND av.id_vehiculo=?`,
      [idUsuario, idVehiculo]
    );
    if (!rows.length) return res.status(404).json({ ok: false, mensaje: 'Autorización no encontrada.' });
    const [open] = await db.query('SELECT id FROM entrada_salida WHERE id_usuario_entra=? AND id_vehiculo=? AND fecha_hora_salida IS NULL LIMIT 1', [idUsuario, idVehiculo]);
    return res.json({ ok: true, datos: {
      ...rows[0],
      estado_autorizacion: ({ 0: 'INACTIVO', 1: 'ACTIVO' })[rows[0].estado] || rows[0].estado,
      idEntradaAbierta: open[0]?.id || null,
    } });
  } catch (e) { return error(res, e); }
}

export async function showMyQuota(req, res) {
  req.params.idUsuario = actorId(req);
  return showQuotaByUser(req, res);
}

export async function updateQuotaState(req,res){try{const user=integer(req.params.idUsuario,'idUsuario'),vehicle=integer(req.params.idVehiculo,'idVehiculo'),estado=Number(req.body.estado);
    if(![0,1].includes(estado))throw Object.assign(new Error('estado debe ser 0 o 1.'),{status:400});
    if(estado===1)await db.query('UPDATE auth_vehiculo SET estado=0 WHERE id_usuario=? AND id_vehiculo<>? AND estado=1',[user,vehicle]);
    const [r]=await db.query('UPDATE auth_vehiculo SET estado=?,id_usuario_administrador=? WHERE id_usuario=? AND id_vehiculo=?',[estado,actorId(req),user,vehicle]);
    if(!r.affectedRows)return res.status(404).json({ok:false,mensaje:'Cupo no encontrado.'});
    res.json({ok:true,mensaje:estado?'Cupo habilitado.':'Cupo deshabilitado.'});
}catch(e){return error(res,e);}}
