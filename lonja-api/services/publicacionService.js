// Publicación administrativa: poner un lote a la venta NO crea una Compra.
// Solo guarda Lote.precio_kilo_final y Lote.publicado = true.
import { db, Lote, Compra } from '../models/index.js';
import { calcularTotal } from '../helpers/formatos.js';

export class ErrorPublicacion extends Error {
    constructor(campo, mensaje) {
        super(mensaje);
        this.campo = campo;
    }
}

// Cálculos económicos (manual 4.1). La diferencia es una estimación comercial, no utilidad neta.
export const calcularOferta = (lote, precioFinal = lote.precio_kilo_final) => {
    const valorSalida = calcularTotal(lote.kilos, lote.precio_kilo_salida);
    if (!(Number(precioFinal) > 0)) return { valorSalida, totalOferta: null, diferencia: null };
    const totalOferta = calcularTotal(lote.kilos, precioFinal);
    return { valorSalida, totalOferta, diferencia: Math.round((totalOferta - valorSalida) * 100) / 100 };
};

export const publicarLote = (id_lte, precio_kilo_final) => db.transaction(async (t) => {
    const precio = Number(precio_kilo_final);
    if (!(precio > 0)) throw new ErrorPublicacion('precio_kilo_final', 'El precio final debe ser mayor que 0');

    const lote = await Lote.findByPk(id_lte, { transaction: t, lock: t.LOCK.UPDATE });
    if (!lote) throw new ErrorPublicacion('id_lte', 'El lote no existe');
    if (lote.estado !== 'DISPONIBLE') throw new ErrorPublicacion('id_lte', 'Solo se pueden poner a la venta lotes con estado Disponible');
    if (lote.publicado) throw new ErrorPublicacion('id_lte', 'El lote ya está a la venta; retíralo del catálogo para cambiar su precio');
    if (await Compra.count({ where: { id_lte: lote.id_lte }, transaction: t })) {
        throw new ErrorPublicacion('id_lte', 'El lote ya tiene una compra registrada');
    }

    return lote.update({ precio_kilo_final: precio.toFixed(2), publicado: true }, { transaction: t });
});

// Retira la oferta del catálogo sin borrar el lote. Solo si sigue DISPONIBLE (no vendido).
// El lote vuelve a la etapa "Registrado": sin publicar y sin precio final.
export const despublicarLote = (id_lte) => db.transaction(async (t) => {
    const lote = await Lote.findByPk(id_lte, { transaction: t, lock: t.LOCK.UPDATE });
    if (!lote) return null;
    if (lote.estado !== 'DISPONIBLE' || !lote.publicado) return false;
    await lote.update({ publicado: false, precio_kilo_final: null }, { transaction: t });
    return true;
});
