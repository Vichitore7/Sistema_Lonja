import express from 'express';
import { acceso } from '../middleware/sesion.js';
import { administrar, formularioNueva, publicar, despublicar } from '../controllers/publicacionController.js';

// Gestión de ventas: solo ADMINISTRADOR
const router = express.Router();
router.use(acceso('ADMINISTRADOR'));

router.get('/', (req, res) => res.redirect('/ventas/administrar'));
router.get('/administrar', administrar);
router.get('/nueva', formularioNueva);
router.post('/publicar', publicar);
router.post('/:id/despublicar', despublicar);

export default router;
