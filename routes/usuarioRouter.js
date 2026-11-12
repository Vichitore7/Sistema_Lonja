import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { validarAltaEmpleado, validarEdicionEmpleado, validarPassword } from '../middleware/validar.js';
import { listar, formularioNuevo, crearEmpleado, formularioEditar, editar, cambiarEstado, restablecerPassword } from '../controllers/usuarioController.js';

const router = express.Router();
router.use(autenticar, autorizarRol('ADMINISTRADOR'));

router.get('/', listar);
router.get('/nuevo', formularioNuevo);
router.post('/', validarAltaEmpleado, crearEmpleado);
router.get('/:id/editar', formularioEditar);
router.post('/:id/editar', validarEdicionEmpleado, editar);
router.post('/:id/estado', cambiarEstado);
router.post('/:id/password', validarPassword, restablecerPassword);

export default router;
