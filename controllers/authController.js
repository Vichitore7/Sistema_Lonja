import { UniqueConstraintError } from 'sequelize';
import { db, Usuario, Comprador } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { registrarIntentoFallido, limpiarIntentos } from '../middleware/seguridad.js';
import { generarJWT, verificarJWT, opcionesCookie, generarTokenConfirmacion, verificarTokenConfirmacion } from '../helpers/tokens.js';
import { enviarCorreoConfirmacion } from '../helpers/correos.js';
import { texto } from '../helpers/utilidades.js';

// Pantalla de inicio de cada rol
export const rutaInicio = (rol) => (rol === 'COMPRADOR' ? '/catalogo' : '/dashboard');

// Usuario activo de la sesión actual (o null)
const usuarioDeSesion = async (req) => {
    try {
        if (!req.cookies?._token) return null;
        const { id } = verificarJWT(req.cookies._token);
        const usuario = await Usuario.findByPk(id);
        return usuario?.activo && usuario.confirmado ? usuario : null;
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
    res.render('auth/login', { pagina: 'Iniciar sesión', error: null, datos: {}, reenviar: false });
};

// POST /login (personal y compradores usan el mismo formulario)
const login = async (req, res) => {
    const datos = { nombre_usuario: req.body.nombre_usuario?.trim() || '' };
    const mostrarError = (status, error, reenviar = false) =>
        res.status(status).render('auth/login', { pagina: 'Iniciar sesión', error, datos, reenviar });

    if (obtenerErrores(req)) return mostrarError(400, 'Escribe tu usuario y contraseña.');

    const usuario = await Usuario.unscoped().findOne({ where: { nombre_usuario: datos.nombre_usuario } });
    // Mensaje genérico: no revela si el usuario existe o está inactivo
    if (!usuario || !usuario.activo || !usuario.verificarPassword(req.body.password)) {
        registrarIntentoFallido(req);
        return mostrarError(401, 'Usuario o contraseña incorrectos.');
    }

    limpiarIntentos(req);
    // Cuenta de comprador que todavía no confirma su correo: no entra hasta abrir el enlace
    if (!usuario.confirmado) {
        return mostrarError(403, 'Tu cuenta todavía no está confirmada. Abre el enlace que te enviamos por correo.', true);
    }
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

    // La cuenta queda sin confirmar: no se inicia sesión hasta que el comprador abra el enlace del correo
    const enviado = await enviarConfirmacion(usuario, datos);
    renderPendiente(res, { correo: datos.correo, enviado, status: 201 });
};

// Envía (o reenvía) el correo de confirmación. Devuelve false si el servidor de correo falló.
const enviarConfirmacion = async (usuario, comprador) => {
    try {
        await enviarCorreoConfirmacion({
            correo: comprador.correo,
            nombre: comprador.nombre,
            nombre_usuario: usuario.nombre_usuario,
            token: generarTokenConfirmacion(usuario.id_usuario)
        });
        return true;
    } catch (error) {
        console.error('No se pudo enviar el correo de confirmación:', error.message);
        return false;
    }
};

// Correo parcialmente oculto: ana.lopez@gmail.com -> an•••••••@gmail.com
const ocultarCorreo = (correo = '') => {
    const [nombre, dominio] = correo.split('@');
    if (!dominio) return '';
    return `${nombre.slice(0, 2)}${'•'.repeat(Math.max(nombre.length - 2, 3))}@${dominio}`;
};

const renderPendiente = (res, { correo = '', enviado = true, generico = false, status = 200 }) =>
    res.status(status).render('auth/confirmar', {
        pagina: 'Confirma tu correo', correo: ocultarCorreo(correo), enviado, generico
    });

// GET /confirmar/:token  -> marca la cuenta como confirmada (enlace del correo)
const confirmarCuenta = async (req, res) => {
    let id;
    try {
        ({ id } = verificarTokenConfirmacion(req.params.token));
    } catch {
        return res.status(400).render('auth/login', {
            pagina: 'Iniciar sesión', datos: {}, reenviar: false,
            error: 'El enlace de confirmación no es válido o ya venció. Inicia sesión para pedir uno nuevo.'
        });
    }
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return res.redirect('/login');
    if (!usuario.confirmado) await usuario.update({ confirmado: true });
    res.redirect('/login?msg=cuenta-confirmada');
};

// POST /confirmar/reenviar  -> vuelve a mandar el enlace. La respuesta es siempre la misma
// (no revela si el usuario existe o si ya estaba confirmado).
const reenviarConfirmacion = async (req, res) => {
    const nombre_usuario = texto(req.body.nombre_usuario).slice(0, 50);
    const usuario = nombre_usuario && await Usuario.findOne({
        where: { nombre_usuario, rol: 'COMPRADOR', confirmado: false },
        include: [{ model: Comprador, as: 'comprador' }]
    });
    if (usuario?.comprador?.correo) await enviarConfirmacion(usuario, usuario.comprador);
    renderPendiente(res, { generico: true });
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
        confirmado: false,
        codigo_cpr: comprador.codigo_cpr
    }, { transaction: t });
});

// POST /logout
const logout = (req, res) => {
    res.clearCookie('_token');
    res.redirect('/login?msg=sesion-cerrada');
};

export { inicio, formularioLogin, login, formularioRegistro, registrar, confirmarCuenta, reenviarConfirmacion, logout };
