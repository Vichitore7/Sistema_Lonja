import { ErrorApi, seg } from '../helpers/api.js';
import { texto } from '../helpers/utilidades.js';
import { COOKIE_TOKEN, opcionesCookie, rutaInicio, usuarioDeSesion } from '../middleware/sesion.js';

const renderLogin = (res, { error = null, datos = {}, reenviar = false, status = 200 } = {}) =>
    res.status(status).render('auth/login', { pagina: 'Iniciar sesión', error, datos, reenviar });

// GET /  -> según la sesión y el rol
const inicio = async (req, res) => {
    const usuario = await usuarioDeSesion(req);
    res.redirect(usuario ? rutaInicio(usuario.rol) : '/login');
};

// GET /login
const formularioLogin = async (req, res) => {
    const usuario = await usuarioDeSesion(req);
    if (usuario) return res.redirect(rutaInicio(usuario.rol));
    renderLogin(res);
};

// POST /login -> POST /api/auth/login. El token se guarda en la cookie HttpOnly _token.
const login = async (req, res) => {
    const datos = { nombre_usuario: texto(req.body.nombre_usuario) };
    try {
        const respuesta = await req.api('/auth/login', {
            method: 'POST',
            body: { nombre_usuario: datos.nombre_usuario, password: String(req.body.password ?? '') }
        });
        res.cookie(COOKIE_TOKEN, respuesta.token, opcionesCookie());
        return res.redirect(rutaInicio(respuesta.usuario.rol));
    } catch (error) {
        if (!(error instanceof ErrorApi) || (error.status >= 500 && error.status !== 503)) throw error;
        // 400 datos vacíos, 401 credenciales, 403 cuenta sin confirmar, 429 demasiados intentos, 503 API apagada
        return renderLogin(res, { error: error.message, datos, reenviar: error.codigo === 'sin-confirmar', status: error.status });
    }
};

// ---------- Registro público de compradores ----------
const CAMPOS_REGISTRO = ['nombre', 'apellido_paterno', 'apellido_materno', 'direccion', 'correo', 'nombre_usuario'];

const renderRegistro = (res, { datos = {}, errores = null, status = 200 }) =>
    res.status(status).render('auth/registro', { pagina: 'Crear cuenta de comprador', datos, errores });

const renderPendiente = (res, { correo = '', enviado = true, generico = false, status = 200 }) =>
    res.status(status).render('auth/confirmar', { pagina: 'Confirma tu correo', correo, enviado, generico });

// GET /registro
const formularioRegistro = async (req, res) => {
    const usuario = await usuarioDeSesion(req);
    if (usuario) return res.redirect(rutaInicio(usuario.rol));
    renderRegistro(res, {});
};

// POST /registro -> POST /api/auth/registro (crea la cuenta COMPRADOR sin confirmar)
const registrar = async (req, res) => {
    const datos = Object.fromEntries(CAMPOS_REGISTRO.map((c) => [c, texto(req.body[c])]));
    try {
        const respuesta = await req.api('/auth/registro', {
            method: 'POST',
            body: { ...datos, password: String(req.body.password ?? ''), confirmar: String(req.body.confirmar ?? '') }
        });
        return renderPendiente(res, { correo: respuesta.correo, enviado: respuesta.enviado, status: 201 });
    } catch (error) {
        if (error instanceof ErrorApi && error.status === 400 && error.errores) {
            return renderRegistro(res, { datos, errores: error.errores, status: 400 });
        }
        throw error;
    }
};

// GET /confirmar/:token  (enlace del correo) -> POST /api/auth/confirmar/:token
const confirmarCuenta = async (req, res) => {
    try {
        await req.api(`/auth/confirmar/${seg(req.params.token)}`, { method: 'POST' });
        return res.redirect('/login?msg=cuenta-confirmada');
    } catch (error) {
        if (!(error instanceof ErrorApi)) throw error;
        if (error.status === 404) return res.redirect('/login');
        if (error.status === 400) return renderLogin(res, { error: error.message, status: 400 });
        throw error;
    }
};

// POST /confirmar/reenviar -> la respuesta es siempre la misma (no revela si el usuario existe)
const reenviarConfirmacion = async (req, res) => {
    await req.api('/auth/confirmar/reenviar', { method: 'POST', body: { nombre_usuario: texto(req.body.nombre_usuario) } });
    renderPendiente(res, { generico: true });
};

// POST /logout  (el JWT no se guarda en la API: basta con borrar la cookie)
const logout = (req, res) => {
    res.clearCookie(COOKIE_TOKEN);
    res.redirect('/login?msg=sesion-cerrada');
};

export { inicio, formularioLogin, login, formularioRegistro, registrar, confirmarCuenta, reenviarConfirmacion, logout };
