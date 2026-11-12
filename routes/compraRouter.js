import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { validarCompra } from '../middleware/validar.js';
import { formularioNueva, registrar, historial, detalle } from '../controllers/compraController.js';

const router = express.Router();
router.use(autenticar, autorizarRol('ADMINISTRADOR', 'EMPLEADO'));

router.get('/', (req, res) => res.redirect('/compras/historial'));
router.get('/nueva', formularioNueva);
// POST /compras -> autenticar -> autorizarRol -> validarCompra -> registrar -> ventaService
router.post('/', validarCompra, registrar);
// Las rutas específicas van antes de /:id
router.get('/historial', historial);
router.get('/:id', detalle);

export default router;
