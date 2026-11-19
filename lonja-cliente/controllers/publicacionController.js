// Gestión de ventas (Administrador): poner lotes a la venta y retirarlos del catálogo.
import { ErrorApi, seg } from '../helpers/api.js';
import { entero, texto } from '../helpers/utilidades.js';

// GET /ventas/administrar -> GET /api/ventas
const administrar = async (req, res) => {
    const datos = await req.api('/ventas', { query: { id_lte: req.query.id_lte } });
    res.render('ventas/administrar', { pagina: 'Gestión de ventas', seccion: 'ventas', ...datos });
};

// Formulario "Nueva venta": lotes por publicar y vista previa de la oferta (GET /api/ventas/por-publicar)
const renderNueva = async (req, res, { datos, errores = null, status = 200 }) => {
    const { lotes, lote, oferta } = await req.api('/ventas/por-publicar', { query: datos });
    res.status(status).render('ventas/nueva', { pagina: 'Nueva venta', seccion: 'ventas', datos, errores, lotes, lote, oferta });
};

// GET /ventas/nueva?id_lte=
const formularioNueva = (req, res) => renderNueva(req, res, {
    datos: { id_lte: entero(req.query.id_lte) ? String(entero(req.query.id_lte)) : '', precio_kilo_final: '' }
});

// POST /ventas/publicar -> POST /api/ventas/publicar
const publicar = async (req, res) => {
    const datos = { id_lte: texto(req.body.id_lte), precio_kilo_final: texto(req.body.precio_kilo_final) };
    try {
        await req.api('/ventas/publicar', { method: 'POST', body: datos });
        return res.redirect('/ventas/administrar?msg=lote-publicado');
    } catch (error) {
        if (!(error instanceof ErrorApi) || ![400, 409].includes(error.status) || !error.errores) throw error;
        return renderNueva(req, res, { datos, errores: error.errores, status: error.status });
    }
};

// POST /ventas/:id/despublicar -> PATCH /api/ventas/:id/despublicar
const despublicar = async (req, res) => {
    try {
        await req.api(`/ventas/${seg(req.params.id)}/despublicar`, { method: 'PATCH' });
        return res.redirect('/ventas/administrar?msg=lote-despublicado');
    } catch (error) {
        if (error instanceof ErrorApi && error.status === 409) return res.redirect('/ventas/administrar?error=lote-no-despublicable');
        throw error;
    }
};

export { administrar, formularioNueva, publicar, despublicar };
