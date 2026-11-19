import { seg } from '../helpers/api.js';
import { datosPaginacion } from '../helpers/utilidades.js';

// Historial interno de compras (Administrador y Empleado), solo lectura

// GET /compras/historial -> GET /api/compras
const historial = async (req, res) => {
    const datos = await req.api('/compras', { query: req.query });
    res.render('compras/historial', {
        pagina: 'Historial de compras', seccion: 'compras', compras: datos.compras, filtros: datos.filtros,
        paginacion: datosPaginacion(datos.total, datos.pagina, req.query)
    });
};

// GET /compras/:id -> GET /api/compras/:id
const detalle = async (req, res) => {
    const compra = await req.api(`/compras/${seg(req.params.id)}`);
    res.render('compras/detalle', { pagina: 'Detalle de compra', seccion: 'compras', compra });
};

export { historial, detalle };
