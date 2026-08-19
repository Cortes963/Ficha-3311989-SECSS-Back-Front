import { Router } from 'express';
import { getAllUsers, getUserById, createUser, assignCeladorToJefe } from '../../controller/user/user.controller.js';

const router = Router();

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.post('/asignar-celador', assignCeladorToJefe);

export default router;