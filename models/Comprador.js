import { DataTypes } from 'sequelize';
import db from '../config/db.js';

// Los compradores NO tienen cuenta: solo son datos para registrar compras
const Comprador = db.define('comprador', {
    codigo_cpr: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    apellido_paterno: { type: DataTypes.STRING(100), allowNull: false },
    apellido_materno: { type: DataTypes.STRING(100), allowNull: true },
    direccion: { type: DataTypes.STRING(255), allowNull: false },
    correo: { type: DataTypes.STRING(150), allowNull: true }
});

export default Comprador;
