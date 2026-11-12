import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { listar, diario, pdf } from '../controllers/reporteController.js';

const router = express.Router();
router.use(autenticar, autorizarRol('ADMINISTRADOR', 'EMPLEADO'));

router.get('/', listar);
router.get('/diario', diario);
router.get('/diario/pdf', pdf);

export default router;
