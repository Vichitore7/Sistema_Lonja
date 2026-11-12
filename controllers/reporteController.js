import { jornadas, reporteDiario } from '../services/reporteService.js';
import { generarPdfDiario } from '../helpers/reportePdf.js';
import { paginar, datosPaginacion } from '../helpers/utilidades.js';
import { esFechaISO, hoyISO } from '../helpers/formatos.js';

const fechaConsultada = (valor) => (esFechaISO(valor) ? valor : hoyISO());

// GET /reportes  (jornadas con ventas)
const listar = async (req, res) => {
    const filtros = {
        desde: esFechaISO(req.query.desde) ? req.query.desde : '',
        hasta: esFechaISO(req.query.hasta) ? req.query.hasta : ''
    };
    const { pagina, limit, offset } = paginar(req.query);
    const { filas, total } = await jornadas({ ...filtros, limit, offset });
    res.render('reportes/index', {
        pagina: 'Reportes diarios', seccion: 'reportes', jornadas: filas, filtros, hoy: hoyISO(),
        paginacion: datosPaginacion(total, pagina, req.query)
    });
};

// GET /reportes/diario?fecha=YYYY-MM-DD
const diario = async (req, res) => {
    const reporte = await reporteDiario(fechaConsultada(req.query.fecha));
    res.render('reportes/diario', { pagina: 'Detalle del reporte', seccion: 'reportes', ...reporte });
};

// GET /reportes/diario/pdf?fecha=YYYY-MM-DD  (se recalcula desde MariaDB)
const pdf = async (req, res) => {
    const reporte = await reporteDiario(fechaConsultada(req.query.fecha));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-diario-${reporte.fecha}.pdf"`);
    generarPdfDiario(reporte, res);
};

export { listar, diario, pdf };
