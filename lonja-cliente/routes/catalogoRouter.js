import express from 'express';
import { acceso } from '../middleware/sesion.js';
import { listar, detalle, comprar } from '../controllers/catalogoController.js';

// Catálogo de ofertas: solo cuentas COMPRADOR
const router = express.Router();
router.use(acceso('COMPRADOR'));

router.get('/', listar);
router.get('/:id', detalle);
// Compra en segundo plano (fetch desde public/js/catalogo.js) -> POST /api/catalogo/:id/comprar
router.post('/:id/comprar', comprar);

export default router;
