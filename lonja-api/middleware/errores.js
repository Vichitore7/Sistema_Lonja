import multer from 'multer';

// 404: ninguna ruta coincidió
export const noEncontrado = (req, res) => res.status(404).json({ error: 'Ruta no encontrada' });

// Respuesta 404 de un recurso que no existe
export const noExiste = (res, error = 'No encontrado', codigo) => res.status(404).json({ error, ...(codigo ? { codigo } : {}) });

// 500 y errores de subida. Nunca se manda el stacktrace.
// eslint-disable-next-line no-unused-vars
export const manejarErrores = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const error = err.code === 'LIMIT_FILE_SIZE'
            ? 'Cada imagen debe pesar como máximo 2 MB.'
            : 'No se pudieron recibir los archivos del formulario.';
        return res.status(400).json({ error });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
};
