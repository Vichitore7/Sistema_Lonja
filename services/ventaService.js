// Compra inmediata de un lote publicado: crea la Compra y marca el Lote como VENDIDO en UNA transacción.
// El precio NUNCA llega del navegador: se toma de Lote.precio_kilo_final, fijado por el Administrador.
import { UniqueConstraintError } from 'sequelize';
import { db, Lote, Comprador, Compra, Usuario } from '../models/index.js';
import { calcularTotal } from '../helpers/formatos.js';

// codigo: 'agotado' | 'retirada' | 'precio' | 'cuenta'  (mensajes en helpers/mensajes.js)
export class ErrorVenta extends Error {
    constructor(codigo, mensaje) {
        super(mensaje);
        this.codigo = codigo;
    }
}

// `fecha` solo la usan los scripts de datos de prueba para simular compras de días anteriores;
// la ruta POST /catalogo/:id/comprar nunca la envía, así que siempre es la fecha real de la compra.
export const comprarLote = async (codigo_cpr, id_lte, { fecha = new Date() } = {}) => {
    try {
        return await db.transaction(async (t) => {
            // El comprador sale de la cuenta autenticada; se vuelve a comprobar que siga activa
            const cuenta = await Usuario.findOne({ where: { codigo_cpr, rol: 'COMPRADOR', activo: true }, transaction: t });
            const comprador = cuenta && await Comprador.findByPk(codigo_cpr, { transaction: t });
            if (!comprador) throw new ErrorVenta('cuenta', 'La cuenta no puede comprar');

            // SELECT ... FOR UPDATE: bloquea la fila del lote; dos compras simultáneas pasan de una en una
            const lote = await Lote.findByPk(id_lte, { transaction: t, lock: t.LOCK.UPDATE });
            if (!lote || lote.estado === 'VENDIDO') throw new ErrorVenta('agotado', 'Este lote ya no está disponible');
            if (lote.estado !== 'DISPONIBLE' || !lote.publicado) throw new ErrorVenta('retirada', 'La oferta fue retirada');
            const precio = Number(lote.precio_kilo_final);
            if (!(precio > 0)) throw new ErrorVenta('precio', 'El lote no tiene un precio válido');

            // El total SIEMPRE se calcula en el servidor con los kilos y el precio final actuales
            const compra = await Compra.create({
                codigo_cpr: comprador.codigo_cpr,
                id_lte: lote.id_lte,
                precio_kilo_final: precio.toFixed(2),
                precio_total: calcularTotal(lote.kilos, precio).toFixed(2),
                fecha
            }, { transaction: t });

            await lote.update({ estado: 'VENDIDO' }, { transaction: t });
            return compra;
        });
    } catch (error) {
        // Compra.id_lte es UNIQUE: última barrera contra la doble venta (la transacción ya se revirtió)
        if (error instanceof UniqueConstraintError) throw new ErrorVenta('agotado', 'Este lote ya no está disponible');
        throw error;
    }
};
