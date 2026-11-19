// Catálogo del comprador. La API solo manda el precio total de cada lote (nunca el precio por kilo).
import { ErrorApi, seg } from '../helpers/api.js';
import { datosPaginacion } from '../helpers/utilidades.js';
import { folio } from '../helpers/formatos.js';
import { mensajeExito, mensajeError } from '../helpers/mensajes.js';

// GET /catalogo -> GET /api/catalogo
const listar = async (req, res) => {
    const datos = await req.api('/catalogo', { query: req.query });
    res.render('catalogo/index', {
        pagina: 'Catálogo', seccion: 'catalogo',
        ofertas: datos.ofertas, filtros: datos.filtros, tipos: datos.tipos,
        paginacion: datosPaginacion(datos.total, datos.pagina, req.query)
    });
};

// GET /catalogo/:id  (un lote sin publicar, vendido o retirado regresa al catálogo con aviso)
const detalle = async (req, res) => {
    try {
        const oferta = await req.api(`/catalogo/${seg(req.params.id)}`);
        return res.render('catalogo/detalle', { pagina: `Lote ${folio(oferta.id_lte)}`, seccion: 'catalogo', oferta });
    } catch (error) {
        if (error instanceof ErrorApi && error.status === 404) return res.redirect('/catalogo?error=lote-agotado');
        throw error;
    }
};

// POST /catalogo/:id/comprar -> POST /api/catalogo/:id/comprar
// El navegador solo envía el token CSRF; el comprador sale del JWT y el precio lo pone la API.
// Con JavaScript (fetch) responde JSON y el comprador se queda en el catálogo;
// sin JavaScript vuelve al catálogo con el aviso.
const comprar = async (req, res) => {
    const json = req.get('X-Requested-With') === 'fetch';
    try {
        const compra = await req.api(`/catalogo/${seg(req.params.id)}/comprar`, { method: 'POST' });
        if (json) return res.json({ ok: true, id_cmp: compra.id_cmp, folio: compra.folio, lote: compra.lote, mensaje: mensajeExito('compra-realizada') });
        return res.redirect('/catalogo?msg=compra-realizada');
    } catch (error) {
        if (!(error instanceof ErrorApi) || ![409, 429].includes(error.status)) throw error;
        const mensaje = mensajeError(error.codigo) || error.message;
        if (json) return res.status(error.status).json({ ok: false, mensaje });
        if (error.status === 409) return res.redirect(`/catalogo?error=${error.codigo}`);
        throw error;
    }
};

export { listar, detalle, comprar };
