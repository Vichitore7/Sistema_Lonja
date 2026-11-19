import { Op } from 'sequelize';
import { db, Compra, Comprador, Lote, Especie, Tipo } from '../models/index.js';
import { paginar, entero, texto } from '../helpers/utilidades.js';
import { esFechaISO } from '../helpers/formatos.js';
import { noExiste } from '../middleware/errores.js';

// Historial interno (Administrador y Empleado), solo lectura. Las compras las crean los
// compradores desde el catálogo; aquí no existe captura manual ni edición de precios.

// GET /api/compras?id_cmp=&codigo_cpr=&desde=&hasta=&pagina=
const historial = async (req, res) => {
    const filtros = {
        id_cmp: texto(req.query.id_cmp).slice(0, 10),
        codigo_cpr: texto(req.query.codigo_cpr).slice(0, 10),
        desde: esFechaISO(req.query.desde) ? req.query.desde : '',
        hasta: esFechaISO(req.query.hasta) ? req.query.hasta : ''
    };
    const condiciones = [];
    if (filtros.id_cmp) condiciones.push({ id_cmp: entero(filtros.id_cmp) || 0 });
    if (filtros.codigo_cpr) condiciones.push({ codigo_cpr: entero(filtros.codigo_cpr) || 0 });
    if (filtros.desde) condiciones.push(db.where(db.fn('DATE', db.col('compra.fecha')), Op.gte, filtros.desde));
    if (filtros.hasta) condiciones.push(db.where(db.fn('DATE', db.col('compra.fecha')), Op.lte, filtros.hasta));

    const { pagina, limit, offset } = paginar(req.query);
    const { rows, count } = await Compra.findAndCountAll({
        where: { [Op.and]: condiciones },
        include: [{ model: Comprador, as: 'comprador' }, { model: Lote, as: 'lote' }],
        order: [['fecha', 'DESC'], ['id_cmp', 'DESC']],
        limit, offset
    });
    res.json({ compras: rows, total: count, pagina, filtros });
};

// GET /api/compras/:id  (solo lectura)
const detalle = async (req, res) => {
    const id = entero(req.params.id);
    const compra = id && await Compra.findByPk(id, {
        include: [
            { model: Comprador, as: 'comprador' },
            { model: Lote, as: 'lote', include: [{ model: Especie, as: 'especies', include: [{ model: Tipo, as: 'tipo' }] }] }
        ],
        order: [[{ model: Lote, as: 'lote' }, { model: Especie, as: 'especies' }, 'id_epe', 'ASC']]
    });
    if (!compra) return noExiste(res, 'Compra no encontrada');
    res.json(compra);
};

export { historial, detalle };
