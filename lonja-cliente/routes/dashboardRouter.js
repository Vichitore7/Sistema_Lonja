import express from 'express';
import { acceso } from '../middleware/sesion.js';
import { panel } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/', acceso('ADMINISTRADOR', 'EMPLEADO'), panel);

export default router;
