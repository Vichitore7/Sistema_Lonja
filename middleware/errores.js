import multer from 'multer';

// 404: ninguna ruta coincidió
export const noEncontrado = (req, res) => {
    res.status(404).render('errores/error', {
        pagina: 'Página no encontrada', codigo: 404, titulo: 'Página no encontrada',
        detalle: 'La dirección que buscas no existe o fue movida.'
    });
};

// 500 y errores de subida. Nunca se muestra el stacktrace al usuario.
// eslint-disable-next-line no-unused-vars
export const manejarErrores = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const detalle = err.code === 'LIMIT_FILE_SIZE'
            ? 'Cada imagen debe pesar como máximo 2 MB.'
            : 'No se pudieron recibir los archivos del formulario.';
        return res.status(400).render('errores/error', { pagina: 'Archivo no válido', codigo: 400, titulo: 'Archivo no válido', detalle });
    }
    console.error(err);
    res.status(500).render('errores/error', {
        pagina: 'Error del servidor', codigo: 500, titulo: 'Ocurrió un error',
        detalle: 'No pudimos completar la operación. Inténtalo de nuevo en unos momentos.'
    });
};
