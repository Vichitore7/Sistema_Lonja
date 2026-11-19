import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { historial, detalle } from '../controllers/compraController.js';

// Historial interno de compras (solo lectura). Las compras solo nacen cuando un comprador
// adquiere un lote publicado (POST /api/catalogo/:id/comprar).
const router = express.Router();
router.use(autenticar, autorizarRol('ADMINISTRADOR', 'EMPLEADO'));

router.get('/', historial);
router.get('/:id', detalle);

export default router;
