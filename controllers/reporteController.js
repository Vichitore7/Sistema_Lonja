import { jornadas, reportePeriodo } from '../services/reporteService.js';
import { generarPdfReporte } from '../helpers/reportePdf.js';
import { paginar, datosPaginacion, leerRango } from '../helpers/utilidades.js';
import { esFechaISO, hoyISO } from '../helpers/formatos.js';

// GET /reportes  -> sin rango: formulario + jornadas con ventas.  Con rango válido: el reporte.
const reporte = async (req, res) => {
    const rango = leerRango(req.query);
    if (rango.desde && !rango.error) {
        return res.render('reportes/rango', {
            pagina: 'Reporte por fechas', seccion: 'reportes', ...(await reportePeriodo(rango.desde, rango.hasta))
        });
    }
    const { pagina, limit, offset } = paginar(req.query);
    const { filas, total } = await jornadas({ limit, offset });
    res.status(rango.error ? 400 : 200).render('reportes/index', {
        pagina: 'Reportes', seccion: 'reportes', jornadas: filas, hoy: hoyISO(),
        rango: { desde: rango.desde || hoyISO(), hasta: rango.hasta || hoyISO() }, errorRango: rango.error,
        paginacion: datosPaginacion(total, pagina, {})
    });
};

// GET /reportes/pdf?desde=&hasta=  (se recalcula desde MariaDB: coincide con la pantalla)
const pdf = async (req, res) => {
    const rango = leerRango(req.query);
    if (!rango.desde || rango.error) return reporte(req, res);
    const datos = await reportePeriodo(rango.desde, rango.hasta);
    const nombre = datos.desde === datos.hasta ? `reporte-${datos.desde}` : `reporte-${datos.desde}-al-${datos.hasta}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}.pdf"`);
    generarPdfReporte(datos, res);
};

// /reportes/diario?fecha=  y  /reportes/periodo?desde=&hasta=  ->  /reportes[/pdf]?desde=&hasta=
const redirigirAntiguo = (sufijo) => (req, res) => {
    const desde = esFechaISO(req.query.fecha) ? req.query.fecha : (esFechaISO(req.query.desde) ? req.query.desde : hoyISO());
    const hasta = esFechaISO(req.query.fecha) ? req.query.fecha : (esFechaISO(req.query.hasta) ? req.query.hasta : desde);
    res.redirect(`/reportes${sufijo}?desde=${desde}&hasta=${hasta}`);
};

export { reporte, pdf, redirigirAntiguo };
