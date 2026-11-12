// Catálogo del comprador: lotes publicados y DISPONIBLES, y compra inmediata del lote completo.
import { Lote, Especie, Tipo, Compra } from '../models/index.js';
import { consultarLotes, leerFiltros, opcionesFiltros } from '../services/loteService.js';
import { comprarLote, ErrorVenta } from '../services/ventaService.js';
import { paginar, datosPaginacion, entero } from '../helpers/utilidades.js';
import { calcularTotal } from '../helpers/formatos.js';

// Lo ÚNICO que llega a las vistas del comprador: sin precio_kilo_salida ni precio_kilo_final
// (ni en HTML oculto, ni en JSON, ni en scripts). Solo el precio total calculado en el servidor.
const oferta = (l) => ({
    id_lte: l.id_lte,
    kilos: l.kilos,
    numero_cajas: l.numero_cajas,
    fecha: l.fecha,
    especies: l.especies.map((e) => ({ nombre: e.nombre, tipo: e.tipo?.nombre || '', imagen: e.imagen })),
    total: calcularTotal(l.kilos, l.precio_kilo_final)
});

// GET /catalogo
const listar = async (req, res) => {
    const { buscar, id_tpo } = leerFiltros(req.query);
    const filtros = { buscar, id_tpo, estado: 'DISPONIBLE', publicado: 'si', especie: '', kg_min: '', kg_max: '' };
    const { pagina, limit, offset } = paginar(req.query);
    const [{ lotes, total }, { tipos }] = await Promise.all([consultarLotes(filtros, { limit, offset }), opcionesFiltros()]);
    res.render('catalogo/index', {
        pagina: 'Catálogo', seccion: 'catalogo',
        ofertas: lotes.map(oferta), filtros: { buscar, id_tpo }, tipos,
        paginacion: datosPaginacion(total, pagina, req.query)
    });
};

// GET /catalogo/:id  (un lote sin publicar, vendido o retirado no se puede ver por URL directa)
const detalle = async (req, res) => {
    const id = entero(req.params.id);
    const lote = id && await Lote.findOne({
        where: { id_lte: id, estado: 'DISPONIBLE', publicado: true },
        include: [{ model: Especie, as: 'especies', include: [{ model: Tipo, as: 'tipo' }] }],
        order: [[{ model: Especie, as: 'especies' }, 'id_epe', 'ASC']]
    });
    if (!lote) return res.redirect('/catalogo?error=lote-agotado');
    res.render('catalogo/detalle', { pagina: `Lote ${String(lote.id_lte).padStart(3, '0')}`, seccion: 'catalogo', oferta: oferta(lote) });
};

const ERROR_COMPRA = { agotado: 'lote-agotado', retirada: 'oferta-retirada', precio: 'precio-no-valido', cuenta: 'lote-agotado' };

// POST /catalogo/:id/comprar
// El navegador solo envía el identificador del lote y el token CSRF. El comprador sale de la
// cuenta autenticada y el precio de MariaDB; cualquier otro campo del cuerpo se ignora.
const comprar = async (req, res) => {
    const id_lte = entero(req.params.id);
    if (!id_lte) return res.redirect('/catalogo?error=lote-agotado');
    try {
        const compra = await comprarLote(req.usuario.codigo_cpr, id_lte);
        return res.redirect(`/mis-compras/${compra.id_cmp}?msg=compra-realizada`);
    } catch (error) {
        if (!(error instanceof ErrorVenta)) throw error;
        // Si se repitió el envío, la compra ya es de este comprador: se le muestra, sin crear otra
        const propia = await Compra.findOne({ where: { id_lte, codigo_cpr: req.usuario.codigo_cpr } });
        if (propia) return res.redirect(`/mis-compras/${propia.id_cmp}`);
        return res.redirect(`/catalogo?error=${ERROR_COMPRA[error.codigo] || 'lote-agotado'}`);
    }
};

export { listar, detalle, comprar };
