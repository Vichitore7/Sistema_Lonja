import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { validarComprador, validarCuentaComprador, validarEdicionEmpleado, validarPassword } from '../middleware/validar.js';
import {
    listar, crear, detalle, editar,
    crearCuenta, editarCuenta, cambiarEstadoCuenta, restablecerPasswordCuenta
} from '../controllers/compradorController.js';

const router = express.Router();
// Gestión administrativa de compradores y sus cuentas: solo ADMINISTRADOR
router.use(autenticar, autorizarRol('ADMINISTRADOR'));

router.get('/', listar);
router.post('/', validarComprador, crear);
router.get('/:codigo', detalle);
router.put('/:codigo', validarComprador, editar);

// Cuentas de los compradores
router.post('/:codigo/cuenta', validarCuentaComprador, crearCuenta);
router.put('/:codigo/cuenta', validarEdicionEmpleado, editarCuenta);
router.patch('/:codigo/cuenta/estado', cambiarEstadoCuenta);
router.put('/:codigo/cuenta/password', validarPassword, restablecerPasswordCuenta);

export default router;
