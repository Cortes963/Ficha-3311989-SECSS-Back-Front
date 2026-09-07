import express from 'express';
import { storeReport } from '../../controller/reporte/reporteFile.js';
import { indexReport } from '../../controller/reporte/reporteList.js';
import { showReportId } from '../../controller/reporte/reporteSearchID.js';
import { updateReport } from '../../controller/reporte/reporteUpdate.js';
import { destroyReport } from '../../controller/reporte/reporteDelete.js';

const router = express.Router();

router.post('/', storeReport);
router.get('/', indexReport);
router.get('/:id', showReportId);
router.put('/:id', updateReport);
router.delete('/:id', destroyReport);

export default router;
