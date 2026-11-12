import { Op } from 'sequelize';
import { db, Compra, Comprador, Lote, Especie, Tipo } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { crearVentaEnTransaccion, ErrorVenta } from '../services/ventaService.js';
import { lotesDisponibles } from '../services/loteService.js';
import { paginar, datosPaginacion, entero, texto } from '../helpers/utilidades.js';
import { esFechaISO, nombreCompleto } from '../helpers/formatos.js';

// Datos de los lotes disponibles que usa el formulario (se envían como JSON seguro)
const lotesParaFormulario = (lotes) => lotes.map((l) => ({
    id_lte: l.id_lte,
    kilos: Number(l.kilos),
    numero_cajas: l.numero_cajas,
    precio_kilo_salida: Number(l.precio_kilo_salida),
    especies: l.especies.map((e) => ({ nombre: e.nombre, tipo: e.tipo?.nombre || '' }))
}));

const renderFormulario = async (res, { datos, errores = null, status = 200 }) => {
    const lotes = await lotesDisponibles();
    const codigo = entero(datos.codigo_cpr);
    const comprador = codigo ? await Comprador.findByPk(codigo) : null;
    res.status(status).render('compras/nueva', {
        pagina: 'Registrar compra', seccion: 'compras',
        datos, errores, lotes,
        comprador: comprador ? { codigo_cpr: comprador.codigo_cpr, nombre: nombreCompleto(comprador) } : null,
        // "<" se escapa para que el JSON no pueda cerrar la etiqueta <script>
        lotesJSON: JSON.stringify(lotesParaFormulario(lotes)).replace(/</g, '\\u003c')
    });
};

// GET /compras/nueva
const formularioNueva = (req, res) => renderFormulario(res, {
    datos: { codigo_cpr: texto(req.query.codigo_cpr), id_lte: texto(req.query.id_lte), precio_kilo_final: '' }
});

// POST /compras
const registrar = async (req, res) => {
    const datos = {
        codigo_cpr: texto(req.body.codigo_cpr),
        id_lte: texto(req.body.id_lte),
        precio_kilo_final: texto(req.body.precio_kilo_final)
    };
    const errores = obtenerErrores(req);
    if (errores) return renderFormulario(res, { datos, errores, status: 400 });

    try {
        const compra = await crearVentaEnTransaccion({
            codigo_cpr: Number(datos.codigo_cpr),
            id_lte: Number(datos.id_lte),
            precio_kilo_final: datos.precio_kilo_final
        });
        return res.redirect(`/compras/${compra.id_cmp}?msg=compra-registrada`);
    } catch (error) {
        if (error instanceof ErrorVenta) {
            return renderFormulario(res, { datos, errores: { [error.campo]: error.message }, status: 409 });
        }
        throw error;
    }
};

// GET /compras/historial
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
    res.render('compras/historial', {
        pagina: 'Historial de compras', seccion: 'compras', compras: rows, filtros,
        paginacion: datosPaginacion(count, pagina, req.query)
    });
};

// GET /compras/:id  (solo lectura, sin eliminar)
const detalle = async (req, res, next) => {
    const id = entero(req.params.id);
    const compra = id && await Compra.findByPk(id, {
        include: [
            { model: Comprador, as: 'comprador' },
            { model: Lote, as: 'lote', include: [{ model: Especie, as: 'especies', include: [{ model: Tipo, as: 'tipo' }] }] }
        ],
        order: [[{ model: Lote, as: 'lote' }, { model: Especie, as: 'especies' }, 'id_epe', 'ASC']]
    });
    if (!compra) return next();
    res.render('compras/detalle', { pagina: 'Detalle de compra', seccion: 'compras', compra });
};

export { formularioNueva, registrar, historial, detalle };
