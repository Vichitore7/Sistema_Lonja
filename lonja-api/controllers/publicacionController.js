// Gestión de ventas (solo ADMINISTRADOR): poner lotes a la venta y retirarlos del catálogo.
// Publicar NO crea una Compra: solo guarda precio_kilo_final y publicado en Lote.
import { Lote, Especie, Tipo } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { noExiste } from '../middleware/errores.js';
import { lotesPorPublicar } from '../services/loteService.js';
import { publicarLote, despublicarLote, calcularOferta, ErrorPublicacion } from '../services/publicacionService.js';
import { entero, texto } from '../helpers/utilidades.js';

const conEspecies = {
    include: [{ model: Especie, as: 'especies', include: [{ model: Tipo, as: 'tipo' }] }],
    order: [['id_lte', 'ASC'], [{ model: Especie, as: 'especies' }, 'id_epe', 'ASC']]
};

// GET /api/ventas?id_lte=  (lotes DISPONIBLES: pendientes de publicar y publicados)
const administrar = async (req, res) => {
    const buscar = texto(req.query.id_lte).slice(0, 9);
    const where = { estado: 'DISPONIBLE' };
    if (buscar) where.id_lte = entero(buscar) || 0;
    const lotes = await Lote.findAll({ where, ...conEspecies });
    const fila = (l) => ({ lote: l, ...calcularOferta(l) });
    res.json({
        buscar,
        pendientes: lotes.filter((l) => !l.publicado).map(fila),
        publicados: lotes.filter((l) => l.publicado).map(fila)
    });
};

// GET /api/ventas/por-publicar?id_lte=&precio_kilo_final=
// Lotes que se pueden poner a la venta y, si se elige uno, la vista previa de la oferta
const porPublicar = async (req, res) => {
    const lotes = await lotesPorPublicar();
    const id = entero(req.query.id_lte);
    const lote = (id && lotes.find((l) => l.id_lte === id)) || null;
    res.json({ lotes, lote, oferta: lote ? calcularOferta(lote, texto(req.query.precio_kilo_final)) : null });
};

// POST /api/ventas/publicar  { id_lte, precio_kilo_final }
const publicar = async (req, res) => {
    const errores = obtenerErrores(req);
    if (errores) return res.status(400).json({ error: 'Revisa los datos del formulario.', errores });
    try {
        const lote = await publicarLote(Number(texto(req.body.id_lte)), texto(req.body.precio_kilo_final));
        return res.json({ id_lte: lote.id_lte, publicado: true, precio_kilo_final: lote.precio_kilo_final });
    } catch (error) {
        if (error instanceof ErrorPublicacion) {
            return res.status(409).json({ error: error.message, errores: { [error.campo]: error.message } });
        }
        throw error;
    }
};

// PATCH /api/ventas/:id/despublicar  (retira del catálogo sin borrar el lote)
const despublicar = async (req, res) => {
    const id = entero(req.params.id);
    const resultado = id ? await despublicarLote(id) : null;
    if (resultado === null) return noExiste(res, 'Lote no encontrado');
    if (!resultado) {
        return res.status(409).json({ error: 'Solo se pueden retirar del catálogo lotes disponibles que estén a la venta.', codigo: 'lote-no-despublicable' });
    }
    res.json({ id_lte: id, publicado: false });
};

export { administrar, porPublicar, publicar, despublicar };
