import { Op } from 'sequelize';
import { Usuario, Comprador } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { paginar, entero, texto } from '../helpers/utilidades.js';

// Desde el panel solo se administran cuentas EMPLEADO
const buscarEmpleado = (id) => (entero(id) ? Usuario.findOne({ where: { id_usuario: entero(id), rol: 'EMPLEADO' } }) : null);

const nombreOcupado = (nombre_usuario, excluirId = null) => Usuario.findOne({
    where: { nombre_usuario, ...(excluirId ? { id_usuario: { [Op.ne]: excluirId } } : {}) }
});
const yaExiste = { nombre_usuario: 'Ese nombre de usuario ya existe' };
const invalido = (res, errores) => res.status(400).json({ error: 'Revisa los datos del formulario.', errores });
const noEditable = (res) => res.status(404).json({ error: 'Solo se pueden administrar cuentas de Empleado.', codigo: 'usuario-no-editable' });

// Busca al empleado de :id y ejecuta la acción (o responde 404)
const conEmpleado = (accion) => async (req, res) => {
    const empleado = await buscarEmpleado(req.params.id);
    if (!empleado) return noEditable(res);
    return accion(req, res, empleado);
};

// GET /api/usuarios?nombre_usuario=&estado=&codigo=&pagina=
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

    // Cuentas COMPRADOR, con búsqueda por código de comprador
    const codigo = texto(req.query.codigo).slice(0, 9);
    const whereCompradores = { rol: 'COMPRADOR' };
    if (codigo) whereCompradores.codigo_cpr = entero(codigo) || 0;
    const cuentasCompradores = await Usuario.findAll({
        where: whereCompradores, include: [{ model: Comprador, as: 'comprador' }],
        order: [['codigo_cpr', 'ASC']], limit: codigo ? 1 : 50
    });

    res.json({ usuarios: rows, total: count, pagina, filtros, codigo, cuentasCompradores });
};

// GET /api/usuarios/:id
const detalle = conEmpleado((req, res, empleado) => res.json(empleado));

// POST /api/usuarios  { nombre_usuario, password, confirmar }  (el rol se fuerza a EMPLEADO)
const crearEmpleado = async (req, res) => {
    const nombre_usuario = texto(req.body.nombre_usuario);
    let errores = obtenerErrores(req);
    if (!errores && await nombreOcupado(nombre_usuario)) errores = yaExiste;
    if (errores) return invalido(res, errores);
    const empleado = await Usuario.create({ nombre_usuario, password: req.body.password, rol: 'EMPLEADO', activo: true });
    res.status(201).json({ id_usuario: empleado.id_usuario, nombre_usuario: empleado.nombre_usuario });
};

// PUT /api/usuarios/:id  { nombre_usuario }
const editar = conEmpleado(async (req, res, empleado) => {
    const nombre_usuario = texto(req.body.nombre_usuario);
    let errores = obtenerErrores(req);
    if (!errores && await nombreOcupado(nombre_usuario, empleado.id_usuario)) errores = yaExiste;
    if (errores) return invalido(res, errores);
    await empleado.update({ nombre_usuario });
    res.json(empleado);
});

// PATCH /api/usuarios/:id/estado  (activar / desactivar)
const cambiarEstado = conEmpleado(async (req, res, empleado) => {
    await empleado.update({ activo: !empleado.activo });
    res.json({ activo: empleado.activo });
});

// PUT /api/usuarios/:id/password  { password, confirmar }
const restablecerPassword = conEmpleado(async (req, res, empleado) => {
    const errores = obtenerErrores(req);
    if (errores) return invalido(res, errores);
    empleado.password = req.body.password;
    await empleado.save();
    res.json({ mensaje: 'Contraseña restablecida' });
});

export { listar, detalle, crearEmpleado, editar, cambiarEstado, restablecerPassword };
