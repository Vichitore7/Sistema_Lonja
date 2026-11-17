// Historial personal del comprador autenticado. Nunca se muestran compras de otra cuenta.
import { Compra, Comprador, Lote, Especie, Tipo } from '../models/index.js';
import { paginar, datosPaginacion, entero, leerRango } from '../helpers/utilidades.js';
import { hoyISO } from '../helpers/formatos.js';
import { filtroComprasComprador, totalesComprador, reporteComprador } from '../services/reporteService.js';
import { generarPdfComprador } from '../helpers/reportePdf.js';

// GET /mis-compras?desde=&hasta=  (sin fechas: todas las compras)
const listar = async (req, res) => {
    const rango = leerRango(req.query);
    const filtro = rango.error ? {} : rango;
    const { pagina, limit, offset } = paginar(req.query);
    const [{ rows, count }, totales] = await Promise.all([
        Compra.findAndCountAll({
            where: filtroComprasComprador(req.usuario.codigo_cpr, filtro),
            include: [{ model: Lote, as: 'lote', include: [{ model: Especie, as: 'especies' }] }],
            distinct: true,
            order: [['fecha', 'DESC'], ['id_cmp', 'DESC']],
            limit, offset
        }),
        totalesComprador(req.usuario.codigo_cpr, filtro)
    ]);
    const conRango = Boolean(filtro.desde);
    res.status(rango.error ? 400 : 200).render('mis-compras/index', {
        pagina: 'Mis compras', seccion: 'mis-compras', compras: rows, totales, hoy: hoyISO(),
        rango: { desde: rango.desde, hasta: rango.hasta }, conRango, errorRango: rango.error,
        paginacion: datosPaginacion(count, pagina, conRango ? { desde: rango.desde, hasta: rango.hasta } : {})
    });
};

// GET /mis-compras/pdf?desde=&hasta=  -> reporte PDF de las compras propias
// (sin fechas incluye todo el historial). Solo muestra lo que el comprador ya ve en pantalla.
const pdf = async (req, res) => {
    const rango = leerRango(req.query);
    if (rango.error) return listar(req, res);
    const [datos, comprador] = await Promise.all([
        reporteComprador(req.usuario.codigo_cpr, rango.desde ? rango : {}),
        Comprador.findByPk(req.usuario.codigo_cpr)
    ]);
    const nombre = !rango.desde ? 'mis-compras'
        : rango.desde === rango.hasta ? `mis-compras-${rango.desde}` : `mis-compras-${rango.desde}-al-${rango.hasta}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}.pdf"`);
    generarPdfComprador(datos, res, comprador);
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

export { listar, pdf, detalle };
