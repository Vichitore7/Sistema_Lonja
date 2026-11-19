import multer from 'multer';
import { ErrorApi } from '../helpers/api.js';
import { COOKIE_TOKEN } from './sesion.js';

const pantalla = (res, codigo, pagina, titulo, detalle) =>
    res.status(codigo).render('errores/error', { pagina, codigo, titulo, detalle });

// 404: ninguna ruta coincidió
export const noEncontrado = (req, res) =>
    pantalla(res, 404, 'Página no encontrada', 'Página no encontrada', 'La dirección que buscas no existe o fue movida.');

// Errores de la API y del cliente. Nunca se muestra el stacktrace al usuario.
// eslint-disable-next-line no-unused-vars
export const manejarErrores = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const detalle = err.code === 'LIMIT_FILE_SIZE'
            ? 'Cada imagen debe pesar como máximo 2 MB.'
            : 'No se pudieron recibir los archivos del formulario.';
        return pantalla(res, 400, 'Archivo no válido', 'Archivo no válido', detalle);
    }
    if (err instanceof ErrorApi) {
        switch (err.status) {
            case 401: // el token caducó o la API se reinició
                res.clearCookie(COOKIE_TOKEN);
                return res.redirect('/login');
            case 403:
                return pantalla(res, 403, 'Acceso denegado', 'Acceso denegado', 'Tu cuenta no tiene permiso para entrar a esta sección.');
            case 404:
                return noEncontrado(req, res);
            case 429:
                return pantalla(res, 429, 'Demasiadas solicitudes', 'Demasiadas solicitudes', err.message);
            case 503:
                return pantalla(res, 503, 'API no disponible', 'No hay conexión con la API', err.message);
            default:
                if (err.status >= 400 && err.status < 500) return pantalla(res, err.status, 'Solicitud no válida', 'No se pudo completar', err.message);
        }
    }
    console.error(err);
    return pantalla(res, 500, 'Error del servidor', 'Ocurrió un error', 'No pudimos completar la operación. Inténtalo de nuevo en unos momentos.');
};
