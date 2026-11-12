// Migración controlada de tablas que ya existían (manual v2.0, sección 12).
// db.sync() solo crea tablas nuevas, así que aquí se agregan las columnas y restricciones faltantes.
// Es seguro ejecutarlo varias veces: revisa el esquema real, solo cambia lo que hace falta
// y nunca borra datos. Antes de ejecutarlo en datos reales, respalda la base (ver README).
import { QueryTypes } from 'sequelize';

const uno = async (db, sql) => (await db.query(sql, { type: QueryTypes.SELECT }))[0];

export const migrar = async (db) => {
    const qi = db.getQueryInterface();

    // ---------- Lote: las dos únicas columnas nuevas autorizadas ----------
    const lote = await qi.describeTable('lote');
    if (!lote.publicado) {
        await db.query('ALTER TABLE lote ADD COLUMN publicado BOOLEAN NOT NULL DEFAULT FALSE');
        console.log('Migración: columna lote.publicado agregada (los lotes existentes quedan sin publicar)');
    }
    if (!lote.precio_kilo_final) {
        await db.query('ALTER TABLE lote ADD COLUMN precio_kilo_final DECIMAL(10,2) NULL');
        // Los lotes ya vendidos quedan como históricos: publicados y con el precio al que se vendieron
        await db.query(`
            UPDATE lote l INNER JOIN compra c ON c.id_lte = l.id_lte
            SET l.publicado = TRUE, l.precio_kilo_final = c.precio_kilo_final
            WHERE l.estado = 'VENDIDO'`);
        console.log('Migración: columna lote.precio_kilo_final agregada (los lotes vendidos conservan su precio histórico)');
    }

    // ---------- Usuario: rol COMPRADOR y codigo_cpr (FK UNIQUE, NULL para el personal) ----------
    const usuario = await qi.describeTable('usuario');
    if (!String(usuario.rol.type).includes('COMPRADOR')) {
        await db.query("ALTER TABLE usuario MODIFY rol ENUM('ADMINISTRADOR','EMPLEADO','COMPRADOR') NOT NULL DEFAULT 'EMPLEADO'");
        console.log('Migración: rol COMPRADOR agregado a usuario.rol');
    }
    if (!usuario.codigo_cpr) {
        await db.query('ALTER TABLE usuario ADD COLUMN codigo_cpr INT NULL UNIQUE');
        console.log('Migración: columna usuario.codigo_cpr agregada');
    }
    const fk = await uno(db, `
        SELECT COUNT(*) AS total FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuario'
          AND COLUMN_NAME = 'codigo_cpr' AND REFERENCED_TABLE_NAME = 'comprador'`);
    if (!Number(fk.total)) {
        await db.query(`ALTER TABLE usuario ADD CONSTRAINT usuario_codigo_cpr_fk FOREIGN KEY (codigo_cpr)
            REFERENCES comprador (codigo_cpr) ON DELETE RESTRICT ON UPDATE CASCADE`);
        console.log('Migración: llave foránea usuario.codigo_cpr -> comprador agregada');
    }

    // ---------- Restricciones SQL (CHECK) de las reglas de negocio ----------
    // La regla "COMPRADOR con codigo_cpr; personal sin él" NO puede ser CHECK en MariaDB porque
    // usuario.codigo_cpr tiene una FK con ON UPDATE CASCADE (error 1901). Se valida en el servidor:
    // models/Usuario.js (validate.rolYComprador) y los controladores fijan rol y codigo_cpr.
    const restricciones = [
        // Un lote publicado necesita precio final mayor que cero
        ['lote', 'lote_publicado_precio_chk', 'publicado = FALSE OR (precio_kilo_final IS NOT NULL AND precio_kilo_final > 0)']
    ];
    for (const [tabla, nombre, regla] of restricciones) {
        const existe = await uno(db, `
            SELECT COUNT(*) AS total FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = '${tabla}' AND CONSTRAINT_NAME = '${nombre}'`);
        if (Number(existe.total)) continue;
        const invalidos = await uno(db, `SELECT COUNT(*) AS total FROM ${tabla} WHERE NOT (${regla})`);
        if (Number(invalidos.total)) {
            console.warn(`Migración: NO se agregó ${nombre}; hay ${invalidos.total} registros de ${tabla} que no cumplen la regla. Revísalos y vuelve a ejecutar.`);
            continue;
        }
        await db.query(`ALTER TABLE ${tabla} ADD CONSTRAINT ${nombre} CHECK (${regla})`);
        console.log(`Migración: restricción ${nombre} agregada`);
    }
};
