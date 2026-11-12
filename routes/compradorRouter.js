import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { validarComprador, validarCuentaComprador, validarEdicionEmpleado, validarPassword } from '../middleware/validar.js';
import {
    listar, formularioNuevo, crear, detalle, formularioEditar, editar,
    crearCuenta, editarCuenta, cambiarEstadoCuenta, restablecerPasswordCuenta
} from '../controllers/compradorController.js';

const router = express.Router();
// Gestión administrativa de compradores y sus cuentas: solo ADMINISTRADOR
router.use(autenticar, autorizarRol('ADMINISTRADOR'));

router.get('/', listar);
router.get('/nuevo', formularioNuevo);
router.post('/', validarComprador, crear);
router.get('/:codigo', detalle);
router.get('/:codigo/editar', formularioEditar);
router.post('/:codigo/editar', validarComprador, editar);

// Cuentas de los compradores
router.post('/:codigo/cuenta', validarCuentaComprador, crearCuenta);
router.post('/:codigo/cuenta/editar', validarEdicionEmpleado, editarCuenta);
router.post('/:codigo/cuenta/estado', cambiarEstadoCuenta);
router.post('/:codigo/cuenta/password', validarPassword, restablecerPasswordCuenta);

export default router;
