import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { listar, detalle } from '../controllers/misComprasController.js';

// Historial personal: solo cuentas COMPRADOR y solo sus propias compras
const router = express.Router();
router.use(autenticar, autorizarRol('COMPRADOR'));

router.get('/', listar);
router.get('/:id', detalle);

export default router;
