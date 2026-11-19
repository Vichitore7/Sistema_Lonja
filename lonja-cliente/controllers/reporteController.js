import { apiArchivo, enviarArchivo } from '../helpers/api.js';
import { datosPaginacion, leerRango } from '../helpers/utilidades.js';
import { esFechaISO, hoyISO } from '../helpers/formatos.js';

// GET /reportes  -> sin rango: formulario + jornadas con ventas.  Con rango válido: el reporte.
const reporte = async (req, res) => {
    const rango = leerRango(req.query);
    if (rango.desde && !rango.error) {
        const datos = await req.api('/reportes', { query: { desde: rango.desde, hasta: rango.hasta } });
        return res.render('reportes/rango', { pagina: 'Reporte por fechas', seccion: 'reportes', ...datos });
    }
    const datos = await req.api('/reportes/jornadas', { query: { pagina: req.query.pagina } });
    res.status(rango.error ? 400 : 200).render('reportes/index', {
        pagina: 'Reportes', seccion: 'reportes', jornadas: datos.jornadas, hoy: hoyISO(),
        rango: { desde: rango.desde || hoyISO(), hasta: rango.hasta || hoyISO() }, errorRango: rango.error,
        paginacion: datosPaginacion(datos.total, datos.pagina, {})
    });
};

// GET /reportes/pdf?desde=&hasta=  -> PDF que genera la API (con los mismos datos de la pantalla)
const pdf = async (req, res) => {
    const rango = leerRango(req.query);
    if (!rango.desde || rango.error) return reporte(req, res);
    const archivo = await apiArchivo('/reportes/pdf', { token: req.token, query: { desde: rango.desde, hasta: rango.hasta } });
    return enviarArchivo(res, archivo);
};

// /reportes/diario?fecha=  y  /reportes/periodo?desde=&hasta=  ->  /reportes[/pdf]?desde=&hasta=
const redirigirAntiguo = (sufijo) => (req, res) => {
    const desde = esFechaISO(req.query.fecha) ? req.query.fecha : (esFechaISO(req.query.desde) ? req.query.desde : hoyISO());
    const hasta = esFechaISO(req.query.fecha) ? req.query.fecha : (esFechaISO(req.query.hasta) ? req.query.hasta : desde);
    res.redirect(`/reportes${sufijo}?desde=${desde}&hasta=${hasta}`);
};

export { reporte, pdf, redirigirAntiguo };
