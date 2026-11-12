import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { limitarCompra } from '../middleware/seguridad.js';
import { listar, detalle, comprar } from '../controllers/catalogoController.js';

// Catálogo de ofertas: solo cuentas COMPRADOR
const router = express.Router();
router.use(autenticar, autorizarRol('COMPRADOR'));

router.get('/', listar);
router.get('/:id', detalle);
// POST /catalogo/:id/comprar -> autenticar -> autorizarRol(COMPRADOR) -> CSRF -> ventaService.comprarLote
router.post('/:id/comprar', limitarCompra, comprar);

export default router;
