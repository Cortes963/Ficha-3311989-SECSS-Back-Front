import express from 'express';
import {
  indexQuota,
  showQuota,
  storeQuota,
  updateQuota
} from '../../controller/quota/quota.controller.js';

const router = express.Router();

router.get('/', indexQuota);
router.get('/usuario/:id', showQuota);
router.post('/', storeQuota);
router.patch('/:idUsuario/:idVehiculo', updateQuota);

export default router;
