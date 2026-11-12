// Validación y guardado de imágenes de especies.
// Multer las deja en memoria; solo se escriben a disco cuando todo el formulario es válido.
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const CARPETA_ESPECIES = path.resolve('public/uploads/especies');
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const PERMITIDAS = {
    'image/jpeg': { ext: '.jpg', firma: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    'image/png': { ext: '.png', firma: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    'image/webp': { ext: '.webp', firma: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' }
};

export const subirImagenes = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES, files: 30, fields: 200 }
}).any();

// Devuelve un mensaje de error o null
export const validarImagen = (archivo) => {
    if (!archivo) return null;
    const tipo = PERMITIDAS[archivo.mimetype];
    const extension = path.extname(archivo.originalname).toLowerCase();
    const extensionesOk = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    if (!tipo || extensionesOk[extension] !== archivo.mimetype || !tipo.firma(archivo.buffer)) {
        return `La imagen "${archivo.originalname}" debe ser JPG, PNG o WEBP válida.`;
    }
    return null;
};

// Guarda con nombre generado y devuelve el nombre (lo que se guarda en especie.imagen)
export const guardarImagen = async (archivo) => {
    const nombre = `${crypto.randomUUID()}${PERMITIDAS[archivo.mimetype].ext}`;
    await fs.writeFile(path.join(CARPETA_ESPECIES, nombre), archivo.buffer);
    return nombre;
};

export const borrarImagen = async (nombre) => {
    if (!nombre || nombre !== path.basename(nombre)) return;
    await fs.unlink(path.join(CARPETA_ESPECIES, nombre)).catch(() => {});
};
