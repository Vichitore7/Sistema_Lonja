// Registro atómico de una venta: crea la Compra y marca el Lote como VENDIDO en UNA transacción
import { UniqueConstraintError } from 'sequelize';
import { db, Lote, Comprador, Compra } from '../models/index.js';
import { calcularTotal } from '../helpers/formatos.js';

export class ErrorVenta extends Error {
    constructor(campo, mensaje) {
        super(mensaje);
        this.campo = campo;
    }
}

export const crearVentaEnTransaccion = async ({ codigo_cpr, id_lte, precio_kilo_final }) => {
    try {
        return await db.transaction(async (t) => {
            const comprador = await Comprador.findByPk(codigo_cpr, { transaction: t });
            if (!comprador) throw new ErrorVenta('codigo_cpr', 'No existe un comprador con ese código');

            // Bloquea la fila del lote hasta terminar: dos ventas simultáneas no pueden pasar a la vez
            const lote = await Lote.findByPk(id_lte, { transaction: t, lock: t.LOCK.UPDATE });
            if (!lote) throw new ErrorVenta('id_lte', 'El lote no existe');
            if (lote.estado !== 'DISPONIBLE') throw new ErrorVenta('id_lte', 'El lote ya no está disponible');

            const precio = Number(precio_kilo_final);
            if (!(precio > 0)) throw new ErrorVenta('precio_kilo_final', 'El precio final debe ser mayor que 0');

            // El total SIEMPRE se recalcula en el servidor
            const compra = await Compra.create({
                codigo_cpr: comprador.codigo_cpr,
                id_lte: lote.id_lte,
                precio_kilo_final: precio.toFixed(2),
                precio_total: calcularTotal(lote.kilos, precio).toFixed(2),
                fecha: new Date()
            }, { transaction: t });

            await lote.update({ estado: 'VENDIDO' }, { transaction: t });
            return compra;
        });
    } catch (error) {
        // Compra.id_lte es UNIQUE: última barrera contra la doble venta
        if (error instanceof UniqueConstraintError) throw new ErrorVenta('id_lte', 'El lote ya fue vendido');
        throw error;
    }
};
