// Historial personal del comprador. La API solo devuelve las compras de la cuenta del token.
import { ErrorApi, apiArchivo, enviarArchivo, seg } from '../helpers/api.js';
import { datosPaginacion } from '../helpers/utilidades.js';
import { hoyISO } from '../helpers/formatos.js';

// GET /mis-compras?desde=&hasta= -> GET /api/mis-compras
const listar = async (req, res) => {
    let datos;
    let status = 200;
    try {
        datos = await req.api('/mis-compras', { query: req.query });
    } catch (error) {
        // Rango inválido: la API responde 400 con el historial completo y el mensaje
        if (!(error instanceof ErrorApi) || error.status !== 400 || !error.datos.compras) throw error;
        datos = error.datos;
        status = 400;
    }
    const { desde, hasta } = datos.rango;
    res.status(status).render('mis-compras/index', {
        pagina: 'Mis compras', seccion: 'mis-compras', compras: datos.compras, totales: datos.totales, hoy: hoyISO(),
        rango: { desde, hasta }, conRango: datos.conRango, errorRango: datos.error || null,
        paginacion: datosPaginacion(datos.total, datos.pagina, datos.conRango ? { desde, hasta } : {})
    });
};

// GET /mis-compras/pdf?desde=&hasta= -> PDF que genera la API
const pdf = async (req, res) => {
    try {
        const archivo = await apiArchivo('/mis-compras/pdf', { token: req.token, query: { desde: req.query.desde, hasta: req.query.hasta } });
        return enviarArchivo(res, archivo);
    } catch (error) {
        if (error instanceof ErrorApi && error.status === 400) return listar(req, res);
        throw error;
    }
};

// GET /mis-compras/:id -> GET /api/mis-compras/:id (una compra ajena responde 404)
const detalle = async (req, res) => {
    const compra = await req.api(`/mis-compras/${seg(req.params.id)}`);
    res.render('mis-compras/detalle', { pagina: 'Detalle de mi compra', seccion: 'mis-compras', compra });
};

export { listar, pdf, detalle };
