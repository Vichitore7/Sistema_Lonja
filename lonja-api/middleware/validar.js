import { body, query } from 'express-validator';
import { validationResult } from 'express-validator';
import { ESTADOS_LOTE } from '../models/Lote.js';

// Devuelve los errores como { campo: mensaje } para mostrarlos junto a cada campo
export const obtenerErrores = (req) => {
    const resultado = validationResult(req);
    if (resultado.isEmpty()) return null;
    return resultado.array().reduce((acc, error) => {
        if (!acc[error.path]) acc[error.path] = error.msg;
        return acc;
    }, {});
};

const decimal = (campo, etiqueta, { min = 0, excluirMin = false, max = 99999999 } = {}) =>
    body(campo).trim()
        .notEmpty().withMessage(`${etiqueta} es obligatorio`).bail()
        .matches(/^\d{1,8}(\.\d{1,2})?$/).withMessage(`${etiqueta}: número con máximo 2 decimales`).bail()
        .custom((v) => (excluirMin ? Number(v) > min : Number(v) >= min) && Number(v) <= max)
        .withMessage(excluirMin ? `${etiqueta} debe ser mayor que ${min}` : `${etiqueta} debe ser ${min} o más`);

// ---------- Login ----------
export const validarLogin = [
    body('nombre_usuario').trim().notEmpty().withMessage('Escribe tu usuario').isLength({ max: 50 }),
    body('password').notEmpty().withMessage('Escribe tu contraseña').isLength({ max: 200 })
];

// ---------- Tipo ----------
export const validarTipo = [
    body('nombre').trim().notEmpty().withMessage('El nombre del tipo es obligatorio')
        .isLength({ max: 100 }).withMessage('Máximo 100 caracteres')
];

// ---------- Lote (las especies se validan en el controlador porque vienen en lista) ----------
export const validarLote = [
    decimal('kilos', 'Kilogramos totales', { min: 0, excluirMin: true }),
    body('numero_cajas').trim().notEmpty().withMessage('Número de cajas es obligatorio').bail()
        .isInt({ min: 1, max: 100000 }).withMessage('Número de cajas debe ser un entero mayor que 0'),
    decimal('precio_kilo_salida', 'Precio de salida por kg', { min: 0 }),
    body('fecha').trim().notEmpty().withMessage('La fecha es obligatoria').bail()
        .isISO8601({ strict: true }).withMessage('Fecha inválida')
];

export const validarFiltrosLote = [
    query('estado').optional({ values: 'falsy' }).isIn(ESTADOS_LOTE)
];

// ---------- Comprador ----------
export const validarComprador = [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
    body('apellido_paterno').trim().notEmpty().withMessage('El apellido paterno es obligatorio').isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
    body('apellido_materno').trim().isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
    body('direccion').trim().notEmpty().withMessage('La dirección es obligatoria').isLength({ max: 255 }).withMessage('Máximo 255 caracteres'),
    body('correo').trim().optional({ values: 'falsy' })
        .isEmail().withMessage('Escribe un correo válido').isLength({ max: 150 }).withMessage('Máximo 150 caracteres')
];

// ---------- Publicación de un lote (validarPrecio) ----------
export const validarPublicacion = [
    body('id_lte').trim().notEmpty().withMessage('Selecciona un lote').bail()
        .isInt({ min: 1 }).withMessage('Lote inválido'),
    decimal('precio_kilo_final', 'Precio final por kg', { min: 0, excluirMin: true })
];

// ---------- Usuarios (empleados) ----------
const reglaPassword = (campo = 'password') =>
    body(campo).isLength({ min: 8, max: 72 }).withMessage('La contraseña debe tener entre 8 y 72 caracteres');
const reglaConfirmar = (campo = 'password') =>
    body('confirmar').custom((valor, { req }) => valor === req.body[campo]).withMessage('Las contraseñas no coinciden');
const reglaNombreUsuario = body('nombre_usuario').trim()
    .notEmpty().withMessage('El nombre de usuario es obligatorio').bail()
    .matches(/^[A-Za-z0-9._-]{3,50}$/).withMessage('Usa de 3 a 50 caracteres: letras, números, punto, guion o guion bajo');

// ---------- Registro de comprador (datos personales + cuenta) ----------
export const validarRegistroComprador = [
    ...validarComprador.slice(0, 4),
    // En el registro el correo es obligatorio (sirve para contactar al comprador)
    body('correo').trim().notEmpty().withMessage('El correo es obligatorio').bail()
        .isEmail().withMessage('Escribe un correo válido').isLength({ max: 150 }).withMessage('Máximo 150 caracteres'),
    reglaNombreUsuario, reglaPassword(), reglaConfirmar()
];

// ---------- Cuenta de un comprador (gestión del administrador) ----------
export const validarCuentaComprador = [reglaNombreUsuario, reglaPassword(), reglaConfirmar()];

export const validarAltaEmpleado = [reglaNombreUsuario, reglaPassword(), reglaConfirmar()];
export const validarEdicionEmpleado = [reglaNombreUsuario];
export const validarPassword = [reglaPassword(), reglaConfirmar()];
