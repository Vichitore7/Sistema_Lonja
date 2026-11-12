// Preparación inicial del sistema (se ejecuta UNA vez al instalar): npm run instalar
// 1) crea la base de datos si no existe  2) crea las tablas que falten (sin force ni alter)
// 3) crea el administrador inicial con ADMIN_USER / ADMIN_PASSWORD del .env
import mariadb from 'mariadb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const { BD_NOMBRE, BD_USUARIO, BD_CLAVE, BD_HOST, BD_PORT, ADMIN_USER, ADMIN_PASSWORD } = process.env;

try {
    if (!/^[A-Za-z0-9_]+$/.test(BD_NOMBRE || '')) throw new Error('BD_NOMBRE inválido en .env');

    const conexion = await mariadb.createConnection({ host: BD_HOST, port: Number(BD_PORT), user: BD_USUARIO, password: BD_CLAVE });
    await conexion.query(`CREATE DATABASE IF NOT EXISTS \`${BD_NOMBRE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conexion.end();
    console.log(`Base de datos lista: ${BD_NOMBRE}`);

    const { db, Usuario } = await import('../models/index.js');
    await db.sync(); // solo crea tablas inexistentes; nunca borra ni altera datos
    console.log('Tablas: lote, especie, tipo, comprador, compra, usuario');

    const hayAdmin = await Usuario.count({ where: { rol: 'ADMINISTRADOR' } });
    if (hayAdmin) {
        console.log('Ya existe un administrador; no se crea otro.');
    } else {
        if (!ADMIN_USER || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
            throw new Error('Define ADMIN_USER y ADMIN_PASSWORD (mínimo 8 caracteres) en .env');
        }
        await Usuario.create({ nombre_usuario: ADMIN_USER, password: ADMIN_PASSWORD, rol: 'ADMINISTRADOR', activo: true });
        console.log(`Administrador inicial creado: ${ADMIN_USER}`);
    }
    await db.close();
} catch (error) {
    console.error('Error en la instalación:', error.message);
    process.exit(1);
}
