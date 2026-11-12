import { Comprador, Compra, Lote } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { paginar, datosPaginacion, entero, texto } from '../helpers/utilidades.js';
import { nombreCompleto } from '../helpers/formatos.js';

const CAMPOS = ['nombre', 'apellido_paterno', 'apellido_materno', 'direccion', 'correo'];
const leerDatos = (body) => Object.fromEntries(CAMPOS.map((c) => [c, texto(body[c])]));
const aBD = (datos) => ({ ...datos, apellido_materno: datos.apellido_materno || null, correo: datos.correo || null });

// Si se llega desde "Registrar compra", al guardar se vuelve ahí
const volverACompra = (valor) => valor === 'compra';

const renderFormulario = (res, { comprador = null, datos, errores = null, volver = '', status = 200 }) =>
    res.status(status).render('compradores/formulario', {
        pagina: comprador ? 'Editar comprador' : 'Nuevo comprador',
        seccion: 'compradores', comprador, datos, errores, volver: volverACompra(volver) ? 'compra' : ''
    });

// GET /compradores  (búsqueda SOLO por código)
const listar = async (req, res) => {
    const codigoTexto = texto(req.query.codigo);
    const codigo = entero(codigoTexto);
    const { pagina, limit, offset } = paginar(req.query);
    let compradores = [];
    let total = 0;
    if (codigoTexto) {
        const encontrado = codigo && await Comprador.findByPk(codigo);
        compradores = encontrado ? [encontrado] : [];
        total = compradores.length;
    } else {
        const { rows, count } = await Comprador.findAndCountAll({ order: [['codigo_cpr', 'ASC']], limit, offset });
        compradores = rows;
        total = count;
    }
    res.render('compradores/index', {
        pagina: 'Compradores', seccion: 'compradores', compradores, codigo: codigoTexto,
        paginacion: datosPaginacion(total, codigoTexto ? 1 : pagina, req.query)
    });
};

// GET /compradores/nuevo
const formularioNuevo = (req, res) => renderFormulario(res, { datos: {}, volver: req.query.volver });

// POST /compradores  (el código se genera automáticamente)
const crear = async (req, res) => {
    const datos = leerDatos(req.body);
    const errores = obtenerErrores(req);
    if (errores) return renderFormulario(res, { datos, errores, volver: req.body.volver, status: 400 });
    const comprador = await Comprador.create(aBD(datos));
    if (volverACompra(req.body.volver)) return res.redirect(`/compras/nueva?codigo_cpr=${comprador.codigo_cpr}&msg=comprador-creado`);
    res.redirect(`/compradores/${comprador.codigo_cpr}?msg=comprador-creado`);
};

// GET /compradores/:codigo  (HTML o JSON para la búsqueda de "Registrar compra")
const detalle = async (req, res, next) => {
    const codigo = entero(req.params.codigo);
    const quiereJSON = req.get('Accept')?.includes('application/json');
    const comprador = codigo && await Comprador.findByPk(codigo, {
        include: quiereJSON ? [] : [{ model: Compra, as: 'compras', include: [{ model: Lote, as: 'lote' }] }],
        order: quiereJSON ? [] : [[{ model: Compra, as: 'compras' }, 'fecha', 'DESC']]
    });
    if (quiereJSON) {
        if (!comprador) return res.status(404).json({ encontrado: false });
        return res.json({ encontrado: true, codigo_cpr: comprador.codigo_cpr, nombre: nombreCompleto(comprador) });
    }
    if (!comprador) return next();
    res.render('compradores/detalle', { pagina: 'Detalle del comprador', seccion: 'compradores', comprador });
};

// GET /compradores/:codigo/editar
const formularioEditar = async (req, res, next) => {
    const comprador = entero(req.params.codigo) && await Comprador.findByPk(entero(req.params.codigo));
    if (!comprador) return next();
    const datos = Object.fromEntries(CAMPOS.map((c) => [c, comprador[c] || '']));
    renderFormulario(res, { comprador, datos });
};

// POST /compradores/:codigo/editar  (el código no cambia)
const editar = async (req, res, next) => {
    const comprador = entero(req.params.codigo) && await Comprador.findByPk(entero(req.params.codigo));
    if (!comprador) return next();
    const datos = leerDatos(req.body);
    const errores = obtenerErrores(req);
    if (errores) return renderFormulario(res, { comprador, datos, errores, status: 400 });
    await comprador.update(aBD(datos));
    res.redirect(`/compradores/${comprador.codigo_cpr}?msg=comprador-editado`);
};

export { listar, formularioNuevo, crear, detalle, formularioEditar, editar };
