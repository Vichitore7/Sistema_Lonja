import express from 'express';
import { inicio, formularioLogin, login, formularioRegistro, registrar, confirmarCuenta, reenviarConfirmacion, logout } from '../controllers/authController.js';

const router = express.Router();

router.get('/', inicio);
router.get('/login', formularioLogin);
router.post('/login', login);
router.get('/registro', formularioRegistro);
router.post('/registro', registrar);
// Enlace del correo de confirmación (lo arma la API con URL_CLIENTE)
router.get('/confirmar/:token', confirmarCuenta);
router.post('/confirmar/reenviar', reenviarConfirmacion);
router.post('/logout', logout);

export default router;
