import { Op } from 'sequelize';
import { Usuario, Comprador } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { paginar, datosPaginacion, entero, texto } from '../helpers/utilidades.js';

// Desde el panel solo se administran cuentas EMPLEADO
const buscarEmpleado = (id) => (entero(id) ? Usuario.findOne({ where: { id_usuario: entero(id), rol: 'EMPLEADO' } }) : null);

const nombreOcupado = (nombre_usuario, excluirId = null) => Usuario.findOne({
    where: { nombre_usuario, ...(excluirId ? { id_usuario: { [Op.ne]: excluirId } } : {}) }
});

// GET /usuarios
const listar = async (req, res) => {
    const filtros = {
        nombre_usuario: texto(req.query.nombre_usuario).slice(0, 50),
        estado: ['activo', 'inactivo'].includes(req.query.estado) ? req.query.estado : ''
    };
    const where = { rol: 'EMPLEADO' };
    if (filtros.nombre_usuario) where.nombre_usuario = { [Op.like]: `%${filtros.nombre_usuario}%` };
    if (filtros.estado) where.activo = filtros.estado === 'activo';

    const { pagina, limit, offset } = paginar(req.query);
    const { rows, count } = await Usuario.findAndCountAll({ where, order: [['id_usuario', 'ASC']], limit, offset });

    // Sección Compradores: cuentas COMPRADOR, con búsqueda por código de comprador
    const codigo = texto(req.query.codigo).slice(0, 9);
    const whereCompradores = { rol: 'COMPRADOR' };
    if (codigo) whereCompradores.codigo_cpr = entero(codigo) || 0;
    const cuentasCompradores = await Usuario.findAll({
        where: whereCompradores, include: [{ model: Comprador, as: 'comprador' }],
        order: [['codigo_cpr', 'ASC']], limit: codigo ? 1 : 50
    });

    res.render('usuarios/index', {
        pagina: 'Gestión de cuentas', seccion: 'usuarios', usuarios: rows, filtros, codigo, cuentasCompradores,
        paginacion: datosPaginacion(count, pagina, req.query)
    });
};

// GET /usuarios/nuevo
const formularioNuevo = (req, res) =>
    res.render('usuarios/formulario', { pagina: 'Nuevo usuario', seccion: 'usuarios', empleado: null, datos: {}, errores: null, erroresPassword: null });

// POST /usuarios  (el rol se fuerza a EMPLEADO en el servidor)
const crearEmpleado = async (req, res) => {
    const datos = { nombre_usuario: texto(req.body.nombre_usuario) };
    let errores = obtenerErrores(req);
    if (!errores && await nombreOcupado(datos.nombre_usuario)) errores = { nombre_usuario: 'Ese nombre de usuario ya existe' };
    if (errores) {
        return res.status(400).render('usuarios/formulario', { pagina: 'Nuevo usuario', seccion: 'usuarios', empleado: null, datos, errores, erroresPassword: null });
    }
    await Usuario.create({ nombre_usuario: datos.nombre_usuario, password: req.body.password, rol: 'EMPLEADO', activo: true });
    res.redirect('/usuarios?msg=usuario-creado');
};

// GET /usuarios/:id/editar
const formularioEditar = async (req, res) => {
    const empleado = await buscarEmpleado(req.params.id);
    if (!empleado) return res.redirect('/usuarios?error=usuario-no-editable');
    res.render('usuarios/formulario', {
        pagina: 'Editar usuario', seccion: 'usuarios', empleado,
        datos: { nombre_usuario: empleado.nombre_usuario }, errores: null, erroresPassword: null
    });
};

// POST /usuarios/:id/editar
const editar = async (req, res) => {
    const empleado = await buscarEmpleado(req.params.id);
    if (!empleado) return res.redirect('/usuarios?error=usuario-no-editable');
    const datos = { nombre_usuario: texto(req.body.nombre_usuario) };
    let errores = obtenerErrores(req);
    if (!errores && await nombreOcupado(datos.nombre_usuario, empleado.id_usuario)) errores = { nombre_usuario: 'Ese nombre de usuario ya existe' };
    if (errores) {
        return res.status(400).render('usuarios/formulario', { pagina: 'Editar usuario', seccion: 'usuarios', empleado, datos, errores, erroresPassword: null });
    }
    await empleado.update(datos);
    res.redirect('/usuarios?msg=usuario-editado');
};

// POST /usuarios/:id/estado  (activar / desactivar)
const cambiarEstado = async (req, res) => {
    const empleado = await buscarEmpleado(req.params.id);
    if (!empleado) return res.redirect('/usuarios?error=usuario-no-editable');
    await empleado.update({ activo: !empleado.activo });
    res.redirect(`/usuarios?msg=${empleado.activo ? 'usuario-activado' : 'usuario-desactivado'}`);
};

// POST /usuarios/:id/password  (restablecer contraseña)
const restablecerPassword = async (req, res) => {
    const empleado = await buscarEmpleado(req.params.id);
    if (!empleado) return res.redirect('/usuarios?error=usuario-no-editable');
    const erroresPassword = obtenerErrores(req);
    if (erroresPassword) {
        return res.status(400).render('usuarios/formulario', {
            pagina: 'Editar usuario', seccion: 'usuarios', empleado,
            datos: { nombre_usuario: empleado.nombre_usuario }, errores: null, erroresPassword
        });
    }
    empleado.password = req.body.password;
    await empleado.save();
    res.redirect('/usuarios?msg=password-restablecida');
};

export { listar, formularioNuevo, crearEmpleado, formularioEditar, editar, cambiarEstado, restablecerPassword };
