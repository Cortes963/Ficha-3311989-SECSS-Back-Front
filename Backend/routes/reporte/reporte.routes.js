import express from 'express';
import { crearReporte } from '../../controller/reporte/reporteFile.js';
import { listarReportes } from '../../controller/reporte/reporteList.js';
import { obtenerReportePorId } from '../../controller/reporte/reporteSearchID.js';
import { actualizarReporte } from '../../controller/reporte/reporteUpdate.js';
import { eliminarReporte } from '../../controller/reporte/reporteDelete.js';

const router = express.Router();

router.post('/', crearReporte);
router.get('/', listarReportes);
router.get('/:id', obtenerReportePorId);
router.put('/:id', actualizarReporte);
router.delete('/:id', eliminarReporte);

export default router;
