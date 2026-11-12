import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import db from '../config/db.js';

export const ROLES = ['ADMINISTRADOR', 'EMPLEADO'];

// Tabla adicional acordada: solo personal autorizado (sin relación con Comprador)
const Usuario = db.define('usuario', {
    id_usuario: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre_usuario: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    rol: { type: DataTypes.ENUM(...ROLES), allowNull: false, defaultValue: 'EMPLEADO' },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
    hooks: {
        beforeCreate: async (usuario) => {
            usuario.password = await bcrypt.hash(usuario.password, 12);
        },
        beforeUpdate: async (usuario) => {
            if (usuario.changed('password')) {
                usuario.password = await bcrypt.hash(usuario.password, 12);
            }
        }
    },
    // Nunca exponer el hash: para el login se usa Usuario.unscoped()
    defaultScope: { attributes: { exclude: ['password'] } }
});

Usuario.prototype.verificarPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

export default Usuario;
