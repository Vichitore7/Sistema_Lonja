// Datos ilustrativos para probar el sistema: npm run datos:prueba
// Solo inserta si NO hay lotes registrados (no toca datos reales).
import { db, Tipo, Lote, Especie, Comprador, Usuario } from '../models/index.js';
import { publicarLote } from '../services/publicacionService.js';
import { comprarLote } from '../services/ventaService.js';

try {
    if (await Lote.count()) {
        console.log('Ya hay lotes registrados; no se insertan datos de prueba.');
        process.exit(0);
    }

    const tipos = {};
    for (const nombre of ['Pescado', 'Crustáceo', 'Molusco']) {
        const [tipo] = await Tipo.findOrCreate({ where: { nombre } });
        tipos[nombre] = tipo.id_tpo;
    }

    const lotes = [
        { kilos: 17, numero_cajas: 3, precio_kilo_salida: 100, especies: [['Camarón', 'Crustáceo'], ['Pulpo', 'Molusco']] },
        { kilos: 12.5, numero_cajas: 2, precio_kilo_salida: 95, especies: [['Sierra', 'Pescado']] },
        { kilos: 20, numero_cajas: 4, precio_kilo_salida: 85, especies: [['Mojarra', 'Pescado'], ['Robalo', 'Pescado']] },
        { kilos: 25, numero_cajas: 5, precio_kilo_salida: 120, especies: [['Huachinango', 'Pescado']] },
        { kilos: 10, numero_cajas: 2, precio_kilo_salida: 150, especies: [['Jaiba', 'Crustáceo']] }
    ];
    const creados = [];
    for (const datos of lotes) {
        const lote = await Lote.create({ ...datos, fecha: new Date() });
        await Especie.bulkCreate(datos.especies.map(([nombre, tipo]) => ({ nombre, id_tpo: tipos[tipo], id_lte: lote.id_lte })));
        creados.push(lote);
    }

    // El Administrador pone a la venta los lotes 1, 2 y 3 con su precio final (distinto del de salida)
    await publicarLote(creados[0].id_lte, '120.00');
    await publicarLote(creados[1].id_lte, '110.00');
    await publicarLote(creados[2].id_lte, '100.00');

    const ana = await Comprador.create({ nombre: 'Ana', apellido_paterno: 'López', apellido_materno: 'García', direccion: 'Av. Costera 123, Veracruz, Ver.', correo: 'ana.lopez@correo.com' });
    await Comprador.create({ nombre: 'Carlos', apellido_paterno: 'Pérez', apellido_materno: 'Martínez', direccion: 'Calle Marina 45, Boca del Río, Ver.', correo: 'carlos.perez@correo.com' });

    if (!(await Usuario.findOne({ where: { nombre_usuario: 'empleado01' } }))) {
        await Usuario.create({ nombre_usuario: 'empleado01', password: 'empleado123', rol: 'EMPLEADO' });
    }
    // Cuenta de comprador ligada a Ana, que compra el lote 1 desde el catálogo: 17 kg × $120.00 = $2,040.00
    if (!(await Usuario.findOne({ where: { nombre_usuario: 'comprador01' } }))) {
        await Usuario.create({ nombre_usuario: 'comprador01', password: 'comprador123', rol: 'COMPRADOR', codigo_cpr: ana.codigo_cpr });
    }
    await comprarLote(ana.codigo_cpr, creados[0].id_lte);
    console.log('Datos de prueba creados (3 tipos, 5 lotes, 3 publicados, 2 compradores, 1 compra, empleado01 / empleado123, comprador01 / comprador123).');
    await db.close();
} catch (error) {
    console.error('Error al crear datos de prueba:', error.message);
    process.exit(1);
}
