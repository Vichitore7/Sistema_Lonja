import { ErrorApi, seg } from '../helpers/api.js';
import { datosPaginacion, texto } from '../helpers/utilidades.js';

const CAMPOS = ['nombre', 'apellido_paterno', 'apellido_materno', 'direccion', 'correo'];
const leerDatos = (body) => Object.fromEntries(CAMPOS.map((c) => [c, texto(body[c])]));
const esInvalido = (error) => error instanceof ErrorApi && error.status === 400 && error.errores;
const ruta = (req, extra = '') => `/compradores/${seg(req.params.codigo)}${extra}`;

const renderFormulario = (res, { comprador = null, datos, errores = null, status = 200 }) =>
    res.status(status).render('compradores/formulario', {
        pagina: comprador ? 'Editar comprador' : 'Nuevo comprador',
        seccion: 'compradores', comprador, datos, errores
    });

const renderDetalle = (res, comprador, { datosCuenta = null, erroresCuenta = null, erroresPassword = null, status = 200 } = {}) =>
    res.status(status).render('compradores/detalle', {
        pagina: 'Detalle del comprador', seccion: 'compradores', comprador,
        datosCuenta: datosCuenta || { nombre_usuario: comprador.cuenta?.nombre_usuario || '' },
        erroresCuenta, erroresPassword
    });

// GET /compradores?codigo=  (búsqueda SOLO por código)
const listar = async (req, res) => {
    const datos = await req.api('/compradores', { query: req.query });
    res.render('compradores/index', {
        pagina: 'Compradores', seccion: 'compradores', compradores: datos.compradores, codigo: datos.codigo,
        paginacion: datosPaginacion(datos.total, datos.pagina, req.query)
    });
};

// GET /compradores/nuevo
const formularioNuevo = (req, res) => renderFormulario(res, { datos: {} });

// POST /compradores -> POST /api/compradores (el código lo genera la API)
const crear = async (req, res) => {
    const datos = leerDatos(req.body);
    try {
        const comprador = await req.api('/compradores', { method: 'POST', body: datos });
        return res.redirect(`/compradores/${comprador.codigo_cpr}?msg=comprador-creado`);
    } catch (error) {
        if (!esInvalido(error)) throw error;
        return renderFormulario(res, { datos, errores: error.errores, status: 400 });
    }
};

// GET /compradores/:codigo
const detalle = async (req, res) => renderDetalle(res, await req.api(ruta(req)));

// GET /compradores/:codigo/editar
const formularioEditar = async (req, res) => {
    const comprador = await req.api(ruta(req));
    renderFormulario(res, { comprador, datos: Object.fromEntries(CAMPOS.map((c) => [c, comprador[c] || ''])) });
};

// POST /compradores/:codigo/editar -> PUT /api/compradores/:codigo
const editar = async (req, res) => {
    const datos = leerDatos(req.body);
    try {
        await req.api(ruta(req), { method: 'PUT', body: datos });
        return res.redirect(`${ruta(req)}?msg=comprador-editado`);
    } catch (error) {
        if (!esInvalido(error)) throw error;
        return renderFormulario(res, { comprador: await req.api(ruta(req)), datos, errores: error.errores, status: 400 });
    }
};

// ---------- Cuenta del comprador ----------
// Ejecuta la acción en la API; con 409 (sin cuenta / ya tiene cuenta) regresa al detalle con aviso
// y con 400 vuelve a mostrar el detalle con los errores del formulario
const accionCuenta = (llamar, { exito, campoErrores }) => async (req, res) => {
    try {
        const resultado = await llamar(req);
        const destino = req.body.volver === 'usuarios' ? '/usuarios' : ruta(req);
        return res.redirect(`${destino}?msg=${typeof exito === 'function' ? exito(resultado) : exito}`);
    } catch (error) {
        if (error instanceof ErrorApi && error.status === 409) return res.redirect(`${ruta(req)}?error=${error.codigo}`);
        if (!esInvalido(error)) throw error;
        const comprador = await req.api(ruta(req));
        const extra = campoErrores === 'password'
            ? { erroresPassword: error.errores }
            : { datosCuenta: { nombre_usuario: texto(req.body.nombre_usuario) }, erroresCuenta: error.errores };
        return renderDetalle(res, comprador, { ...extra, status: 400 });
    }
};

const cuentaBody = (req) => ({
    nombre_usuario: texto(req.body.nombre_usuario),
    password: String(req.body.password ?? ''),
    confirmar: String(req.body.confirmar ?? '')
});
const passwordBody = (req) => ({ password: String(req.body.password ?? ''), confirmar: String(req.body.confirmar ?? '') });

// POST /compradores/:codigo/cuenta -> POST /api/compradores/:codigo/cuenta
const crearCuenta = accionCuenta(
    (req) => req.api(ruta(req, '/cuenta'), { method: 'POST', body: cuentaBody(req) }),
    { exito: 'cuenta-comprador-creada' }
);

// POST /compradores/:codigo/cuenta/editar -> PUT /api/compradores/:codigo/cuenta
const editarCuenta = accionCuenta(
    (req) => req.api(ruta(req, '/cuenta'), { method: 'PUT', body: { nombre_usuario: texto(req.body.nombre_usuario) } }),
    { exito: 'cuenta-comprador-editada' }
);

// POST /compradores/:codigo/cuenta/estado -> PATCH /api/compradores/:codigo/cuenta/estado
const cambiarEstadoCuenta = accionCuenta(
    (req) => req.api(ruta(req, '/cuenta/estado'), { method: 'PATCH' }),
    { exito: (r) => (r.activo ? 'cuenta-comprador-activada' : 'cuenta-comprador-desactivada') }
);

// POST /compradores/:codigo/cuenta/password -> PUT /api/compradores/:codigo/cuenta/password
const restablecerPasswordCuenta = accionCuenta(
    (req) => req.api(ruta(req, '/cuenta/password'), { method: 'PUT', body: passwordBody(req) }),
    { exito: 'password-comprador-restablecida', campoErrores: 'password' }
);

export {
    listar, formularioNuevo, crear, detalle, formularioEditar, editar,
    crearCuenta, editarCuenta, cambiarEstadoCuenta, restablecerPasswordCuenta
};
