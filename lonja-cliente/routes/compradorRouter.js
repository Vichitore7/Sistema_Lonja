import express from 'express';
import { acceso } from '../middleware/sesion.js';
import {
    listar, formularioNuevo, crear, detalle, formularioEditar, editar,
    crearCuenta, editarCuenta, cambiarEstadoCuenta, restablecerPasswordCuenta
} from '../controllers/compradorController.js';

// Gestión administrativa de compradores y sus cuentas: solo ADMINISTRADOR
const router = express.Router();
router.use(acceso('ADMINISTRADOR'));

router.get('/', listar);
router.get('/nuevo', formularioNuevo);
router.post('/', crear);
router.get('/:codigo', detalle);
router.get('/:codigo/editar', formularioEditar);
router.post('/:codigo/editar', editar);

// Cuentas de los compradores
router.post('/:codigo/cuenta', crearCuenta);
router.post('/:codigo/cuenta/editar', editarCuenta);
router.post('/:codigo/cuenta/estado', cambiarEstadoCuenta);
router.post('/:codigo/cuenta/password', restablecerPasswordCuenta);

export default router;
