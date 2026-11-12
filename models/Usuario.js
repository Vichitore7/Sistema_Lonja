import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import db from '../config/db.js';

export const ROLES = ['ADMINISTRADOR', 'EMPLEADO', 'COMPRADOR'];
export const ROLES_PERSONAL = ['ADMINISTRADOR', 'EMPLEADO'];

// Cuentas del sistema: personal (ADMINISTRADOR / EMPLEADO) y compradores (COMPRADOR).
// Una cuenta COMPRADOR se liga a su registro de Comprador con codigo_cpr (FK en models/index.js)
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
    validate: {
        // COMPRADOR siempre ligado a un comprador; el personal nunca
        rolYComprador() {
            const codigo = this.codigo_cpr ?? null;
            if (this.rol === 'COMPRADOR' && !codigo) throw new Error('Una cuenta COMPRADOR necesita codigo_cpr');
            if (this.rol !== 'COMPRADOR' && codigo) throw new Error('Las cuentas del personal no llevan codigo_cpr');
        }
    },
    // Nunca exponer el hash: para el login se usa Usuario.unscoped()
    defaultScope: { attributes: { exclude: ['password'] } }
});

Usuario.prototype.verificarPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

export default Usuario;
