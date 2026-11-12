import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { validarLote } from '../middleware/validar.js';
import { verificarCsrf } from '../middleware/seguridad.js';
import { subirImagenes } from '../helpers/imagenes.js';
import { listar, formularioNuevo, crear, detalle, formularioEditar, editar, retirar } from '../controllers/loteController.js';

const router = express.Router();
const admin = [autenticar, autorizarRol('ADMINISTRADOR')];
// multer lee el formulario multipart y después se verifica el token CSRF
const formularioLote = [...admin, subirImagenes, verificarCsrf, validarLote];

router.get('/', admin, listar);
router.get('/nuevo', admin, formularioNuevo);
router.post('/', formularioLote, crear);
router.get('/:id', autenticar, autorizarRol('ADMINISTRADOR', 'EMPLEADO'), detalle);
router.get('/:id/editar', admin, formularioEditar);
router.post('/:id/editar', formularioLote, editar);
router.post('/:id/retirar', admin, retirar);

export default router;
