import { jornadas, reportePeriodo } from '../services/reporteService.js';
import { generarPdfReporte } from '../helpers/reportePdf.js';
import { paginar, datosPaginacion } from '../helpers/utilidades.js';
import { esFechaISO, hoyISO } from '../helpers/formatos.js';

// Lee ?desde=&hasta= (fechas inclusive). Devuelve { desde, hasta, error }.
// Sin fechas no hay rango; con una sola se usa la misma para ambos extremos.
const leerRango = (query) => {
    const hayDesde = query.desde !== undefined && query.desde !== '';
    const hayHasta = query.hasta !== undefined && query.hasta !== '';
    if (!hayDesde && !hayHasta) return { desde: '', hasta: '', error: null };
    if ((hayDesde && !esFechaISO(query.desde)) || (hayHasta && !esFechaISO(query.hasta))) {
        return { desde: '', hasta: '', error: 'Escribe fechas válidas para generar el reporte.' };
    }
    const desde = hayDesde ? query.desde : query.hasta;
    const hasta = hayHasta ? query.hasta : query.desde;
    if (desde > hasta) return { desde, hasta, error: 'La fecha inicial no puede ser posterior a la fecha final.' };
    return { desde, hasta, error: null };
};

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
