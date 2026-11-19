import express from 'express';
import { acceso } from '../middleware/sesion.js';
import { verificarCsrf, leerFormularioLote } from '../middleware/seguridad.js';
import { listar, formularioNuevo, crear, detalle, formularioEditar, editar, retirar } from '../controllers/loteController.js';

const router = express.Router();
const admin = acceso('ADMINISTRADOR');
// multer lee el formulario multipart, se verifica el token CSRF y se reenvía a la API
const formularioLote = [...admin, leerFormularioLote, verificarCsrf];

router.get('/', admin, listar);
router.get('/nuevo', admin, formularioNuevo);
router.post('/', formularioLote, crear);
router.get('/:id', acceso('ADMINISTRADOR', 'EMPLEADO'), detalle);
router.get('/:id/editar', admin, formularioEditar);
router.post('/:id/editar', formularioLote, editar);
router.post('/:id/retirar', admin, retirar);

export default router;
