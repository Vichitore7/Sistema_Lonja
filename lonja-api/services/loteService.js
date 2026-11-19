// Consulta de lotes compartida por Inventario (A/E) y Lotes (A)
import { Op } from 'sequelize';
import { Lote, Especie, Tipo, Compra } from '../models/index.js';
import { ESTADOS_LOTE } from '../models/Lote.js';
import { entero, texto } from '../helpers/utilidades.js';

// Normaliza los filtros que llegan por la URL
export const leerFiltros = (query) => ({
    buscar: texto(query.buscar).slice(0, 100),
    estado: ESTADOS_LOTE.includes(query.estado) ? query.estado : '',
    especie: texto(query.especie).slice(0, 100),
    id_tpo: entero(query.id_tpo) ? String(entero(query.id_tpo)) : '',
    kg_min: /^\d+(\.\d{1,2})?$/.test(query.kg_min || '') ? query.kg_min : '',
    kg_max: /^\d+(\.\d{1,2})?$/.test(query.kg_max || '') ? query.kg_max : '',
    // 'si' = a la venta, 'no' = sin publicar
    publicado: ['si', 'no'].includes(query.publicado) ? query.publicado : ''
});

const idsLotesConEspecie = async (whereEspecie) => {
    const filas = await Especie.findAll({ attributes: ['id_lte'], where: whereEspecie, raw: true });
    return [...new Set(filas.map((f) => f.id_lte))];
};

export const consultarLotes = async (filtros, { limit, offset }) => {
    const condiciones = [];

    if (filtros.estado) condiciones.push({ estado: filtros.estado });
    if (filtros.publicado) condiciones.push({ publicado: filtros.publicado === 'si' });
    if (filtros.kg_min) condiciones.push({ kilos: { [Op.gte]: filtros.kg_min } });
    if (filtros.kg_max) condiciones.push({ kilos: { [Op.lte]: filtros.kg_max } });
    if (filtros.especie) condiciones.push({ id_lte: await idsLotesConEspecie({ nombre: filtros.especie }) });
    if (filtros.id_tpo) condiciones.push({ id_lte: await idsLotesConEspecie({ id_tpo: filtros.id_tpo }) });

    // Búsqueda libre: número de lote o nombre de especie
    if (filtros.buscar) {
        const porEspecie = await idsLotesConEspecie({ nombre: { [Op.like]: `%${filtros.buscar}%` } });
        const numero = entero(filtros.buscar);
        condiciones.push({ [Op.or]: [{ id_lte: porEspecie }, ...(numero ? [{ id_lte: numero }] : [])] });
    }

    const { rows, count } = await Lote.findAndCountAll({
        where: { [Op.and]: condiciones },
        include: [{ model: Especie, as: 'especies', include: [{ model: Tipo, as: 'tipo' }] }],
        distinct: true,
        order: [['id_lte', 'DESC'], [{ model: Especie, as: 'especies' }, 'id_epe', 'ASC']],
        limit,
        offset
    });
    return { lotes: rows, total: count };
};

// Opciones de los filtros (selects)
export const opcionesFiltros = async () => {
    const [tipos, especies] = await Promise.all([
        Tipo.findAll({ order: [['nombre', 'ASC']] }),
        Especie.findAll({ attributes: ['nombre'], group: ['nombre'], order: [['nombre', 'ASC']], raw: true })
    ]);
    return { tipos, especies: especies.map((e) => e.nombre) };
};

export const buscarLoteCompleto = (id_lte) => Lote.findByPk(id_lte, {
    include: [
        { model: Especie, as: 'especies', include: [{ model: Tipo, as: 'tipo' }] },
        { model: Compra, as: 'compra', include: ['comprador'] }
    ],
    order: [[{ model: Especie, as: 'especies' }, 'id_epe', 'ASC']]
});

// Lotes DISPONIBLES todavía sin publicar (los que el Administrador puede poner a la venta)
export const lotesPorPublicar = () => Lote.findAll({
    where: { estado: 'DISPONIBLE', publicado: false },
    include: [{ model: Especie, as: 'especies', include: [{ model: Tipo, as: 'tipo' }] }],
    order: [['id_lte', 'ASC'], [{ model: Especie, as: 'especies' }, 'id_epe', 'ASC']]
});
