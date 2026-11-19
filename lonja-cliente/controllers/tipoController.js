import { ErrorApi, seg } from '../helpers/api.js';
import { datosPaginacion, texto } from '../helpers/utilidades.js';

const renderFormulario = (res, { tipo = null, datos, errores = null, status = 200 }) =>
    res.status(status).render('tipos/formulario', {
        pagina: tipo ? 'Editar tipo' : 'Nuevo tipo', seccion: 'tipos', tipo, datos, errores
    });

const esInvalido = (error) => error instanceof ErrorApi && error.status === 400 && error.errores;

// GET /tipos
const listar = async (req, res) => {
    const datos = await req.api('/tipos', { query: req.query });
    res.render('tipos/index', {
        pagina: 'Tipos', seccion: 'tipos', tipos: datos.tipos, nombre: datos.nombre,
        paginacion: datosPaginacion(datos.total, datos.pagina, req.query)
    });
};

// GET /tipos/nuevo
const formularioNuevo = (req, res) => renderFormulario(res, { datos: {} });

// POST /tipos -> POST /api/tipos
const crear = async (req, res) => {
    const datos = { nombre: texto(req.body.nombre) };
    try {
        await req.api('/tipos', { method: 'POST', body: datos });
        return res.redirect('/tipos?msg=tipo-creado');
    } catch (error) {
        if (!esInvalido(error)) throw error;
        return renderFormulario(res, { datos, errores: error.errores, status: 400 });
    }
};

// GET /tipos/:id/editar
const formularioEditar = async (req, res) => {
    const tipo = await req.api(`/tipos/${seg(req.params.id)}`);
    renderFormulario(res, { tipo, datos: { nombre: tipo.nombre } });
};

// POST /tipos/:id/editar -> PUT /api/tipos/:id
const editar = async (req, res) => {
    const datos = { nombre: texto(req.body.nombre) };
    try {
        await req.api(`/tipos/${seg(req.params.id)}`, { method: 'PUT', body: datos });
        return res.redirect('/tipos?msg=tipo-editado');
    } catch (error) {
        if (!esInvalido(error)) throw error;
        const tipo = await req.api(`/tipos/${seg(req.params.id)}`);
        return renderFormulario(res, { tipo, datos, errores: error.errores, status: 400 });
    }
};

export { listar, formularioNuevo, crear, formularioEditar, editar };
