import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { validarPublicacion } from '../middleware/validar.js';
import { administrar, porPublicar, publicar, despublicar } from '../controllers/publicacionController.js';

// Gestión de ventas: solo ADMINISTRADOR
const router = express.Router();
router.use(autenticar, autorizarRol('ADMINISTRADOR'));

router.get('/', administrar);
router.get('/por-publicar', porPublicar);
// POST /api/ventas/publicar -> requireAuth -> autorizarRol(ADMINISTRADOR) -> validarPrecio -> publicacionService
router.post('/publicar', validarPublicacion, publicar);
router.patch('/:id/despublicar', despublicar);

export default router;
