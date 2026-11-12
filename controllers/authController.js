import { Usuario } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { registrarIntentoFallido, limpiarIntentos } from '../middleware/seguridad.js';
import { generarJWT, verificarJWT, opcionesCookie } from '../helpers/tokens.js';

const tieneSesion = (req) => {
    try { return Boolean(req.cookies?._token && verificarJWT(req.cookies._token)); } catch { return false; }
};

// GET /  -> según la sesión
const inicio = (req, res) => res.redirect(tieneSesion(req) ? '/dashboard' : '/login');

// GET /login
const formularioLogin = (req, res) => {
    if (tieneSesion(req)) return res.redirect('/dashboard');
    res.render('auth/login', { pagina: 'Iniciar sesión', error: null, datos: {} });
};

// POST /login
const login = async (req, res) => {
    const datos = { nombre_usuario: req.body.nombre_usuario?.trim() || '' };
    const mostrarError = (status, error) => res.status(status).render('auth/login', { pagina: 'Iniciar sesión', error, datos });

    if (obtenerErrores(req)) return mostrarError(400, 'Escribe tu usuario y contraseña.');

    const usuario = await Usuario.unscoped().findOne({ where: { nombre_usuario: datos.nombre_usuario } });
    // Mensaje genérico: no revela si el usuario existe o está inactivo
    if (!usuario || !usuario.activo || !usuario.verificarPassword(req.body.password)) {
        registrarIntentoFallido(req);
        return mostrarError(401, 'Usuario o contraseña incorrectos.');
    }

    limpiarIntentos(req);
    res.cookie('_token', generarJWT(usuario.id_usuario), opcionesCookie());
    return res.redirect('/dashboard');
};

// POST /logout
const logout = (req, res) => {
    res.clearCookie('_token');
    res.redirect('/login?msg=sesion-cerrada');
};

export { inicio, formularioLogin, login, logout };
