import { Op } from 'sequelize';
import { Comprador, Compra, Lote, Usuario } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { noExiste } from '../middleware/errores.js';
import { paginar, entero, texto } from '../helpers/utilidades.js';

const CAMPOS = ['nombre', 'apellido_paterno', 'apellido_materno', 'direccion', 'correo'];
const leerDatos = (body) => Object.fromEntries(CAMPOS.map((c) => [c, texto(body[c])]));
const aBD = (datos) => ({ ...datos, apellido_materno: datos.apellido_materno || null, correo: datos.correo || null });
const invalido = (res, errores) => res.status(400).json({ error: 'Revisa los datos del formulario.', errores });

// GET /api/compradores?codigo=&pagina=  (búsqueda SOLO por código)
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
    res.json({ compradores, total, pagina: codigoTexto ? 1 : pagina, codigo: codigoTexto });
};

// POST /api/compradores  (el código se genera automáticamente)
const crear = async (req, res) => {
    const errores = obtenerErrores(req);
    if (errores) return invalido(res, errores);
    const comprador = await Comprador.create(aBD(leerDatos(req.body)));
    res.status(201).json(comprador);
};

const buscarConCompras = (codigo) => Comprador.findByPk(codigo, {
    include: [{ model: Compra, as: 'compras', include: [{ model: Lote, as: 'lote' }] }, { model: Usuario, as: 'cuenta' }],
    order: [[{ model: Compra, as: 'compras' }, 'fecha', 'DESC']]
});

// GET /api/compradores/:codigo  (con sus compras y su cuenta)
const detalle = async (req, res) => {
    const codigo = entero(req.params.codigo);
    const comprador = codigo && await buscarConCompras(codigo);
    if (!comprador) return noExiste(res, 'Comprador no encontrado');
    res.json(comprador);
};

// PUT /api/compradores/:codigo  (el código no cambia)
const editar = async (req, res) => {
    const comprador = entero(req.params.codigo) && await Comprador.findByPk(entero(req.params.codigo));
    if (!comprador) return noExiste(res, 'Comprador no encontrado');
    const errores = obtenerErrores(req);
    if (errores) return invalido(res, errores);
    await comprador.update(aBD(leerDatos(req.body)));
    res.json(comprador);
};

// ---------- Cuenta del comprador (solo ADMINISTRADOR) ----------
const nombreOcupado = (nombre_usuario, excluirId = null) => Usuario.findOne({
    where: { nombre_usuario, ...(excluirId ? { id_usuario: { [Op.ne]: excluirId } } : {}) }
});
const yaExiste = { nombre_usuario: 'Ese nombre de usuario ya existe' };

// POST /api/compradores/:codigo/cuenta  (crear cuenta a un comprador que todavía no tiene)
const crearCuenta = async (req, res) => {
    const comprador = entero(req.params.codigo) && await Comprador.findByPk(entero(req.params.codigo), { include: [{ model: Usuario, as: 'cuenta' }] });
    if (!comprador) return noExiste(res, 'Comprador no encontrado');
    if (comprador.cuenta) return res.status(409).json({ error: 'Este comprador ya tiene una cuenta.', codigo: 'comprador-ya-tiene-cuenta' });
    const nombre_usuario = texto(req.body.nombre_usuario);
    let errores = obtenerErrores(req);
    if (!errores && await nombreOcupado(nombre_usuario)) errores = yaExiste;
    if (errores) return invalido(res, errores);
    const cuenta = await Usuario.create({ nombre_usuario, password: req.body.password, rol: 'COMPRADOR', activo: true, codigo_cpr: comprador.codigo_cpr });
    res.status(201).json({ id_usuario: cuenta.id_usuario, nombre_usuario: cuenta.nombre_usuario });
};

// Busca el comprador con su cuenta; si no tiene cuenta responde 409
const conCuenta = (accion) => async (req, res) => {
    const comprador = entero(req.params.codigo) && await Comprador.findByPk(entero(req.params.codigo), { include: [{ model: Usuario, as: 'cuenta' }] });
    if (!comprador) return noExiste(res, 'Comprador no encontrado');
    if (!comprador.cuenta || comprador.cuenta.rol !== 'COMPRADOR') {
        return res.status(409).json({ error: 'Este comprador no tiene cuenta.', codigo: 'comprador-sin-cuenta' });
    }
    return accion(req, res, comprador.cuenta);
};

// PUT /api/compradores/:codigo/cuenta  (cambiar nombre de usuario)
const editarCuenta = conCuenta(async (req, res, cuenta) => {
    const nombre_usuario = texto(req.body.nombre_usuario);
    let errores = obtenerErrores(req);
    if (!errores && await nombreOcupado(nombre_usuario, cuenta.id_usuario)) errores = yaExiste;
    if (errores) return invalido(res, errores);
    await cuenta.update({ nombre_usuario });
    res.json({ id_usuario: cuenta.id_usuario, nombre_usuario: cuenta.nombre_usuario });
});

// PATCH /api/compradores/:codigo/cuenta/estado  (activar / desactivar)
const cambiarEstadoCuenta = conCuenta(async (req, res, cuenta) => {
    await cuenta.update({ activo: !cuenta.activo });
    res.json({ activo: cuenta.activo });
});

// PUT /api/compradores/:codigo/cuenta/password  (restablecer contraseña)
const restablecerPasswordCuenta = conCuenta(async (req, res, cuenta) => {
    const errores = obtenerErrores(req);
    if (errores) return invalido(res, errores);
    cuenta.password = req.body.password;
    await cuenta.save();
    res.json({ mensaje: 'Contraseña restablecida' });
});

export { listar, crear, detalle, editar, crearCuenta, editarCuenta, cambiarEstadoCuenta, restablecerPasswordCuenta };
