import { indicadoresDashboard } from '../services/reporteService.js';

// GET /dashboard
const panel = async (req, res) => {
    const indicadores = await indicadoresDashboard();
    res.render('dashboard/index', { pagina: 'Inicio', seccion: 'inicio', ...indicadores });
};

export { panel };
