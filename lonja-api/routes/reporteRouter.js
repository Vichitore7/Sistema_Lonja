import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { dashboard, listarJornadas, reporte, pdf } from '../controllers/reporteController.js';

// Se monta en /api: Administrador y Empleado
const router = express.Router();
const personal = [autenticar, autorizarRol('ADMINISTRADOR', 'EMPLEADO')];

router.get('/dashboard', personal, dashboard);
// GET /api/reportes?desde=YYYY-MM-DD&hasta=YYYY-MM-DD   y   GET /api/reportes/pdf?desde=&hasta=
router.get('/reportes', personal, reporte);
router.get('/reportes/jornadas', personal, listarJornadas);
router.get('/reportes/pdf', personal, pdf);

export default router;
