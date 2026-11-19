import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const db = new Sequelize(process.env.BD_NOMBRE, process.env.BD_USUARIO, process.env.BD_CLAVE, {
    dialect: process.env.BD_DIALEC || 'mariadb',
    host: process.env.BD_HOST,
    port: process.env.BD_PORT,
    // Hora de México (Veracruz, UTC-6 sin horario de verano) para fechas de compras y reportes
    timezone: '-06:00',
    define: {
        timestamps: false,
        underscored: false,
        freezeTableName: true
    },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    logging: false
});

export default db;
