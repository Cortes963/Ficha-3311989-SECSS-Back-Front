import express from 'express';
const router = express.Router();
const db = require('../../db.js');
const { crearDetalleMoto } = require('./motorcycle_details.js');
const { crearDetalleBicicleta } = require('./bicycle_details.js');


