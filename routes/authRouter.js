import express from 'express';
import { inicio, formularioLogin, login, formularioRegistro, registrar, confirmarCuenta, reenviarConfirmacion, logout } from '../controllers/authController.js';
import { validarLogin, validarRegistroComprador } from '../middleware/validar.js';
import { limitarLogin, limitarRegistro, limitarReenvio } from '../middleware/seguridad.js';

const router = express.Router();

router.get('/', inicio);
router.get('/login', formularioLogin);
router.post('/login', limitarLogin, validarLogin, login);
router.get('/registro', formularioRegistro);
router.post('/registro', limitarRegistro, validarRegistroComprador, registrar);
router.get('/confirmar/:token', confirmarCuenta);
router.post('/confirmar/reenviar', limitarReenvio, reenviarConfirmacion);
router.post('/logout', logout);

export default router;
