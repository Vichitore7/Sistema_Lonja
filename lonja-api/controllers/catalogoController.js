// Catálogo del comprador: lotes publicados y DISPONIBLES, y compra inmediata del lote completo.
import { Lote, Especie, Tipo, Compra } from '../models/index.js';
import { consultarLotes, leerFiltros, opcionesFiltros } from '../services/loteService.js';
import { comprarLote, ErrorVenta } from '../services/ventaService.js';
import { paginar, entero } from '../helpers/utilidades.js';
import { calcularTotal, folio } from '../helpers/formatos.js';
import { noExiste } from '../middleware/errores.js';

// Lo ÚNICO que recibe el comprador: sin precio_kilo_salida ni precio_kilo_final.
// Solo el precio total calculado en la API.
const oferta = (l) => ({
    id_lte: l.id_lte,
    kilos: l.kilos,
    numero_cajas: l.numero_cajas,
    fecha: l.fecha,
    especies: l.especies.map((e) => ({ nombre: e.nombre, tipo: e.tipo?.nombre || '', imagen: e.imagen })),
    total: calcularTotal(l.kilos, l.precio_kilo_final)
});

// GET /api/catalogo?buscar=&id_tpo=&pagina=
const listar = async (req, res) => {
    const { buscar, id_tpo } = leerFiltros(req.query);
    const filtros = { buscar, id_tpo, estado: 'DISPONIBLE', publicado: 'si', especie: '', kg_min: '', kg_max: '' };
    const { pagina, limit, offset } = paginar(req.query);
    const [{ lotes, total }, { tipos }] = await Promise.all([consultarLotes(filtros, { limit, offset }), opcionesFiltros()]);
    res.json({ ofertas: lotes.map(oferta), total, pagina, filtros: { buscar, id_tpo }, tipos });
};

// GET /api/catalogo/:id  (un lote sin publicar, vendido o retirado responde 404)
const detalle = async (req, res) => {
    const id = entero(req.params.id);
    const lote = id && await Lote.findOne({
        where: { id_lte: id, estado: 'DISPONIBLE', publicado: true },
        include: [{ model: Especie, as: 'especies', include: [{ model: Tipo, as: 'tipo' }] }],
        order: [[{ model: Especie, as: 'especies' }, 'id_epe', 'ASC']]
    });
    if (!lote) return noExiste(res, 'Este lote ya no está disponible.', 'lote-agotado');
    res.json(oferta(lote));
};

const ERROR_COMPRA = {
    agotado: ['lote-agotado', 'Este lote ya no está disponible.'],
    retirada: ['oferta-retirada', 'La oferta de ese lote fue retirada del catálogo.'],
    precio: ['precio-no-valido', 'Ese lote no tiene un precio válido en este momento.'],
    cuenta: ['lote-agotado', 'Este lote ya no está disponible.']
};

// POST /api/catalogo/:id/comprar
// Solo se recibe el identificador del lote (en la URL). El comprador sale del token
// y el precio de MariaDB; cualquier campo del cuerpo se ignora.
const comprar = async (req, res) => {
    const respuesta = (compra, status = 201) => res.status(status).json({
        id_cmp: compra.id_cmp, folio: folio(compra.id_cmp), lote: folio(compra.id_lte), precio_total: compra.precio_total
    });
    const rechazo = (clave) => {
        const [codigo, error] = ERROR_COMPRA[clave] || ERROR_COMPRA.agotado;
        return res.status(409).json({ error, codigo });
    };

    const id_lte = entero(req.params.id);
    if (!id_lte) return rechazo('agotado');
    try {
        return respuesta(await comprarLote(req.usuario.codigo_cpr, id_lte));
    } catch (error) {
        if (!(error instanceof ErrorVenta)) throw error;
        // Si se repitió el envío, la compra ya es de este comprador: se confirma, sin crear otra
        const propia = await Compra.findOne({ where: { id_lte, codigo_cpr: req.usuario.codigo_cpr } });
        if (propia) return respuesta(propia, 200);
        return rechazo(error.codigo);
    }
};

export { listar, detalle, comprar };
