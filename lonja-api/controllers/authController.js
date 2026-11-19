import { UniqueConstraintError } from 'sequelize';
import { db, Usuario, Comprador } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { registrarIntentoFallido, limpiarIntentos } from '../middleware/seguridad.js';
import { generarJWT, generarTokenConfirmacion, verificarTokenConfirmacion } from '../helpers/tokens.js';
import { enviarCorreoConfirmacion } from '../helpers/correos.js';
import { texto } from '../helpers/utilidades.js';

// Datos públicos de una cuenta (nunca el hash de la contraseña)
const datosUsuario = (u) => ({ id_usuario: u.id_usuario, nombre_usuario: u.nombre_usuario, rol: u.rol, codigo_cpr: u.codigo_cpr ?? null });

// POST /api/auth/login  { nombre_usuario, password } -> { token, usuario }
// Personal y compradores usan el mismo login
const login = async (req, res) => {
    if (obtenerErrores(req)) return res.status(400).json({ error: 'Escribe tu usuario y contraseña.' });

    const nombre_usuario = texto(req.body.nombre_usuario);
    const usuario = await Usuario.unscoped().findOne({ where: { nombre_usuario } });
    // Mensaje genérico a propósito: no revela si el usuario existe o está inactivo
    if (!usuario || !usuario.activo || !usuario.verificarPassword(req.body.password)) {
        registrarIntentoFallido(req);
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    limpiarIntentos(req);
    // Cuenta de comprador que todavía no confirma su correo: no recibe token
    if (!usuario.confirmado) {
        return res.status(403).json({
            error: 'Tu cuenta todavía no está confirmada. Abre el enlace que te enviamos por correo.',
            codigo: 'sin-confirmar'
        });
    }
    return res.json({ token: generarJWT(usuario.id_usuario), usuario: datosUsuario(usuario) });
};

// GET /api/auth/me  -> cuenta del token
const perfil = (req, res) => res.json(datosUsuario(req.usuario));

// ---------- Registro público de compradores ----------
const CAMPOS_REGISTRO = ['nombre', 'apellido_paterno', 'apellido_materno', 'direccion', 'correo', 'nombre_usuario'];

// Correo parcialmente oculto: ana.lopez@gmail.com -> an•••••••@gmail.com
const ocultarCorreo = (correo = '') => {
    const [nombre, dominio] = correo.split('@');
    if (!dominio) return '';
    return `${nombre.slice(0, 2)}${'•'.repeat(Math.max(nombre.length - 2, 3))}@${dominio}`;
};

// POST /api/auth/registro -> crea Comprador + Usuario (rol COMPRADOR) en una sola transacción.
// No devuelve token: la cuenta queda sin confirmar hasta que el comprador abra el enlace del correo.
const registrar = async (req, res) => {
    const datos = Object.fromEntries(CAMPOS_REGISTRO.map((c) => [c, texto(req.body[c])]));
    const yaExiste = { nombre_usuario: 'Ese nombre de usuario ya existe' };
    let errores = obtenerErrores(req);
    if (!errores && await Usuario.findOne({ where: { nombre_usuario: datos.nombre_usuario } })) errores = yaExiste;
    if (errores) return res.status(400).json({ error: 'Revisa los datos del formulario.', errores });

    let usuario;
    try {
        usuario = await crearCompradorConCuenta(datos, req.body.password);
    } catch (error) {
        // Dos registros simultáneos con el mismo usuario: gana uno, el otro recibe el aviso
        if (error instanceof UniqueConstraintError) return res.status(400).json({ error: 'Revisa los datos del formulario.', errores: yaExiste });
        throw error;
    }

    const enviado = await enviarConfirmacion(usuario, datos);
    res.status(201).json({ correo: ocultarCorreo(datos.correo), enviado });
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

// POST /api/auth/confirmar/:token  -> marca la cuenta como confirmada (enlace del correo)
const confirmarCuenta = async (req, res) => {
    let id;
    try {
        ({ id } = verificarTokenConfirmacion(req.params.token));
    } catch {
        return res.status(400).json({ error: 'El enlace de confirmación no es válido o ya venció. Inicia sesión para pedir uno nuevo.' });
    }
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return res.status(404).json({ error: 'La cuenta no existe' });
    if (!usuario.confirmado) await usuario.update({ confirmado: true });
    res.json({ confirmado: true });
};

// POST /api/auth/confirmar/reenviar  { nombre_usuario } -> la respuesta es siempre la misma
// (no revela si el usuario existe o si ya estaba confirmado)
const reenviarConfirmacion = async (req, res) => {
    const nombre_usuario = texto(req.body.nombre_usuario).slice(0, 50);
    const usuario = nombre_usuario && await Usuario.findOne({
        where: { nombre_usuario, rol: 'COMPRADOR', confirmado: false },
        include: [{ model: Comprador, as: 'comprador' }]
    });
    if (usuario?.comprador?.correo) await enviarConfirmacion(usuario, usuario.comprador);
    res.json({ mensaje: 'Si la cuenta existe y no está confirmada, se envió un nuevo enlace.' });
};

const crearCompradorConCuenta = (datos, password) => db.transaction(async (t) => {
    const comprador = await Comprador.create({
        nombre: datos.nombre,
        apellido_paterno: datos.apellido_paterno,
        apellido_materno: datos.apellido_materno || null,
        direccion: datos.direccion,
        correo: datos.correo
    }, { transaction: t });
    // El rol se fija en la API: desde el registro solo se crean compradores
    return Usuario.create({
        nombre_usuario: datos.nombre_usuario,
        password,
        rol: 'COMPRADOR',
        activo: true,
        confirmado: false,
        codigo_cpr: comprador.codigo_cpr
    }, { transaction: t });
});

export { login, perfil, registrar, confirmarCuenta, reenviarConfirmacion };
