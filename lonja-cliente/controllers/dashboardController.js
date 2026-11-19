// GET /dashboard -> GET /api/dashboard
const panel = async (req, res) => {
    const indicadores = await req.api('/dashboard');
    res.render('dashboard/index', { pagina: 'Inicio', seccion: 'inicio', ...indicadores });
};

export { panel };
