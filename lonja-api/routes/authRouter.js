import express from 'express';
import autenticar from '../middleware/autenticar.js';
import { login, perfil, registrar, confirmarCuenta, reenviarConfirmacion } from '../controllers/authController.js';
import { validarLogin, validarRegistroComprador } from '../middleware/validar.js';
import { limitarLogin, limitarRegistro, limitarReenvio } from '../middleware/seguridad.js';

const router = express.Router();

// POST /api/auth/login -> { token, usuario }
router.post('/login', limitarLogin, validarLogin, login);
// POST /api/auth/registro -> cuenta COMPRADOR sin confirmar (se envía el correo)
router.post('/registro', limitarRegistro, validarRegistroComprador, registrar);
router.post('/confirmar/reenviar', limitarReenvio, reenviarConfirmacion);
router.post('/confirmar/:token', confirmarCuenta);
// GET /api/auth/me -> datos de la cuenta del token
router.get('/me', autenticar, perfil);

export default router;
