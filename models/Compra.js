import { DataTypes } from 'sequelize';
import db from '../config/db.js';

// codigo_cpr e id_lte (FK, UNIQUE, NOT NULL) se crean en models/index.js
const Compra = db.define('compra', {
    id_cmp: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    precio_kilo_final: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    precio_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
});

export default Compra;
