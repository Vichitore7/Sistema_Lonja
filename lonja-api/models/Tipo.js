import { DataTypes } from 'sequelize';
import db from '../config/db.js';

// Tabla original del PDF: solo id_tpo y nombre
const Tipo = db.define('tipo', {
    id_tpo: { type: DataTypes.SMALLINT, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false }
});

export default Tipo;
