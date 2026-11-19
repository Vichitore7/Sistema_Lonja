// Lotes (Administrador) e Inventario (Administrador y Empleado). Los datos vienen de /api/lotes.
import { ErrorApi, seg } from '../helpers/api.js';
import { datosPaginacion } from '../helpers/utilidades.js';
import { hoyISO, fechaISO, folio } from '../helpers/formatos.js';
import { aFormData } from '../middleware/seguridad.js';

const tiposParaSelect = async (req) => (await req.api('/tipos', { query: { todos: 1 } })).tipos;

// GET /api/lotes con los filtros de la URL
const consultar = async (req) => {
    const datos = await req.api('/lotes', { query: req.query });
    return {
        lotes: datos.lotes, filtros: datos.filtros, tipos: datos.tipos, especies: datos.especies,
        paginacion: datosPaginacion(datos.total, datos.pagina, req.query)
    };
};

const renderFormulario = async (req, res, { lote = null, datos, especies, errores = null, errorEspecies = null, status = 200 }) => {
    res.status(status).render('lotes/formulario', {
        pagina: lote ? `Editar lote ${folio(lote.id_lte)}` : 'Nuevo lote',
        seccion: 'lotes',
        lote, datos, tipos: await tiposParaSelect(req), errores, errorEspecies,
        hoy: hoyISO(), especies
    });
};

// Si la API rechazó el formulario (400 con los errores) se vuelve a mostrar
const esFormularioInvalido = (error) => error instanceof ErrorApi && error.status === 400 && Array.isArray(error.datos.especies);

// GET /inventario
const inventario = async (req, res) => {
    res.render('inventario/index', { pagina: 'Inventario', seccion: 'inventario', ...(await consultar(req)) });
};

// GET /lotes
const listar = async (req, res) => {
    res.render('lotes/index', { pagina: 'Lotes', seccion: 'lotes', ...(await consultar(req)) });
};

// GET /lotes/nuevo
const formularioNuevo = (req, res) => renderFormulario(req, res, { datos: { fecha: hoyISO() }, especies: [] });

// POST /lotes -> POST /api/lotes (multipart con las imágenes)
const crear = async (req, res) => {
    try {
        await req.api('/lotes', { method: 'POST', body: aFormData(req) });
        return res.redirect('/lotes?msg=lote-creado');
    } catch (error) {
        if (!esFormularioInvalido(error)) throw error;
        const { datos, especies, errores, errorEspecies } = error.datos;
        return renderFormulario(req, res, { datos, especies, errores, errorEspecies, status: 400 });
    }
};

// GET /lotes/:id
const detalle = async (req, res) => {
    const { lote, oferta } = await req.api(`/lotes/${seg(req.params.id)}`);
    const desde = req.query.desde === 'inventario' || req.usuario.rol !== 'ADMINISTRADOR' ? 'inventario' : 'lotes';
    res.render('lotes/detalle', { pagina: `Lote ${folio(lote.id_lte)}`, seccion: desde, lote, desde, oferta });
};

// GET /lotes/:id/editar  (solo lotes DISPONIBLES y sin publicar)
const formularioEditar = async (req, res) => {
    const { lote } = await req.api(`/lotes/${seg(req.params.id)}`);
    if (lote.estado !== 'DISPONIBLE') return res.redirect(`/lotes/${lote.id_lte}?error=lote-no-disponible`);
    if (lote.publicado) return res.redirect(`/lotes/${lote.id_lte}?error=lote-publicado`);
    const datos = {
        kilos: Number(lote.kilos).toFixed(2),
        numero_cajas: String(lote.numero_cajas),
        precio_kilo_salida: Number(lote.precio_kilo_salida).toFixed(2),
        fecha: fechaISO(lote.fecha)
    };
    const especies = lote.especies.map((e, i) => ({ ref: String(i + 1), id_epe: e.id_epe, nombre: e.nombre, id_tpo: e.id_tpo, imagen: e.imagen }));
    return renderFormulario(req, res, { lote, datos, especies });
};

// POST /lotes/:id/editar -> PUT /api/lotes/:id
const editar = async (req, res) => {
    const id = seg(req.params.id);
    try {
        await req.api(`/lotes/${id}`, { method: 'PUT', body: aFormData(req) });
        return res.redirect(`/lotes/${id}?msg=lote-editado`);
    } catch (error) {
        if (error instanceof ErrorApi && error.status === 409) return res.redirect(`/lotes/${id}?error=${error.codigo}`);
        if (!esFormularioInvalido(error)) throw error;
        const { lote } = await req.api(`/lotes/${id}`);
        const { datos, especies, errores, errorEspecies } = error.datos;
        return renderFormulario(req, res, { lote, datos, especies, errores, errorEspecies, status: 400 });
    }
};

// POST /lotes/:id/retirar -> PATCH /api/lotes/:id/retirar
const retirar = async (req, res) => {
    const id = seg(req.params.id);
    try {
        await req.api(`/lotes/${id}/retirar`, { method: 'PATCH' });
        return res.redirect('/lotes?msg=lote-retirado');
    } catch (error) {
        if (error instanceof ErrorApi && error.status === 409) return res.redirect(`/lotes/${id}?error=lote-no-disponible`);
        throw error;
    }
};

export { inventario, listar, formularioNuevo, crear, detalle, formularioEditar, editar, retirar };
