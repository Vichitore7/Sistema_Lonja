import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { historial, detalle } from '../controllers/compraController.js';

// Historial interno de compras (solo lectura). La captura manual de compras se retiró:
// las compras solo nacen cuando un comprador adquiere un lote publicado (POST /catalogo/:id/comprar),
// así nadie puede saltarse el precio final fijado por el Administrador.
const router = express.Router();
router.use(autenticar, autorizarRol('ADMINISTRADOR', 'EMPLEADO'));

router.get('/', (req, res) => res.redirect('/compras/historial'));
// Las rutas específicas van antes de /:id
router.get('/historial', historial);
router.get('/:id', detalle);

export default router;
