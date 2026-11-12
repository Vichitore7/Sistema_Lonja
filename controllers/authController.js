import { UniqueConstraintError } from 'sequelize';
import { db, Usuario, Comprador } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { registrarIntentoFallido, limpiarIntentos } from '../middleware/seguridad.js';
import { generarJWT, verificarJWT, opcionesCookie } from '../helpers/tokens.js';
import { texto } from '../helpers/utilidades.js';

// Pantalla de inicio de cada rol
export const rutaInicio = (rol) => (rol === 'COMPRADOR' ? '/catalogo' : '/dashboard');

// Usuario activo de la sesión actual (o null)
const usuarioDeSesion = async (req) => {
    try {
        if (!req.cookies?._token) return null;
        const { id } = verificarJWT(req.cookies._token);
        const usuario = await Usuario.findByPk(id);
        return usuario?.activo ? usuario : null;
    } catch { return null; }
};

// GET /  -> según la sesión y el rol
const inicio = async (req, res) => {
    const usuario = await usuarioDeSesion(req);
    res.redirect(usuario ? rutaInicio(usuario.rol) : '/login');
};

// GET /login
const formularioLogin = async (req, res) => {
    const usuario = await usuarioDeSesion(req);
    if (usuario) return res.redirect(rutaInicio(usuario.rol));
    res.render('auth/login', { pagina: 'Iniciar sesión', error: null, datos: {} });
};

// POST /login (personal y compradores usan el mismo formulario)
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
    return res.redirect(rutaInicio(usuario.rol));
};

// ---------- Registro público de compradores ----------
const CAMPOS_REGISTRO = ['nombre', 'apellido_paterno', 'apellido_materno', 'direccion', 'correo', 'nombre_usuario'];

const renderRegistro = (res, { datos = {}, errores = null, status = 200 }) =>
    res.status(status).render('auth/registro', { pagina: 'Crear cuenta de comprador', datos, errores });

// GET /registro
const formularioRegistro = async (req, res) => {
    const usuario = await usuarioDeSesion(req);
    if (usuario) return res.redirect(rutaInicio(usuario.rol));
    renderRegistro(res, {});
};

// POST /registro -> crea Comprador + Usuario (rol COMPRADOR) en una sola transacción
const registrar = async (req, res) => {
    const datos = Object.fromEntries(CAMPOS_REGISTRO.map((c) => [c, texto(req.body[c])]));
    let errores = obtenerErrores(req);
    if (!errores && await Usuario.findOne({ where: { nombre_usuario: datos.nombre_usuario } })) {
        errores = { nombre_usuario: 'Ese nombre de usuario ya existe' };
    }
    if (errores) return renderRegistro(res, { datos, errores, status: 400 });

    // Comprador primero y Usuario ligado en la MISMA transacción: si algo falla no queda ninguno.
    // rol y activo se fijan aquí; lo que mande el navegador en esos campos se ignora.
    let usuario;
    try {
        usuario = await crearCompradorConCuenta(datos, req.body.password);
    } catch (error) {
        // Dos registros simultáneos con el mismo usuario: gana uno, el otro ve el aviso
        if (error instanceof UniqueConstraintError) {
            return renderRegistro(res, { datos, errores: { nombre_usuario: 'Ese nombre de usuario ya existe' }, status: 400 });
        }
        throw error;
    }

    res.cookie('_token', generarJWT(usuario.id_usuario), opcionesCookie());
    res.redirect('/catalogo?msg=cuenta-creada');
};

const crearCompradorConCuenta = (datos, password) => db.transaction(async (t) => {
    const comprador = await Comprador.create({
        nombre: datos.nombre,
        apellido_paterno: datos.apellido_paterno,
        apellido_materno: datos.apellido_materno || null,
        direccion: datos.direccion,
        correo: datos.correo
    }, { transaction: t });
    // El rol se fija en el servidor: desde el registro solo se crean compradores
    return Usuario.create({
        nombre_usuario: datos.nombre_usuario,
        password,
        rol: 'COMPRADOR',
        activo: true,
        codigo_cpr: comprador.codigo_cpr
    }, { transaction: t });
});

// POST /logout
const logout = (req, res) => {
    res.clearCookie('_token');
    res.redirect('/login?msg=sesion-cerrada');
};

export { inicio, formularioLogin, login, formularioRegistro, registrar, logout };
