import crypto from 'node:crypto';
import multer from 'multer';

// ---------- Origen de las solicitudes ----------
// Los formularios solo se aceptan desde este mismo cliente (o los orígenes de CORS_ORIGENES).
const origenesExtra = () => new Set(
    String(process.env.CORS_ORIGENES || '').split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
);

const esMismoOrigen = (req, origen) => {
    try { return new URL(origen).host === req.get('host'); } catch { return false; }
};

// "Origin: null" lo mandan algunos navegadores por privacidad; en ese caso se usa
// Sec-Fetch-Site, que el propio navegador pone y una página no puede falsificar
const origenValido = (req, origen) => !origen || esMismoOrigen(req, origen) || origenesExtra().has(origen)
    || (origen === 'null' && req.get('sec-fetch-site') === 'same-origin');

// Rechaza las solicitudes que cambian datos (POST, etc.) enviadas desde otro sitio
export const rechazarOrigenNoPermitido = (req, res, next) => {
    if (['GET', 'HEAD'].includes(req.method)) return next();
    if (origenValido(req, req.get('origin'))) return next();
    if (req.method === 'OPTIONS') return res.sendStatus(403);
    return res.status(403).render('errores/error', {
        pagina: 'Solicitud rechazada', codigo: 403, titulo: 'Solicitud rechazada',
        detalle: 'La solicitud viene de un sitio no permitido.'
    });
};

// ---------- Protección CSRF (doble envío) ----------
// Se guarda un token aleatorio en la cookie _csrf y cada formulario POST lo envía en el campo oculto _csrf.
export const prepararCsrf = (req, res, next) => {
    let token = req.cookies?._csrf;
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
        token = crypto.randomBytes(32).toString('hex');
        res.cookie('_csrf', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    }
    res.locals.csrfToken = token;
    next();
};

export const verificarCsrf = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const enviado = String(req.body?._csrf || req.get('x-csrf-token') || '');
    const esperado = String(req.cookies?._csrf || '');
    const valido = enviado.length === esperado.length && esperado.length > 0 &&
        crypto.timingSafeEqual(Buffer.from(enviado), Buffer.from(esperado));
    if (valido) return next();
    return res.status(403).render('errores/error', {
        pagina: 'Solicitud rechazada', codigo: 403, titulo: 'Solicitud rechazada',
        detalle: 'El formulario caducó o no es válido. Vuelve a la página e inténtalo de nuevo.'
    });
};

// Verificación para todo el cliente. Los formularios multipart (lotes con imágenes)
// se verifican en su ruta, después de que multer lee el cuerpo.
export const verificarCsrfGlobal = (req, res, next) => {
    if (req.is('multipart/form-data') && req.path.startsWith('/lotes')) return next();
    return verificarCsrf(req, res, next);
};

// ---------- Formulario de lotes (multipart) ----------
// multer lo deja en memoria para reenviarlo a la API (la API valida y guarda las imágenes)
export const leerFormularioLote = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 30, fields: 200 }
}).any();

// Vuelve a armar el multipart para la API: mismos nombres de campo (especies[ref][nombre]...) e imágenes
export const aFormData = (req) => {
    const formulario = new FormData();
    const agregar = (nombre, valor) => {
        if (valor === undefined || valor === null) return;
        if (typeof valor === 'object') {
            for (const [clave, v] of Object.entries(valor)) agregar(nombre ? `${nombre}[${clave}]` : clave, v);
            return;
        }
        formulario.append(nombre, String(valor));
    };
    const { _csrf, ...campos } = req.body || {};
    agregar('', campos);
    for (const archivo of req.files || []) {
        formulario.append(archivo.fieldname, new Blob([archivo.buffer], { type: archivo.mimetype }), archivo.originalname);
    }
    return formulario;
};
