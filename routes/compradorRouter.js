import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { validarComprador } from '../middleware/validar.js';
import { listar, formularioNuevo, crear, detalle, formularioEditar, editar } from '../controllers/compradorController.js';

const router = express.Router();
router.use(autenticar, autorizarRol('ADMINISTRADOR', 'EMPLEADO'));

router.get('/', listar);
router.get('/nuevo', formularioNuevo);
router.post('/', validarComprador, crear);
router.get('/:codigo', detalle);
router.get('/:codigo/editar', formularioEditar);
router.post('/:codigo/editar', validarComprador, editar);

export default router;
