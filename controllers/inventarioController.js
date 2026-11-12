import { consultarLotes, leerFiltros, opcionesFiltros } from '../services/loteService.js';
import { paginar, datosPaginacion } from '../helpers/utilidades.js';

// GET /inventario  (Administrador y Empleado, solo consulta)
const listar = async (req, res) => {
    const filtros = leerFiltros(req.query);
    const { pagina, limit, offset } = paginar(req.query);
    const [{ lotes, total }, opciones] = await Promise.all([consultarLotes(filtros, { limit, offset }), opcionesFiltros()]);

    res.render('inventario/index', {
        pagina: 'Inventario', seccion: 'inventario',
        lotes, filtros, ...opciones,
        paginacion: datosPaginacion(total, pagina, req.query)
    });
};

export { listar };
