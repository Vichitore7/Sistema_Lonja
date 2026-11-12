import { DataTypes } from 'sequelize';
import db from '../config/db.js';

// Cada especie registrada pertenece a un solo lote (el nombre se puede repetir en otros lotes).
// Sin columna kilos. id_lte e id_tpo se crean como FK en models/index.js
const Especie = db.define('especie', {
    id_epe: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    imagen: { type: DataTypes.STRING(255), allowNull: true }
});

export default Especie;
