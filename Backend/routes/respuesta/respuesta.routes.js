import express from 'express';
import { indexAnswer } from '../../controller/respuesta/respuestaList.js';
import { showAnswerId } from '../../controller/respuesta/respuestaSearchList.js';
import { updateAnswer } from '../../controller/respuesta/respuestaUpdate.js';
import { destroyAnswer } from '../../controller/respuesta/respuestaDelete.js';

const router = express.Router();

router.get('/', indexAnswer);
router.get('/:id', showAnswerId);
router.put('/:id', updateAnswer);
router.delete('/:id', destroyAnswer);

export default router;
