// Sesión del cliente: el JWT que entrega la API se guarda en la cookie HttpOnly _token
// y se manda a la API en cada petición (Authorization: Bearer).
import { api } from '../helpers/api.js';

export const COOKIE_TOKEN = '_token';

export const opcionesCookie = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000 // 8 h, igual que JWT_EXPIRA de la API
});

// Pantalla de inicio de cada rol
export const rutaInicio = (rol) => (rol === 'COMPRADOR' ? '/catalogo' : '/dashboard');

// Prepara req.token y req.api(ruta, opciones) para llamar a la API con el token de la cookie
export const prepararApi = (req, res, next) => {
    req.token = req.cookies?.[COOKIE_TOKEN] || null;
    req.api = (ruta, opciones = {}) => api(ruta, { token: req.token, ip: req.ip, ...opciones });
    next();
};

// Cuenta de la sesión actual (o null si no hay token o ya no vale)
export const usuarioDeSesion = async (req) => {
    if (!req.token) return null;
    try { return await req.api('/auth/me'); } catch { return null; }
};

// Guard: sin token -> /login. Con token, la API dice quién es (GET /api/auth/me);
// si el token caducó, se alteró o la cuenta se desactivó, la API responde 401.
const requireAuth = async (req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    if (!req.token) return res.redirect('/login');
    try {
        const usuario = await req.api('/auth/me');
        req.usuario = usuario;
        res.locals.usuario = usuario;
        return next();
    } catch (error) {
        if (error.status === 401) {
            res.clearCookie(COOKIE_TOKEN);
            return res.redirect('/login');
        }
        return next(error);
    }
};

// Solo muestra la pantalla a los roles indicados (la API vuelve a comprobarlo en cada petición)
const soloRoles = (roles) => (req, res, next) => {
    if (roles.includes(req.usuario?.rol)) return next();
    return res.status(403).render('errores/error', {
        pagina: 'Acceso denegado', codigo: 403, titulo: 'Acceso denegado',
        detalle: 'Tu cuenta no tiene permiso para entrar a esta sección.'
    });
};

// Uso: acceso('ADMINISTRADOR'), acceso('ADMINISTRADOR', 'EMPLEADO'), acceso('COMPRADOR')
export const acceso = (...roles) => [requireAuth, soloRoles(roles)];
