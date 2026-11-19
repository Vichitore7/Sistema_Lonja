// Historial personal del comprador del token. Nunca se devuelven compras de otra cuenta.
import { Compra, Comprador, Lote, Especie, Tipo } from '../models/index.js';
import { paginar, entero, leerRango } from '../helpers/utilidades.js';
import { filtroComprasComprador, totalesComprador, reporteComprador } from '../services/reporteService.js';
import { generarPdfComprador } from '../helpers/reportePdf.js';
import { noExiste } from '../middleware/errores.js';

// Datos del lote que puede ver el comprador
const CAMPOS_LOTE = ['id_lte', 'kilos', 'numero_cajas', 'fecha', 'estado'];

// GET /api/mis-compras?desde=&hasta=&pagina=  (sin fechas: todas las compras)
// Con un rango inválido responde 400 junto con el historial completo (para seguir mostrándolo)
const listar = async (req, res) => {
    const rango = leerRango(req.query);
    const filtro = rango.error ? {} : rango;
    const { pagina, limit, offset } = paginar(req.query);
    const [{ rows, count }, totales] = await Promise.all([
        Compra.findAndCountAll({
            where: filtroComprasComprador(req.usuario.codigo_cpr, filtro),
            // El comprador nunca recibe precios por kilo (ni de salida ni final): solo el total
            attributes: { exclude: ['precio_kilo_final'] },
            include: [{ model: Lote, as: 'lote', attributes: CAMPOS_LOTE, include: [{ model: Especie, as: 'especies' }] }],
            distinct: true,
            order: [['fecha', 'DESC'], ['id_cmp', 'DESC']],
            limit, offset
        }),
        totalesComprador(req.usuario.codigo_cpr, filtro)
    ]);
    res.status(rango.error ? 400 : 200).json({
        compras: rows, total: count, pagina, totales,
        rango: { desde: rango.desde, hasta: rango.hasta }, conRango: Boolean(filtro.desde),
        ...(rango.error ? { error: rango.error } : {})
    });
};

// GET /api/mis-compras/pdf?desde=&hasta=  -> PDF de las compras propias (sin fechas: todo el historial)
const pdf = async (req, res) => {
    const rango = leerRango(req.query);
    if (rango.error) return res.status(400).json({ error: rango.error });
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

// GET /api/mis-compras/:id
// Control de pertenencia (IDOR): se busca por id_cmp Y por el codigo_cpr del token.
// Una compra ajena responde igual que una inexistente.
const detalle = async (req, res) => {
    const id = entero(req.params.id);
    const compra = id && await Compra.findOne({
        where: { id_cmp: id, codigo_cpr: req.usuario.codigo_cpr },
        attributes: { exclude: ['precio_kilo_final'] },
        include: [
            { model: Comprador, as: 'comprador' },
            { model: Lote, as: 'lote', attributes: CAMPOS_LOTE, include: [{ model: Especie, as: 'especies', include: [{ model: Tipo, as: 'tipo' }] }] }
        ],
        order: [[{ model: Lote, as: 'lote' }, { model: Especie, as: 'especies' }, 'id_epe', 'ASC']]
    });
    if (!compra) return noExiste(res, 'Compra no encontrada');
    res.json(compra);
};

export { listar, pdf, detalle };
