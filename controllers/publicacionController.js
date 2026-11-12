// Gestión de ventas (solo ADMINISTRADOR): poner lotes a la venta y retirarlos del catálogo.
// Publicar NO crea una Compra: solo guarda precio_kilo_final y publicado en Lote.
import { Lote, Especie, Tipo } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { lotesPorPublicar } from '../services/loteService.js';
import { publicarLote, despublicarLote, calcularOferta, ErrorPublicacion } from '../services/publicacionService.js';
import { entero, texto } from '../helpers/utilidades.js';

const conEspecies = {
    include: [{ model: Especie, as: 'especies', include: [{ model: Tipo, as: 'tipo' }] }],
    order: [['id_lte', 'ASC'], [{ model: Especie, as: 'especies' }, 'id_epe', 'ASC']]
};

// GET /ventas/administrar  (lotes DISPONIBLES: pendientes de publicar y publicados; buscador por número de lote)
const administrar = async (req, res) => {
    const buscar = texto(req.query.id_lte).slice(0, 9);
    const where = { estado: 'DISPONIBLE' };
    if (buscar) where.id_lte = entero(buscar) || 0;
    const lotes = await Lote.findAll({ where, ...conEspecies });
    const fila = (l) => ({ lote: l, ...calcularOferta(l) });
    res.render('ventas/administrar', {
        pagina: 'Gestión de ventas', seccion: 'ventas', buscar,
        pendientes: lotes.filter((l) => !l.publicado).map(fila),
        publicados: lotes.filter((l) => l.publicado).map(fila)
    });
};

const renderNueva = async (res, { datos, errores = null, status = 200 }) => {
    const lotes = await lotesPorPublicar();
    const lote = lotes.find((l) => String(l.id_lte) === String(datos.id_lte)) || null;
    res.status(status).render('ventas/nueva', {
        pagina: 'Nueva venta', seccion: 'ventas', datos, errores, lotes, lote,
        oferta: lote ? calcularOferta(lote, datos.precio_kilo_final) : null
    });
};

// GET /ventas/nueva?id_lte=  (seleccionar lote y capturar el precio final)
const formularioNueva = (req, res) => renderNueva(res, {
    datos: { id_lte: entero(req.query.id_lte) ? String(entero(req.query.id_lte)) : '', precio_kilo_final: '' }
});

// POST /ventas/publicar
const publicar = async (req, res) => {
    const datos = { id_lte: texto(req.body.id_lte), precio_kilo_final: texto(req.body.precio_kilo_final) };
    const errores = obtenerErrores(req);
    if (errores) return renderNueva(res, { datos, errores, status: 400 });
    try {
        await publicarLote(Number(datos.id_lte), datos.precio_kilo_final);
        return res.redirect('/ventas/administrar?msg=lote-publicado');
    } catch (error) {
        if (error instanceof ErrorPublicacion) {
            return renderNueva(res, { datos, errores: { [error.campo]: error.message }, status: 409 });
        }
        throw error;
    }
};

// POST /ventas/:id/despublicar  (retira del catálogo sin borrar el lote)
const despublicar = async (req, res, next) => {
    const id = entero(req.params.id);
    const resultado = id ? await despublicarLote(id) : null;
    if (resultado === null) return next();
    res.redirect(resultado ? '/ventas/administrar?msg=lote-despublicado' : '/ventas/administrar?error=lote-no-despublicable');
};

export { administrar, formularioNueva, publicar, despublicar };
