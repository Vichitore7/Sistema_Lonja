import express from 'express';
import { acceso } from '../middleware/sesion.js';
import { listar, pdf, detalle } from '../controllers/misComprasController.js';

// Historial personal: solo cuentas COMPRADOR
const router = express.Router();
router.use(acceso('COMPRADOR'));

router.get('/', listar);
// GET /mis-compras/pdf?desde=&hasta=  (antes de /:id)
router.get('/pdf', pdf);
router.get('/:id', detalle);

export default router;
