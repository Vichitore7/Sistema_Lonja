import { Op } from 'sequelize';
import { db, Tipo } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { paginar, datosPaginacion, entero, texto } from '../helpers/utilidades.js';

// Nombre único a nivel de aplicación (sin distinguir mayúsculas)
const nombreRepetido = (nombre, excluirId = null) => Tipo.findOne({
    where: {
        [Op.and]: [
            db.where(db.fn('LOWER', db.col('nombre')), nombre.toLowerCase()),
            ...(excluirId ? [{ id_tpo: { [Op.ne]: excluirId } }] : [])
        ]
    }
});

const renderFormulario = (res, { tipo = null, datos, errores = null, status = 200 }) =>
    res.status(status).render('tipos/formulario', {
        pagina: tipo ? 'Editar tipo' : 'Nuevo tipo', seccion: 'tipos', tipo, datos, errores
    });

// GET /tipos
const listar = async (req, res) => {
    const nombre = texto(req.query.nombre).slice(0, 100);
    const { pagina, limit, offset } = paginar(req.query);
    const { rows, count } = await Tipo.findAndCountAll({
        where: nombre ? { nombre: { [Op.like]: `%${nombre}%` } } : {},
        order: [['id_tpo', 'ASC']], limit, offset
    });
    res.render('tipos/index', {
        pagina: 'Tipos', seccion: 'tipos', tipos: rows, nombre,
        paginacion: datosPaginacion(count, pagina, req.query)
    });
};

// GET /tipos/nuevo
const formularioNuevo = (req, res) => renderFormulario(res, { datos: {} });

// POST /tipos
const crear = async (req, res) => {
    const datos = { nombre: texto(req.body.nombre) };
    const errores = obtenerErrores(req) || ((await nombreRepetido(datos.nombre)) ? { nombre: 'Ya existe un tipo con ese nombre' } : null);
    if (errores) return renderFormulario(res, { datos, errores, status: 400 });
    await Tipo.create(datos);
    res.redirect('/tipos?msg=tipo-creado');
};

// GET /tipos/:id/editar
const formularioEditar = async (req, res, next) => {
    const tipo = entero(req.params.id) && await Tipo.findByPk(entero(req.params.id));
    if (!tipo) return next();
    renderFormulario(res, { tipo, datos: { nombre: tipo.nombre } });
};

// POST /tipos/:id/editar
const editar = async (req, res, next) => {
    const tipo = entero(req.params.id) && await Tipo.findByPk(entero(req.params.id));
    if (!tipo) return next();
    const datos = { nombre: texto(req.body.nombre) };
    const errores = obtenerErrores(req) || ((await nombreRepetido(datos.nombre, tipo.id_tpo)) ? { nombre: 'Ya existe un tipo con ese nombre' } : null);
    if (errores) return renderFormulario(res, { tipo, datos, errores, status: 400 });
    await tipo.update(datos);
    res.redirect('/tipos?msg=tipo-editado');
};

export { listar, formularioNuevo, crear, formularioEditar, editar };
