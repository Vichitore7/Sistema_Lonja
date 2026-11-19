import express from 'express';
import { acceso } from '../middleware/sesion.js';
import { inventario } from '../controllers/loteController.js';

const router = express.Router();

router.get('/', acceso('ADMINISTRADOR', 'EMPLEADO'), inventario);

export default router;
