import express from 'express';
import { acceso } from '../middleware/sesion.js';
import { historial, detalle } from '../controllers/compraController.js';

// Historial interno de compras (solo lectura): Administrador y Empleado
const router = express.Router();
router.use(acceso('ADMINISTRADOR', 'EMPLEADO'));

router.get('/', (req, res) => res.redirect('/compras/historial'));
// Las rutas específicas van antes de /:id
router.get('/historial', historial);
router.get('/:id', detalle);

export default router;
