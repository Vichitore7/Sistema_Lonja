// Historial personal del comprador autenticado. Nunca se muestran compras de otra cuenta.
import { Compra, Comprador, Lote, Especie, Tipo } from '../models/index.js';
import { paginar, datosPaginacion, entero } from '../helpers/utilidades.js';

// GET /mis-compras
const listar = async (req, res) => {
    const { pagina, limit, offset } = paginar(req.query);
    const { rows, count } = await Compra.findAndCountAll({
        where: { codigo_cpr: req.usuario.codigo_cpr },
        include: [{ model: Lote, as: 'lote', include: [{ model: Especie, as: 'especies' }] }],
        distinct: true,
        order: [['fecha', 'DESC'], ['id_cmp', 'DESC']],
        limit, offset
    });
    res.render('mis-compras/index', {
        pagina: 'Mis compras', seccion: 'mis-compras', compras: rows,
        paginacion: datosPaginacion(count, pagina, req.query)
    });
};

// GET /mis-compras/:id
// Control de pertenencia (IDOR): se busca por id_cmp Y por el codigo_cpr de la sesión.
// Una compra ajena responde igual que una inexistente.
const detalle = async (req, res, next) => {
    const id = entero(req.params.id);
    const compra = id && await Compra.findOne({
        where: { id_cmp: id, codigo_cpr: req.usuario.codigo_cpr },
        include: [
            { model: Comprador, as: 'comprador' },
            { model: Lote, as: 'lote', include: [{ model: Especie, as: 'especies', include: [{ model: Tipo, as: 'tipo' }] }] }
        ],
        order: [[{ model: Lote, as: 'lote' }, { model: Especie, as: 'especies' }, 'id_epe', 'ASC']]
    });
    if (!compra) return next();
    res.render('mis-compras/detalle', { pagina: 'Detalle de mi compra', seccion: 'mis-compras', compra });
};

export { listar, detalle };
