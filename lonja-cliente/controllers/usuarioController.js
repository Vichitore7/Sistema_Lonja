// Gestión de cuentas (Administrador): empleados y cuentas de comprador
import { ErrorApi, seg } from '../helpers/api.js';
import { datosPaginacion, texto } from '../helpers/utilidades.js';

const esInvalido = (error) => error instanceof ErrorApi && error.status === 400 && error.errores;
const noEditable = (error) => error instanceof ErrorApi && error.status === 404;
const ruta = (req, extra = '') => `/usuarios/${seg(req.params.id)}${extra}`;
const passwordBody = (req) => ({ password: String(req.body.password ?? ''), confirmar: String(req.body.confirmar ?? '') });

const renderFormulario = (res, { empleado = null, datos, errores = null, erroresPassword = null, status = 200 }) =>
    res.status(status).render('usuarios/formulario', {
        pagina: empleado ? 'Editar usuario' : 'Nuevo usuario', seccion: 'usuarios', empleado, datos, errores, erroresPassword
    });

// Cualquier cuenta que no sea EMPLEADO responde 404 en la API: se regresa a la lista con aviso
const conEmpleado = (accion) => async (req, res) => {
    try {
        return await accion(req, res);
    } catch (error) {
        if (noEditable(error)) return res.redirect('/usuarios?error=usuario-no-editable');
        throw error;
    }
};

// GET /usuarios -> GET /api/usuarios
const listar = async (req, res) => {
    const datos = await req.api('/usuarios', { query: req.query });
    res.render('usuarios/index', {
        pagina: 'Gestión de cuentas', seccion: 'usuarios', usuarios: datos.usuarios, filtros: datos.filtros,
        codigo: datos.codigo, cuentasCompradores: datos.cuentasCompradores,
        paginacion: datosPaginacion(datos.total, datos.pagina, req.query)
    });
};

// GET /usuarios/nuevo
const formularioNuevo = (req, res) => renderFormulario(res, { datos: {} });

// POST /usuarios -> POST /api/usuarios (la API fuerza el rol EMPLEADO)
const crearEmpleado = async (req, res) => {
    const datos = { nombre_usuario: texto(req.body.nombre_usuario) };
    try {
        await req.api('/usuarios', { method: 'POST', body: { ...datos, ...passwordBody(req) } });
        return res.redirect('/usuarios?msg=usuario-creado');
    } catch (error) {
        if (!esInvalido(error)) throw error;
        return renderFormulario(res, { datos, errores: error.errores, status: 400 });
    }
};

// GET /usuarios/:id/editar
const formularioEditar = conEmpleado(async (req, res) => {
    const empleado = await req.api(ruta(req));
    renderFormulario(res, { empleado, datos: { nombre_usuario: empleado.nombre_usuario } });
});

// POST /usuarios/:id/editar -> PUT /api/usuarios/:id
const editar = conEmpleado(async (req, res) => {
    const datos = { nombre_usuario: texto(req.body.nombre_usuario) };
    try {
        await req.api(ruta(req), { method: 'PUT', body: datos });
        return res.redirect('/usuarios?msg=usuario-editado');
    } catch (error) {
        if (!esInvalido(error)) throw error;
        return renderFormulario(res, { empleado: await req.api(ruta(req)), datos, errores: error.errores, status: 400 });
    }
});

// POST /usuarios/:id/estado -> PATCH /api/usuarios/:id/estado
const cambiarEstado = conEmpleado(async (req, res) => {
    const { activo } = await req.api(ruta(req, '/estado'), { method: 'PATCH' });
    res.redirect(`/usuarios?msg=${activo ? 'usuario-activado' : 'usuario-desactivado'}`);
});

// POST /usuarios/:id/password -> PUT /api/usuarios/:id/password
const restablecerPassword = conEmpleado(async (req, res) => {
    try {
        await req.api(ruta(req, '/password'), { method: 'PUT', body: passwordBody(req) });
        return res.redirect('/usuarios?msg=password-restablecida');
    } catch (error) {
        if (!esInvalido(error)) throw error;
        const empleado = await req.api(ruta(req));
        return renderFormulario(res, { empleado, datos: { nombre_usuario: empleado.nombre_usuario }, erroresPassword: error.errores, status: 400 });
    }
});

export { listar, formularioNuevo, crearEmpleado, formularioEditar, editar, cambiarEstado, restablecerPassword };
