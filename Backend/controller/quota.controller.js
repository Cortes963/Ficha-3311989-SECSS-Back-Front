/**
 * Backend module: controller/quota.controller.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import db from '../db.js'; import { actorId,error,integer,page } from '../lib.js';

export async function indexQuota(req,res){try{const {pagina,limite,offset}=page(req.query);
const [[total]]=await db.query('SELECT COUNT(*) total FROM auth_vehiculo');
const [datos]=await db.query(`SELECT av.*,u.primer_nombre,u.primer_apellido,v.tipo_vehiculo,v.marca,dm.placa,db.numero_marco FROM auth_vehiculo av JOIN usuario u ON u.id=av.id_usuario JOIN vehiculo v ON v.id=av.id_vehiculo LEFT JOIN detalle_moto dm ON dm.id_vehiculo=v.id LEFT JOIN detalle_bicicleta db ON db.id_vehiculo=v.id ORDER BY av.updated_at DESC LIMIT ? OFFSET ?`,[limite,offset]);
res.json({ok:true,pagina,limite,total:total.total,datos});
}catch(e){return error(res,e);}}

export async function updateQuotaState(req,res){try{const user=integer(req.params.idUsuario,'idUsuario'),vehicle=integer(req.params.idVehiculo,'idVehiculo'),estado=Number(req.body.estado);
    if(![0,1].includes(estado))throw Object.assign(new Error('estado debe ser 0 o 1.'),{status:400});
    if(estado===1)await db.query('UPDATE auth_vehiculo SET estado=0 WHERE id_usuario=? AND id_vehiculo<>? AND estado=1',[user,vehicle]);
    const [r]=await db.query('UPDATE auth_vehiculo SET estado=?,id_usuario_administrador=? WHERE id_usuario=? AND id_vehiculo=?',[estado,actorId(req),user,vehicle]);
    if(!r.affectedRows)return res.status(404).json({ok:false,mensaje:'Cupo no encontrado.'});
    res.json({ok:true,mensaje:estado?'Cupo habilitado.':'Cupo deshabilitado.'});
}catch(e){return error(res,e);}}


