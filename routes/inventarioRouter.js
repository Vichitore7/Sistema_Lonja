import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { listar } from '../controllers/inventarioController.js';

const router = express.Router();

router.get('/', autenticar, autorizarRol('ADMINISTRADOR', 'EMPLEADO'), listar);

export default router;
