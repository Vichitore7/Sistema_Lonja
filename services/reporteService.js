// Cálculos de reportes. Todo se deriva de Compra y Lote (no hay totales duplicados).
// Se usa la fecha de la COMPRA (hora de México), no la fecha del lote.
import { Op, QueryTypes } from 'sequelize';
import { db, Compra, Lote, Comprador } from '../models/index.js';
import { hoyISO } from '../helpers/formatos.js';

// Rango [desde 00:00, día siguiente a hasta 00:00) en hora de la lonja (UTC-6):
// el límite superior exclusivo incluye todas las horas de la fecha final.
const DIA_MS = 24 * 60 * 60 * 1000;
export const limitesRango = (desde, hasta) => {
    const inicio = new Date(`${desde}T00:00:00-06:00`);
    const fin = new Date(new Date(`${hasta}T00:00:00-06:00`).getTime() + DIA_MS);
    return { inicio, fin };
};

// Totales de un periodo: compras, lotes vendidos (1:1 con compras), kilos e ingresos.
// Solo cuentan Compras reales: un lote publicado sin comprar no aparece.
export const totalesPeriodo = async (desde, hasta) => {
    const [fila] = await db.query(`
        SELECT COUNT(c.id_cmp) AS compras,
               COUNT(DISTINCT c.id_lte) AS lotes,
               COALESCE(SUM(l.kilos), 0) AS kilos,
               COALESCE(SUM(c.precio_total), 0) AS importe
        FROM compra c
        INNER JOIN lote l ON l.id_lte = c.id_lte
        WHERE c.fecha >= :inicio AND c.fecha < :fin`,
    { replacements: limitesRango(desde, hasta), type: QueryTypes.SELECT });
    return {
        compras: Number(fila.compras),
        lotes: Number(fila.lotes),
        kilos: Number(fila.kilos),
        importe: Number(fila.importe)
    };
};

export const totalesDelDia = (fecha) => totalesPeriodo(fecha, fecha);

export const comprasPeriodo = (desde, hasta) => {
    const { inicio, fin } = limitesRango(desde, hasta);
    return Compra.findAll({
        where: { fecha: { [Op.gte]: inicio, [Op.lt]: fin } },
        include: [
            { model: Lote, as: 'lote' },
            { model: Comprador, as: 'comprador' }
        ],
        order: [['fecha', 'ASC'], ['id_cmp', 'ASC']]
    });
};

// Reporte de un rango de fechas (desde = hasta para el reporte de un solo día)
export const reportePeriodo = async (desde, hasta) => {
    const [totales, compras] = await Promise.all([totalesPeriodo(desde, hasta), comprasPeriodo(desde, hasta)]);
    return { desde, hasta, totales, compras };
};

// Jornadas con ventas (una fila por día), con filtro opcional de rango
export const jornadas = async ({ desde, hasta, limit, offset }) => {
    const filtros = [];
    if (desde) filtros.push('DATE(c.fecha) >= :desde');
    if (hasta) filtros.push('DATE(c.fecha) <= :hasta');
    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
    const replacements = { desde, hasta, limit, offset };

    const filas = await db.query(`
        SELECT DATE_FORMAT(DATE(c.fecha), '%Y-%m-%d') AS fecha,
               COUNT(c.id_cmp) AS compras,
               SUM(l.kilos) AS kilos,
               SUM(c.precio_total) AS importe
        FROM compra c
        INNER JOIN lote l ON l.id_lte = c.id_lte
        ${where}
        GROUP BY DATE(c.fecha)
        ORDER BY DATE(c.fecha) DESC
        LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT });

    const [conteo] = await db.query(`
        SELECT COUNT(DISTINCT DATE(c.fecha)) AS total FROM compra c ${where}`,
    { replacements, type: QueryTypes.SELECT });

    return {
        filas: filas.map((f) => ({ ...f, compras: Number(f.compras), kilos: Number(f.kilos), importe: Number(f.importe) })),
        total: Number(conteo.total)
    };
};

// Indicadores del dashboard
export const indicadoresDashboard = async () => {
    const hoy = hoyISO();
    const [lotesDisponibles, totales, ultimasCompras] = await Promise.all([
        Lote.count({ where: { estado: 'DISPONIBLE' } }),
        totalesDelDia(hoy),
        Compra.findAll({
            include: [{ model: Comprador, as: 'comprador' }, { model: Lote, as: 'lote' }],
            order: [['fecha', 'DESC'], ['id_cmp', 'DESC']],
            limit: 5
        })
    ]);
    return { lotesDisponibles, comprasHoy: totales.compras, ingresosHoy: totales.importe, ultimasCompras };
};
