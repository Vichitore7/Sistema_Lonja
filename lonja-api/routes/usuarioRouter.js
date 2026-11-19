import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { validarAltaEmpleado, validarEdicionEmpleado, validarPassword } from '../middleware/validar.js';
import { listar, detalle, crearEmpleado, editar, cambiarEstado, restablecerPassword } from '../controllers/usuarioController.js';

// Cuentas de empleado (y consulta de cuentas de comprador): solo ADMINISTRADOR
const router = express.Router();
router.use(autenticar, autorizarRol('ADMINISTRADOR'));

router.get('/', listar);
router.post('/', validarAltaEmpleado, crearEmpleado);
router.get('/:id', detalle);
router.put('/:id', validarEdicionEmpleado, editar);
router.patch('/:id/estado', cambiarEstado);
router.put('/:id/password', validarPassword, restablecerPassword);

export default router;
