import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { reporte, pdf, redirigirAntiguo } from '../controllers/reporteController.js';

const router = express.Router();
router.use(autenticar, autorizarRol('ADMINISTRADOR', 'EMPLEADO'));

// GET /reportes?desde=YYYY-MM-DD&hasta=YYYY-MM-DD   y   GET /reportes/pdf?desde=&hasta=
router.get('/', reporte);
router.get('/pdf', pdf);
// Direcciones anteriores (reporte diario / periodo): se redirigen al reporte por rango
router.get(['/diario', '/periodo'], redirigirAntiguo(''));
router.get(['/diario/pdf', '/periodo/pdf'], redirigirAntiguo('/pdf'));

export default router;
