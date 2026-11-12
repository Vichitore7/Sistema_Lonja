import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { validarTipo } from '../middleware/validar.js';
import { listar, formularioNuevo, crear, formularioEditar, editar } from '../controllers/tipoController.js';

const router = express.Router();
router.use(autenticar, autorizarRol('ADMINISTRADOR'));

router.get('/', listar);
router.get('/nuevo', formularioNuevo);
router.post('/', validarTipo, crear);
router.get('/:id/editar', formularioEditar);
router.post('/:id/editar', validarTipo, editar);

export default router;
