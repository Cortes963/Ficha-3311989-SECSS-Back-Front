// routes/pqrsRoutes.js
const express = require('express');
const router = express.Router();
const pqrsController = require('../controllers/pqrsController');

// Crear una nueva PQRS
router.post('/', pqrsController.crearPqrs);

// Listar PQRS (filtros opcionales: ?estado=, ?id_usuario=, ?pagina=, ?limite=)
router.get('/', pqrsController.listarPqrs);

// Detalle de una PQRS puntual (incluye su respuesta si existe)
router.get('/:id', pqrsController.obtenerPqrsPorId);

// Registrar la respuesta de un administrador a una PQRS
router.post('/:id/respuesta', pqrsController.responderPqrs);

// Cambiar el estado de una PQRS manualmente (en proceso, cerrada, etc.)
router.put('/:id/estado', pqrsController.actualizarEstado);

module.exports = router;
