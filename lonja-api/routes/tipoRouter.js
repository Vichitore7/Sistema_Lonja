import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { validarTipo } from '../middleware/validar.js';
import { listar, detalle, crear, editar, eliminar } from '../controllers/tipoController.js';

const router = express.Router();
router.use(autenticar, autorizarRol('ADMINISTRADOR'));

router.get('/', listar);
router.post('/', validarTipo, crear);
router.get('/:id', detalle);
router.put('/:id', validarTipo, editar);
router.delete('/:id', eliminar);

export default router;
