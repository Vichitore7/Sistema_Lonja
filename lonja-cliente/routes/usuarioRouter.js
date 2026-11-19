import express from 'express';
import { acceso } from '../middleware/sesion.js';
import { listar, formularioNuevo, crearEmpleado, formularioEditar, editar, cambiarEstado, restablecerPassword } from '../controllers/usuarioController.js';

const router = express.Router();
router.use(acceso('ADMINISTRADOR'));

router.get('/', listar);
router.get('/nuevo', formularioNuevo);
router.post('/', crearEmpleado);
router.get('/:id/editar', formularioEditar);
router.post('/:id/editar', editar);
router.post('/:id/estado', cambiarEstado);
router.post('/:id/password', restablecerPassword);

export default router;
