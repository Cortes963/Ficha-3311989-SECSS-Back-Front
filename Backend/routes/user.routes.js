/**
 * Backend module: routes/user.routes.js
 * HTTP handlers and infrastructure for this resource.
 * Validates input, executes database work, and returns API responses.
 */

import { Router } from 'express'; import { allowRoles } from '../middleware/auth.js'; import { ROLES } from '../lib.js'; import { indexUser,showUserId,updateUser,updateUserState,storeSecurityChiefGuard } from '../controller/user.controller.js';
const r=Router(); r.get('/me',(req,_res,next)=>{req.params.id=req.user.id;next();},showUserId); r.patch('/me',updateUser); r.get('/',allowRoles(ROLES.ADMIN,ROLES.JEFE),indexUser); r.get('/:id',allowRoles(ROLES.ADMIN,ROLES.JEFE),showUserId); r.patch('/:id/estado',allowRoles(ROLES.ADMIN),updateUserState); r.post('/asignar-celador',allowRoles(ROLES.ADMIN,ROLES.JEFE),storeSecurityChiefGuard); export default r;

