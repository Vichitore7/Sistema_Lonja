import { db, Lote, Especie, Tipo } from '../models/index.js';
import { obtenerErrores } from '../middleware/validar.js';
import { consultarLotes, leerFiltros, opcionesFiltros, buscarLoteCompleto } from '../services/loteService.js';
import { validarImagen, guardarImagen, borrarImagen } from '../helpers/imagenes.js';
import { paginar, datosPaginacion, entero, texto } from '../helpers/utilidades.js';
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

const renderFormulario = async (res, { lote = null, datos, especies, errores = null, errorEspecies = null, status = 200 }) => {
    const tipos = await Tipo.findAll({ order: [['nombre', 'ASC']] });
    res.status(status).render('lotes/formulario', {
        pagina: lote ? `Editar lote ${String(lote.id_lte).padStart(3, '0')}` : 'Nuevo lote',
        seccion: 'lotes',
        lote, datos, tipos, errores, errorEspecies,
        hoy: hoyISO(),
        // Las imágenes nuevas no se pueden conservar si falla la validación
        especies: especies.map((e) => ({ ref: e.ref, id_epe: e.id_epe, nombre: e.nombre, id_tpo: e.id_tpo, imagen: e.imagen || null }))
    });
};

// Revisa errores comunes de alta y edición
const revisarFormulario = async (req, especies) => {
    const errores = obtenerErrores(req) || {};
    if (!errores.fecha && esFechaISO(req.body.fecha) && req.body.fecha > hoyISO()) errores.fecha = 'La fecha no puede ser futura';
    const errorEspecies = await validarEspecies(especies);
    return { errores: Object.keys(errores).length ? errores : null, errorEspecies };
};

// ---------- Acciones ----------

// GET /lotes  (solo Administrador)
const listar = async (req, res) => {
    const filtros = leerFiltros(req.query);
    const { pagina, limit, offset } = paginar(req.query);
    const [{ lotes, total }, opciones] = await Promise.all([consultarLotes(filtros, { limit, offset }), opcionesFiltros()]);
    res.render('lotes/index', {
        pagina: 'Lotes', seccion: 'lotes',
        lotes, filtros, ...opciones,
        paginacion: datosPaginacion(total, pagina, req.query)
    });
};

// GET /lotes/nuevo
const formularioNuevo = (req, res) =>
    renderFormulario(res, { datos: { fecha: hoyISO() }, especies: [] });

// POST /lotes
const crear = async (req, res) => {
    const datos = datosFormulario(req.body);
    const especies = leerEspecies(req).map((e) => ({ ...e, id_epe: null }));
    const { errores, errorEspecies } = await revisarFormulario(req, especies);
    if (errores || errorEspecies) return renderFormulario(res, { datos, especies, errores, errorEspecies, status: 400 });

    // Primero se guardan las imágenes; si la transacción falla se borran
    const imagenes = [];
    try {
        for (const e of especies) e.imagen = e.archivo ? await guardarImagen(e.archivo) : null;
        imagenes.push(...especies.map((e) => e.imagen).filter(Boolean));

        await db.transaction(async (t) => {
            const lote = await Lote.create({
                kilos: datos.kilos,
                numero_cajas: datos.numero_cajas,
                precio_kilo_salida: datos.precio_kilo_salida,
                fecha: convertirFecha(datos.fecha),
                estado: 'DISPONIBLE'
            }, { transaction: t });
            await Especie.bulkCreate(
                especies.map((e) => ({ nombre: e.nombre, id_tpo: e.id_tpo, imagen: e.imagen, id_lte: lote.id_lte })),
                { transaction: t }
            );
        });
    } catch (error) {
        await Promise.all(imagenes.map(borrarImagen));
        throw error;
    }
    return res.redirect('/lotes?msg=lote-creado');
};

// GET /lotes/:id  (Administrador y Empleado)
const detalle = async (req, res, next) => {
    const id = entero(req.params.id);
    const lote = id && await buscarLoteCompleto(id);
    if (!lote) return next();
    const desde = req.query.desde === 'inventario' || req.usuario.rol !== 'ADMINISTRADOR' ? 'inventario' : 'lotes';
    res.render('lotes/detalle', { pagina: `Lote ${String(lote.id_lte).padStart(3, '0')}`, seccion: desde, lote, desde });
};

// Busca un lote DISPONIBLE para editar o retirar
const loteEditable = async (req, res, next) => {
    const id = entero(req.params.id);
    const lote = id && await Lote.findByPk(id, {
        include: [{ model: Especie, as: 'especies' }],
        order: [[{ model: Especie, as: 'especies' }, 'id_epe', 'ASC']]
    });
    if (!lote) { next(); return null; }
    if (lote.estado !== 'DISPONIBLE') { res.redirect(`/lotes/${lote.id_lte}?error=lote-no-disponible`); return null; }
    return lote;
};

// GET /lotes/:id/editar
const formularioEditar = async (req, res, next) => {
    const lote = await loteEditable(req, res, next);
    if (!lote) return;
    const datos = {
        kilos: Number(lote.kilos).toFixed(2),
        numero_cajas: String(lote.numero_cajas),
        precio_kilo_salida: Number(lote.precio_kilo_salida).toFixed(2),
        fecha: fechaISO(lote.fecha)
    };
    const especies = lote.especies.map((e, i) => ({ ref: String(i + 1), id_epe: e.id_epe, nombre: e.nombre, id_tpo: e.id_tpo, imagen: e.imagen }));
    return renderFormulario(res, { lote, datos, especies });
};

// POST /lotes/:id/editar
const editar = async (req, res, next) => {
    const lote = await loteEditable(req, res, next);
    if (!lote) return;

    const datos = datosFormulario(req.body);
    const actuales = new Map(lote.especies.map((e) => [e.id_epe, e]));
    // Solo se aceptan id_epe que pertenecen a ESTE lote (evita modificar especies ajenas)
    const especies = leerEspecies(req).map((e) => {
        const existente = e.id_epe && actuales.get(e.id_epe);
        return { ...e, id_epe: existente ? e.id_epe : null, imagen: existente ? existente.imagen : null };
    });
    const { errores, errorEspecies } = await revisarFormulario(req, especies);
    if (errores || errorEspecies) return renderFormulario(res, { lote, datos, especies, errores, errorEspecies, status: 400 });

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
        if (error.message === 'LOTE_NO_DISPONIBLE') return res.redirect(`/lotes/${lote.id_lte}?error=lote-no-disponible`);
        throw error;
    }

    // Después de confirmar, se borran los archivos que ya no se usan
    await Promise.all([
        ...eliminadas.map((e) => borrarImagen(e.imagen)),
        ...especies.filter((e) => e.imagenAnterior).map((e) => borrarImagen(e.imagenAnterior))
    ]);
    return res.redirect(`/lotes/${lote.id_lte}?msg=lote-editado`);
};

// POST /lotes/:id/retirar  (no se elimina: pasa a RETIRADO)
const retirar = async (req, res, next) => {
    const id = entero(req.params.id);
    if (!id) return next();
    const [actualizados] = await Lote.update({ estado: 'RETIRADO' }, { where: { id_lte: id, estado: 'DISPONIBLE' } });
    if (!actualizados) {
        return (await Lote.findByPk(id)) ? res.redirect(`/lotes/${id}?error=lote-no-disponible`) : next();
    }
    return res.redirect('/lotes?msg=lote-retirado');
};

export { listar, formularioNuevo, crear, detalle, formularioEditar, editar, retirar };
