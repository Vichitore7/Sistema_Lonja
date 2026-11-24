import express from 'express';
import { acceso } from '../middleware/sesion.js';
import { listar, formularioNuevo, crear, formularioEditar, editar, eliminar } from '../controllers/tipoController.js';

const router = express.Router();
router.use(acceso('ADMINISTRADOR'));

router.get('/', listar);
router.get('/nuevo', formularioNuevo);
router.post('/', crear);
router.get('/:id/editar', formularioEditar);
router.post('/:id/editar', editar);
router.post('/:id/eliminar', eliminar);

export default router;
