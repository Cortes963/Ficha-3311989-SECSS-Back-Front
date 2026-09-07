import express from 'express';
import { indexinputOutput, storeInputOutput, updateInputOutput } from '../../controller/input_output/input_output.controller.js';

const router = express.Router();

router.get('/', indexinputOutput);
router.post('/entrada', storeInputOutput);
router.patch('/salida/:id', updateInputOutput);

export default router;
