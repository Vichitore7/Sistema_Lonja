import { DataTypes } from 'sequelize';
import db from '../config/db.js';

export const ESTADOS_LOTE = ['DISPONIBLE', 'VENDIDO', 'RETIRADO'];

const Lote = db.define('lote', {
    id_lte: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    kilos: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    numero_cajas: { type: DataTypes.INTEGER, allowNull: false },
    precio_kilo_salida: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    // Añadido acordado: un lote nuevo inicia DISPONIBLE
    estado: { type: DataTypes.ENUM(...ESTADOS_LOTE), allowNull: false, defaultValue: 'DISPONIBLE' },
    // Las dos columnas nuevas autorizadas: el Administrador pone el lote a la venta (publicado)
    // y fija el precio de venta por kg (precio_kilo_final). NULL mientras no se publique.
    publicado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    precio_kilo_final: { type: DataTypes.DECIMAL(10, 2), allowNull: true }
});

export default Lote;
