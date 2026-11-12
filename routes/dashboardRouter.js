import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { panel } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/', autenticar, autorizarRol('ADMINISTRADOR', 'EMPLEADO'), panel);

export default router;
