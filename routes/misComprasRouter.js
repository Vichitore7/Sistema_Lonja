import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { listar, pdf, detalle } from '../controllers/misComprasController.js';

// Historial personal: solo cuentas COMPRADOR y solo sus propias compras
const router = express.Router();
router.use(autenticar, autorizarRol('COMPRADOR'));

router.get('/', listar);
// GET /mis-compras/pdf?desde=&hasta=  (antes de /:id)
router.get('/pdf', pdf);
router.get('/:id', detalle);

export default router;
