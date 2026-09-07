import { Router } from 'express';
import { indexUser, showUserId, storeUser, assignCeladorToJefe } from '../../controller/user/user.controller.js';

const router = Router();

router.get('/', indexUser);
router.get('/:id', showUserId);
router.post('/', storeUser);
router.post('/asignar-celador', assignCeladorToJefe);

export default router;