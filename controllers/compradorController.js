import { Op } from 'sequelize';
import { Comprador, Compra, Lote, Usuario } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { paginar, datosPaginacion, entero, texto } from '../helpers/utilidades.js';

const CAMPOS = ['nombre', 'apellido_paterno', 'apellido_materno', 'direccion', 'correo'];
const leerDatos = (body) => Object.fromEntries(CAMPOS.map((c) => [c, texto(body[c])]));
const aBD = (datos) => ({ ...datos, apellido_materno: datos.apellido_materno || null, correo: datos.correo || null });

const renderFormulario = (res, { comprador = null, datos, errores = null, status = 200 }) =>
    res.status(status).render('compradores/formulario', {
        pagina: comprador ? 'Editar comprador' : 'Nuevo comprador',
        seccion: 'compradores', comprador, datos, errores
    });

// GET /compradores  (búsqueda SOLO por código)
const listar = async (req, res) => {
    const codigoTexto = texto(req.query.codigo);
    const codigo = entero(codigoTexto);
    const { pagina, limit, offset } = paginar(req.query);
    let compradores = [];
    let total = 0;
    if (codigoTexto) {
        const encontrado = codigo && await Comprador.findByPk(codigo, { include: [{ model: Usuario, as: 'cuenta' }] });
        compradores = encontrado ? [encontrado] : [];
        total = compradores.length;
    } else {
        const { rows, count } = await Comprador.findAndCountAll({
            include: [{ model: Usuario, as: 'cuenta' }], order: [['codigo_cpr', 'ASC']], limit, offset
        });
        compradores = rows;
        total = count;
    }
    res.render('compradores/index', {
        pagina: 'Compradores', seccion: 'compradores', compradores, codigo: codigoTexto,
        paginacion: datosPaginacion(total, codigoTexto ? 1 : pagina, req.query)
    });
};

// GET /compradores/nuevo
const formularioNuevo = (req, res) => renderFormulario(res, { datos: {} });

// POST /compradores  (el código se genera automáticamente)
const crear = async (req, res) => {
    const datos = leerDatos(req.body);
    const errores = obtenerErrores(req);
    if (errores) return renderFormulario(res, { datos, errores, status: 400 });
    const comprador = await Comprador.create(aBD(datos));
    res.redirect(`/compradores/${comprador.codigo_cpr}?msg=comprador-creado`);
};

const buscarConCompras = (codigo) => Comprador.findByPk(codigo, {
    include: [{ model: Compra, as: 'compras', include: [{ model: Lote, as: 'lote' }] }, { model: Usuario, as: 'cuenta' }],
    order: [[{ model: Compra, as: 'compras' }, 'fecha', 'DESC']]
});

const renderDetalle = (res, comprador, { datosCuenta = null, erroresCuenta = null, erroresPassword = null, status = 200 } = {}) =>
    res.status(status).render('compradores/detalle', {
        pagina: 'Detalle del comprador', seccion: 'compradores', comprador,
        datosCuenta: datosCuenta || { nombre_usuario: comprador.cuenta?.nombre_usuario || '' },
        erroresCuenta, erroresPassword
    });

// GET /compradores/:codigo
const detalle = async (req, res, next) => {
    const codigo = entero(req.params.codigo);
    const comprador = codigo && await buscarConCompras(codigo);
    if (!comprador) return next();
    renderDetalle(res, comprador);
};

// GET /compradores/:codigo/editar
const formularioEditar = async (req, res, next) => {
    const comprador = entero(req.params.codigo) && await Comprador.findByPk(entero(req.params.codigo));
    if (!comprador) return next();
    const datos = Object.fromEntries(CAMPOS.map((c) => [c, comprador[c] || '']));
    renderFormulario(res, { comprador, datos });
};

// POST /compradores/:codigo/editar  (el código no cambia)
const editar = async (req, res, next) => {
    const comprador = entero(req.params.codigo) && await Comprador.findByPk(entero(req.params.codigo));
    if (!comprador) return next();
    const datos = leerDatos(req.body);
    const errores = obtenerErrores(req);
    if (errores) return renderFormulario(res, { comprador, datos, errores, status: 400 });
    await comprador.update(aBD(datos));
    res.redirect(`/compradores/${comprador.codigo_cpr}?msg=comprador-editado`);
};

// ---------- Cuenta del comprador (solo ADMINISTRADOR) ----------
const nombreOcupado = (nombre_usuario, excluirId = null) => Usuario.findOne({
    where: { nombre_usuario, ...(excluirId ? { id_usuario: { [Op.ne]: excluirId } } : {}) }
});

// POST /compradores/:codigo/cuenta  (crear cuenta a un comprador que todavía no tiene)
const crearCuenta = async (req, res, next) => {
    const comprador = entero(req.params.codigo) && await buscarConCompras(entero(req.params.codigo));
    if (!comprador) return next();
    if (comprador.cuenta) return res.redirect(`/compradores/${comprador.codigo_cpr}?error=comprador-ya-tiene-cuenta`);
    const datosCuenta = { nombre_usuario: texto(req.body.nombre_usuario) };
    let erroresCuenta = obtenerErrores(req);
    if (!erroresCuenta && await nombreOcupado(datosCuenta.nombre_usuario)) erroresCuenta = { nombre_usuario: 'Ese nombre de usuario ya existe' };
    if (erroresCuenta) return renderDetalle(res, comprador, { datosCuenta, erroresCuenta, status: 400 });
    await Usuario.create({ nombre_usuario: datosCuenta.nombre_usuario, password: req.body.password, rol: 'COMPRADOR', activo: true, codigo_cpr: comprador.codigo_cpr });
    res.redirect(`/compradores/${comprador.codigo_cpr}?msg=cuenta-comprador-creada`);
};

// Busca el comprador con su cuenta; si no tiene cuenta regresa al detalle con aviso
const conCuenta = async (req, res, next, accion) => {
    const comprador = entero(req.params.codigo) && await buscarConCompras(entero(req.params.codigo));
    if (!comprador) return next();
    if (!comprador.cuenta || comprador.cuenta.rol !== 'COMPRADOR') return res.redirect(`/compradores/${comprador.codigo_cpr}?error=comprador-sin-cuenta`);
    return accion(comprador, comprador.cuenta);
};

// POST /compradores/:codigo/cuenta/editar  (cambiar nombre de usuario)
const editarCuenta = (req, res, next) => conCuenta(req, res, next, async (comprador, cuenta) => {
    const datosCuenta = { nombre_usuario: texto(req.body.nombre_usuario) };
    let erroresCuenta = obtenerErrores(req);
    if (!erroresCuenta && await nombreOcupado(datosCuenta.nombre_usuario, cuenta.id_usuario)) erroresCuenta = { nombre_usuario: 'Ese nombre de usuario ya existe' };
    if (erroresCuenta) return renderDetalle(res, comprador, { datosCuenta, erroresCuenta, status: 400 });
    await cuenta.update(datosCuenta);
    res.redirect(`/compradores/${comprador.codigo_cpr}?msg=cuenta-comprador-editada`);
});

// POST /compradores/:codigo/cuenta/estado  (activar / desactivar)
const cambiarEstadoCuenta = (req, res, next) => conCuenta(req, res, next, async (comprador, cuenta) => {
    await cuenta.update({ activo: !cuenta.activo });
    const destino = req.body.volver === 'usuarios' ? '/usuarios' : `/compradores/${comprador.codigo_cpr}`;
    res.redirect(`${destino}?msg=${cuenta.activo ? 'cuenta-comprador-activada' : 'cuenta-comprador-desactivada'}`);
});

// POST /compradores/:codigo/cuenta/password  (restablecer contraseña)
const restablecerPasswordCuenta = (req, res, next) => conCuenta(req, res, next, async (comprador, cuenta) => {
    const erroresPassword = obtenerErrores(req);
    if (erroresPassword) return renderDetalle(res, comprador, { erroresPassword, status: 400 });
    cuenta.password = req.body.password;
    await cuenta.save();
    res.redirect(`/compradores/${comprador.codigo_cpr}?msg=password-comprador-restablecida`);
});

export {
    listar, formularioNuevo, crear, detalle, formularioEditar, editar,
    crearCuenta, editarCuenta, cambiarEstadoCuenta, restablecerPasswordCuenta
};
