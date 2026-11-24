import { Op } from 'sequelize';
import { db, Tipo, Especie } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { noExiste } from '../middleware/errores.js';
import { paginar, entero, texto } from '../helpers/utilidades.js';

// Nombre único a nivel de aplicación (sin distinguir mayúsculas)
const nombreRepetido = (nombre, excluirId = null) => Tipo.findOne({
    where: {
        [Op.and]: [
            db.where(db.fn('LOWER', db.col('nombre')), nombre.toLowerCase()),
            ...(excluirId ? [{ id_tpo: { [Op.ne]: excluirId } }] : [])
        ]
    }
});

const revisar = async (req, excluirId = null) => {
    const nombre = texto(req.body.nombre);
    return obtenerErrores(req) || ((await nombreRepetido(nombre, excluirId)) ? { nombre: 'Ya existe un tipo con ese nombre' } : null);
};
const invalido = (res, errores) => res.status(400).json({ error: 'Revisa los datos del formulario.', errores });

// GET /api/tipos?nombre=&pagina=   ó   GET /api/tipos?todos=1 (todos, por nombre, para los selects)
const listar = async (req, res) => {
    if (req.query.todos) return res.json({ tipos: await Tipo.findAll({ order: [['nombre', 'ASC']] }) });
    const nombre = texto(req.query.nombre).slice(0, 100);
    const { pagina, limit, offset } = paginar(req.query);
    const { rows, count } = await Tipo.findAndCountAll({
        where: nombre ? { nombre: { [Op.like]: `%${nombre}%` } } : {},
        order: [['id_tpo', 'ASC']], limit, offset
    });
    res.json({ tipos: rows, total: count, pagina, nombre });
};

// GET /api/tipos/:id
const detalle = async (req, res) => {
    const tipo = entero(req.params.id) && await Tipo.findByPk(entero(req.params.id));
    if (!tipo) return noExiste(res, 'Tipo no encontrado');
    res.json(tipo);
};

// POST /api/tipos  { nombre }
const crear = async (req, res) => {
    const errores = await revisar(req);
    if (errores) return invalido(res, errores);
    res.status(201).json(await Tipo.create({ nombre: texto(req.body.nombre) }));
};

// PUT /api/tipos/:id  { nombre }
const editar = async (req, res) => {
    const tipo = entero(req.params.id) && await Tipo.findByPk(entero(req.params.id));
    if (!tipo) return noExiste(res, 'Tipo no encontrado');
    const errores = await revisar(req, tipo.id_tpo);
    if (errores) return invalido(res, errores);
    await tipo.update({ nombre: texto(req.body.nombre) });
    res.json(tipo);
};

// DELETE /api/tipos/:id  (no se borra si alguna especie lo usa)
const eliminar = async (req, res) => {
    const tipo = entero(req.params.id) && await Tipo.findByPk(entero(req.params.id));
    if (!tipo) return noExiste(res, 'Tipo no encontrado');
    const enUso = await Especie.count({ where: { id_tpo: tipo.id_tpo } });
    if (enUso) {
        return res.status(409).json({ error: `No se puede eliminar: ${enUso} especie(s) usan el tipo "${tipo.nombre}".` });
    }
    await tipo.destroy();
    res.json({ mensaje: `Tipo "${tipo.nombre}" eliminado`, id_tpo: tipo.id_tpo });
};

export { listar, detalle, crear, editar, eliminar };
