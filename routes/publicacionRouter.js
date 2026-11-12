import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { validarPublicacion } from '../middleware/validar.js';
import { administrar, formularioNueva, publicar, despublicar } from '../controllers/publicacionController.js';

// Gestión de ventas: solo ADMINISTRADOR (el CSRF se verifica de forma global en index.js)
const router = express.Router();
router.use(autenticar, autorizarRol('ADMINISTRADOR'));

router.get('/', (req, res) => res.redirect('/ventas/administrar'));
router.get('/administrar', administrar);
router.get('/nueva', formularioNueva);
// POST /ventas/publicar -> autenticar -> autorizarRol(ADMINISTRADOR) -> CSRF -> validarPrecio -> publicacionService
router.post('/publicar', validarPublicacion, publicar);
router.post('/:id/despublicar', despublicar);

export default router;
