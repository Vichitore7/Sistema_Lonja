import crypto from 'node:crypto';

// ---------- Protección CSRF (doble envío) ----------
// Se guarda un token aleatorio en la cookie _csrf y cada formulario POST lo envía en el campo oculto _csrf.
// Otro sitio no puede leer la cookie, así que no puede falsificar el formulario.
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

// Verificación para toda la aplicación. Los formularios multipart (lotes con imágenes)
// se verifican en su ruta, después de que multer lee el cuerpo.
export const verificarCsrfGlobal = (req, res, next) => {
    if (req.is('multipart/form-data') && req.path.startsWith('/lotes')) return next();
    return verificarCsrf(req, res, next);
};

// ---------- Límite de intentos de login (en memoria) ----------
const intentos = new Map();
const VENTANA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 5;

const clave = (req) => `${req.ip}|${String(req.body?.nombre_usuario || '').toLowerCase()}`;

export const limitarLogin = (req, res, next) => {
    const registro = intentos.get(clave(req));
    if (registro && registro.cuenta >= MAX_INTENTOS && Date.now() - registro.inicio < VENTANA_MS) {
        return res.status(429).render('auth/login', {
            pagina: 'Iniciar sesión',
            error: 'Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.',
            datos: { nombre_usuario: req.body?.nombre_usuario || '' }
        });
    }
    next();
};

export const registrarIntentoFallido = (req) => {
    const k = clave(req);
    const registro = intentos.get(k);
    if (!registro || Date.now() - registro.inicio >= VENTANA_MS) intentos.set(k, { cuenta: 1, inicio: Date.now() });
    else registro.cuenta += 1;
};

export const limpiarIntentos = (req) => intentos.delete(clave(req));
