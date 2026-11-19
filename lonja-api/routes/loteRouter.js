import express from 'express';
import autenticar from '../middleware/autenticar.js';
import autorizarRol from '../middleware/autorizarRol.js';
import { validarLote } from '../middleware/validar.js';
import { subirImagenes } from '../helpers/imagenes.js';
import { listar, crear, detalle, editar, retirar } from '../controllers/loteController.js';

const router = express.Router();
router.use(autenticar);
const admin = autorizarRol('ADMINISTRADOR');
const personal = autorizarRol('ADMINISTRADOR', 'EMPLEADO');
// multer lee el formulario multipart (datos, especies e imágenes) antes de validar
const formularioLote = [admin, subirImagenes, validarLote];

router.get('/', personal, listar);
router.post('/', formularioLote, crear);
router.get('/:id', personal, detalle);
router.put('/:id', formularioLote, editar);
router.patch('/:id/retirar', admin, retirar);

export default router;
