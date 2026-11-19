import express from 'express';
import { acceso } from '../middleware/sesion.js';
import { listar, formularioNuevo, crear, formularioEditar, editar } from '../controllers/tipoController.js';

const router = express.Router();
router.use(acceso('ADMINISTRADOR'));

router.get('/', listar);
router.get('/nuevo', formularioNuevo);
router.post('/', crear);
router.get('/:id/editar', formularioEditar);
router.post('/:id/editar', editar);

export default router;
