import express from 'express';
import { inicio, formularioLogin, login, logout } from '../controllers/authController.js';
import { validarLogin } from '../middleware/validar.js';
import { limitarLogin } from '../middleware/seguridad.js';

const router = express.Router();

router.get('/', inicio);
router.get('/login', formularioLogin);
router.post('/login', limitarLogin, validarLogin, login);
router.post('/logout', logout);

export default router;
