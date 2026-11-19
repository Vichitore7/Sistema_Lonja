import { jornadas, reportePeriodo, indicadoresDashboard } from '../services/reporteService.js';
import { generarPdfReporte } from '../helpers/reportePdf.js';
import { paginar, leerRango } from '../helpers/utilidades.js';

// GET /api/dashboard  -> indicadores de la pantalla de inicio del personal
const dashboard = async (req, res) => res.json(await indicadoresDashboard());

// GET /api/reportes/jornadas?pagina=  -> días con ventas (una fila por día)
const listarJornadas = async (req, res) => {
    const { pagina, limit, offset } = paginar(req.query);
    const { filas, total } = await jornadas({ limit, offset });
    res.json({ jornadas: filas, total, pagina });
};

// Lee y valida ?desde=&hasta= (obligatorios en el reporte)
const rangoValido = (req, res) => {
    const rango = leerRango(req.query);
    if (!rango.desde || rango.error) {
        res.status(400).json({ error: rango.error || 'Indica la fecha inicial y final del reporte.' });
        return null;
    }
    return rango;
};

// GET /api/reportes?desde=YYYY-MM-DD&hasta=YYYY-MM-DD  -> { desde, hasta, totales, compras }
const reporte = async (req, res) => {
    const rango = rangoValido(req, res);
    if (!rango) return;
    res.json(await reportePeriodo(rango.desde, rango.hasta));
};

// GET /api/reportes/pdf?desde=&hasta=  (se recalcula desde MariaDB: coincide con la pantalla)
const pdf = async (req, res) => {
    const rango = rangoValido(req, res);
    if (!rango) return;
    const datos = await reportePeriodo(rango.desde, rango.hasta);
    const nombre = datos.desde === datos.hasta ? `reporte-${datos.desde}` : `reporte-${datos.desde}-al-${datos.hasta}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}.pdf"`);
    generarPdfReporte(datos, res);
};

export { dashboard, listarJornadas, reporte, pdf };
