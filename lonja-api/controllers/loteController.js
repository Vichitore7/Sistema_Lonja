import { db, Lote, Especie, Tipo } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { consultarLotes, leerFiltros, opcionesFiltros, buscarLoteCompleto } from '../services/loteService.js';
import { calcularOferta } from '../services/publicacionService.js';
import { validarImagen, guardarImagen, borrarImagen } from '../helpers/imagenes.js';
import { paginar, entero, texto } from '../helpers/utilidades.js';
import { noExiste } from '../middleware/errores.js';
import { hoyISO, fechaISO, esFechaISO } from '../helpers/formatos.js';

const MAX_ESPECIES = 20;

// ---------- Utilidades internas ----------

// Las especies llegan como especies[ref][nombre], especies[ref][id_tpo], especies[ref][id_epe]
// y su imagen opcional en el campo de archivo imagen_<ref>
const leerEspecies = (req) => {
    const lista = Object.values(req.body.especies || {});
    const archivos = new Map((req.files || []).map((a) => [a.fieldname, a]));
    return lista.slice(0, MAX_ESPECIES + 1).map((e) => {
        const ref = String(e.ref || '').replace(/\D/g, '');
        return {
            ref,
            id_epe: entero(e.id_epe),
            nombre: texto(e.nombre).slice(0, 101),
            id_tpo: entero(e.id_tpo),
            archivo: archivos.get(`imagen_${ref}`) || null
        };
    });
};

// Valida la lista de especies; devuelve un mensaje o null
const validarEspecies = async (especies) => {
    if (especies.length === 0) return 'Agrega al menos una especie al lote.';
    if (especies.length > MAX_ESPECIES) return `Un lote puede tener máximo ${MAX_ESPECIES} especies.`;
    const tiposValidos = new Set((await Tipo.findAll({ attributes: ['id_tpo'], raw: true })).map((t) => t.id_tpo));
    for (const e of especies) {
        if (!e.nombre) return 'Cada especie necesita un nombre.';
        if (e.nombre.length > 100) return 'El nombre de la especie admite máximo 100 caracteres.';
        if (!tiposValidos.has(e.id_tpo)) return `Selecciona un tipo válido para "${e.nombre}".`;
        const errorImagen = validarImagen(e.archivo);
        if (errorImagen) return errorImagen;
    }
    return null;
};

// La fecha de registro no puede ser futura. Si es hoy se guarda la hora actual.
const convertirFecha = (iso) => (iso === hoyISO() ? new Date() : new Date(`${iso}T12:00:00-06:00`));

const datosFormulario = (body) => ({
    kilos: texto(body.kilos),
    numero_cajas: texto(body.numero_cajas),
    precio_kilo_salida: texto(body.precio_kilo_salida),
    fecha: texto(body.fecha)
});

// 400 con los errores y los datos normalizados para que el cliente vuelva a mostrar el formulario
const formularioInvalido = (res, { datos, especies, errores = null, errorEspecies = null }) =>
    res.status(400).json({
        error: errorEspecies || 'Revisa los datos del formulario.',
        errores, errorEspecies, datos,
        // Las imágenes nuevas no se pueden conservar si falla la validación
        especies: especies.map((e) => ({ ref: e.ref, id_epe: e.id_epe, nombre: e.nombre, id_tpo: e.id_tpo, imagen: e.imagen || null }))
    });

const conflicto = (res, codigo) => res.status(409).json({
    codigo,
    error: codigo === 'lote-publicado'
        ? 'El lote está a la venta. Retíralo del catálogo en Gestión de ventas antes de editarlo.'
        : 'Solo se pueden editar o retirar lotes con estado Disponible.'
});

// Revisa errores comunes de alta y edición
const revisarFormulario = async (req, especies) => {
    const errores = obtenerErrores(req) || {};
    if (!errores.fecha && esFechaISO(req.body.fecha) && req.body.fecha > hoyISO()) errores.fecha = 'La fecha no puede ser futura';
    const errorEspecies = await validarEspecies(especies);
    return { errores: Object.keys(errores).length ? errores : null, errorEspecies };
};

// ---------- Acciones ----------

// GET /api/lotes?buscar=&estado=&especie=&id_tpo=&kg_min=&kg_max=&publicado=&pagina=
// (Inventario del Administrador y del Empleado, y la sección Lotes del Administrador)
const listar = async (req, res) => {
    const filtros = leerFiltros(req.query);
    const { pagina, limit, offset } = paginar(req.query);
    const [{ lotes, total }, opciones] = await Promise.all([consultarLotes(filtros, { limit, offset }), opcionesFiltros()]);
    res.json({ lotes, total, pagina, filtros, ...opciones });
};

// POST /api/lotes  (multipart/form-data: datos del lote, especies[ref][...] e imagen_<ref>)
const crear = async (req, res) => {
    const datos = datosFormulario(req.body);
    const especies = leerEspecies(req).map((e) => ({ ...e, id_epe: null }));
    const { errores, errorEspecies } = await revisarFormulario(req, especies);
    if (errores || errorEspecies) return formularioInvalido(res, { datos, especies, errores, errorEspecies });

    // Primero se guardan las imágenes; si la transacción falla se borran
    const imagenes = [];
    let id_lte;
    try {
        for (const e of especies) e.imagen = e.archivo ? await guardarImagen(e.archivo) : null;
        imagenes.push(...especies.map((e) => e.imagen).filter(Boolean));

        await db.transaction(async (t) => {
            const lote = await Lote.create({
                kilos: datos.kilos,
                numero_cajas: datos.numero_cajas,
                precio_kilo_salida: datos.precio_kilo_salida,
                fecha: convertirFecha(datos.fecha),
                // Un lote nuevo inicia DISPONIBLE y sin publicar: el precio final se fija al ponerlo a la venta
                estado: 'DISPONIBLE',
                publicado: false,
                precio_kilo_final: null
            }, { transaction: t });
            id_lte = lote.id_lte;
            await Especie.bulkCreate(
                especies.map((e) => ({ nombre: e.nombre, id_tpo: e.id_tpo, imagen: e.imagen, id_lte: lote.id_lte })),
                { transaction: t }
            );
        });
    } catch (error) {
        await Promise.all(imagenes.map(borrarImagen));
        throw error;
    }
    return res.status(201).json({ id_lte });
};

// GET /api/lotes/:id  (Administrador y Empleado) -> { lote, oferta }
const detalle = async (req, res) => {
    const id = entero(req.params.id);
    const lote = id && await buscarLoteCompleto(id);
    if (!lote) return noExiste(res, 'Lote no encontrado');
    res.json({ lote, oferta: calcularOferta(lote) });
};

// Busca un lote que se pueda editar: DISPONIBLE y sin publicar.
// Un lote a la venta no cambia de kilos ni de precios: primero se retira del catálogo
// (Gestión de ventas) y después se vuelve a publicar. Un lote vendido nunca se edita.
const loteEditable = async (req, res) => {
    const id = entero(req.params.id);
    const lote = id && await Lote.findByPk(id, {
        include: [{ model: Especie, as: 'especies' }],
        order: [[{ model: Especie, as: 'especies' }, 'id_epe', 'ASC']]
    });
    if (!lote) { noExiste(res, 'Lote no encontrado'); return null; }
    if (lote.estado !== 'DISPONIBLE') { conflicto(res, 'lote-no-disponible'); return null; }
    if (lote.publicado) { conflicto(res, 'lote-publicado'); return null; }
    return lote;
};

// PUT /api/lotes/:id  (multipart/form-data, igual que el alta)
const editar = async (req, res) => {
    const lote = await loteEditable(req, res);
    if (!lote) return;

    const datos = datosFormulario(req.body);
    const actuales = new Map(lote.especies.map((e) => [e.id_epe, e]));
    // Solo se aceptan id_epe que pertenecen a ESTE lote (evita modificar especies ajenas)
    const especies = leerEspecies(req).map((e) => {
        const existente = e.id_epe && actuales.get(e.id_epe);
        return { ...e, id_epe: existente ? e.id_epe : null, imagen: existente ? existente.imagen : null };
    });
    const { errores, errorEspecies } = await revisarFormulario(req, especies);
    if (errores || errorEspecies) return formularioInvalido(res, { datos, especies, errores, errorEspecies });

    const conservadas = new Set(especies.filter((e) => e.id_epe).map((e) => e.id_epe));
    const eliminadas = lote.especies.filter((e) => !conservadas.has(e.id_epe));
    const nuevasImagenes = [];
    try {
        for (const e of especies) {
            if (e.archivo) {
                e.imagenAnterior = e.imagen;
                e.imagen = await guardarImagen(e.archivo);
                nuevasImagenes.push(e.imagen);
            }
        }
        await db.transaction(async (t) => {
            // Se vuelve a comprobar el estado dentro de la transacción
            const bloqueado = await Lote.findByPk(lote.id_lte, { transaction: t, lock: t.LOCK.UPDATE });
            if (bloqueado.estado !== 'DISPONIBLE') throw new Error('LOTE_NO_DISPONIBLE');
            if (bloqueado.publicado) throw new Error('LOTE_PUBLICADO');

            await bloqueado.update({
                kilos: datos.kilos,
                numero_cajas: datos.numero_cajas,
                precio_kilo_salida: datos.precio_kilo_salida,
                fecha: datos.fecha === fechaISO(lote.fecha) ? lote.fecha : convertirFecha(datos.fecha)
            }, { transaction: t });

            if (eliminadas.length) {
                await Especie.destroy({ where: { id_epe: eliminadas.map((e) => e.id_epe), id_lte: lote.id_lte }, transaction: t });
            }
            for (const e of especies) {
                if (e.id_epe) {
                    await Especie.update({ nombre: e.nombre, id_tpo: e.id_tpo, imagen: e.imagen },
                        { where: { id_epe: e.id_epe, id_lte: lote.id_lte }, transaction: t });
                } else {
                    await Especie.create({ nombre: e.nombre, id_tpo: e.id_tpo, imagen: e.imagen, id_lte: lote.id_lte }, { transaction: t });
                }
            }
        });
    } catch (error) {
        await Promise.all(nuevasImagenes.map(borrarImagen));
        if (error.message === 'LOTE_NO_DISPONIBLE') return conflicto(res, 'lote-no-disponible');
        if (error.message === 'LOTE_PUBLICADO') return conflicto(res, 'lote-publicado');
        throw error;
    }

    // Después de confirmar, se borran los archivos que ya no se usan
    await Promise.all([
        ...eliminadas.map((e) => borrarImagen(e.imagen)),
        ...especies.filter((e) => e.imagenAnterior).map((e) => borrarImagen(e.imagenAnterior))
    ]);
    return res.json({ id_lte: lote.id_lte });
};

// PATCH /api/lotes/:id/retirar  (no se elimina: pasa a RETIRADO y sale del catálogo;
// si estuvo publicado conserva su precio_kilo_final como dato histórico)
const retirar = async (req, res) => {
    const id = entero(req.params.id);
    const [actualizados] = id ? await Lote.update({ estado: 'RETIRADO', publicado: false }, { where: { id_lte: id, estado: 'DISPONIBLE' } }) : [0];
    if (!actualizados) {
        return id && (await Lote.findByPk(id)) ? conflicto(res, 'lote-no-disponible') : noExiste(res, 'Lote no encontrado');
    }
    return res.json({ id_lte: id, estado: 'RETIRADO' });
};

export { listar, crear, detalle, editar, retirar };
