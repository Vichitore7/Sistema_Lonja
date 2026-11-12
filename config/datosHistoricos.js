// Datos de prueba con fechas pasadas (octubre y noviembre de 2026): npm run datos:historicos
// Sirven para probar los reportes por rango de fechas, el historial y "Mis compras".
// Se pueden agregar a una base que ya tiene datos: no modifica ni borra registros existentes.
// Solo se ejecuta una vez (si ya existen los compradores de prueba, no hace nada).
// Usa los mismos servicios que la aplicación: publicarLote y comprarLote (con fecha simulada).
import { db, Tipo, Lote, Especie, Comprador, Usuario } from '../models/index.js';
import { publicarLote } from '../services/publicacionService.js';
import { comprarLote } from '../services/ventaService.js';

const DOMINIO = 'historico.lonja.mx'; // marca de los compradores de prueba
// "2026-10-03 09:15" en hora de Veracruz (UTC-6)
const fecha = (texto) => new Date(`${texto.replace(' ', 'T')}:00-06:00`);

const COMPRADORES = [
    { usuario: 'comprador_hist1', nombre: 'Miguel', apellido_paterno: 'Hernández', apellido_materno: 'Ruiz', direccion: 'Av. Independencia 210, Veracruz, Ver.' },
    { usuario: 'comprador_hist2', nombre: 'Sofía', apellido_paterno: 'Ramírez', apellido_materno: 'Castro', direccion: 'Calle Zaragoza 58, Boca del Río, Ver.' },
    { usuario: 'comprador_hist3', nombre: 'Jorge', apellido_paterno: 'Domínguez', apellido_materno: null, direccion: 'Blvd. Ávila Camacho 1450, Veracruz, Ver.' },
    { usuario: 'comprador_hist4', nombre: 'Patricia', apellido_paterno: 'Morales', apellido_materno: 'Vega', direccion: 'Col. Ricardo Flores Magón 33, Veracruz, Ver.' }
];
const PASSWORD = 'comprador123';

// lote: fecha de registro, kilos, cajas, precio de salida, especies [nombre, tipo]
// venta: precio final (publicación) | compra: [comprador (índice), fecha de la compra]
// fin: 'RETIRADO' para retirar el lote
const LOTES = [
    { f: '2026-10-01 06:30', kilos: 45, cajas: 9, salida: 85, esp: [['Huachinango', 'Pescado']], venta: 115, compra: [0, '2026-10-01 09:10'] },
    { f: '2026-10-01 06:45', kilos: 30, cajas: 6, salida: 140, esp: [['Camarón', 'Marisco']], venta: 175, compra: [1, '2026-10-01 10:25'] },
    { f: '2026-10-03 06:20', kilos: 22.5, cajas: 5, salida: 95, esp: [['Pulpo', 'Cefalópodos'], ['Calamar', 'Cefalópodos']], venta: 130, compra: [2, '2026-10-03 08:50'] },
    { f: '2026-10-08 06:10', kilos: 60, cajas: 12, salida: 70, esp: [['Mojarra', 'Pescado'], ['Sierra', 'Pescado']], venta: 92.5, compra: [0, '2026-10-08 11:40'] },
    { f: '2026-10-08 06:40', kilos: 18, cajas: 4, salida: 160, esp: [['Jaiba', 'Marisco']], venta: 150, compra: [3, '2026-10-09 07:55'] }, // precio final menor que la salida
    { f: '2026-10-15 06:15', kilos: 35, cajas: 7, salida: 110, esp: [['Robalo', 'Pescado']], venta: 145, compra: [1, '2026-10-15 09:30'] },
    { f: '2026-10-15 06:50', kilos: 12, cajas: 3, salida: 200, esp: [['Langostino', 'Marisco']], venta: 260, compra: [2, '2026-10-16 13:05'] },
    { f: '2026-10-22 06:05', kilos: 50, cajas: 10, salida: 80, esp: [['Peto', 'Pescado'], ['Jurel', 'Pescado']], venta: 99.9, compra: [3, '2026-10-22 10:00'] },
    { f: '2026-10-29 06:25', kilos: 27, cajas: 6, salida: 125, esp: [['Ostión', 'Marisco']], venta: 160, compra: [0, '2026-10-30 08:15'] },
    { f: '2026-11-03 06:35', kilos: 40, cajas: 8, salida: 90, esp: [['Mero', 'Pescado']], venta: 120, compra: [1, '2026-11-03 09:45'] },
    { f: '2026-11-05 06:15', kilos: 15, cajas: 3, salida: 180, esp: [['Pulpo', 'Cefalópodos']], venta: 210, compra: [2, '2026-11-06 23:50'] }, // al final del día: prueba el límite del rango
    { f: '2026-11-07 06:40', kilos: 33, cajas: 7, salida: 75, esp: [['Bagre', 'Pescado']], venta: 95, fin: 'RETIRADO' }, // publicado y luego retirado
    { f: '2026-11-09 06:20', kilos: 28, cajas: 6, salida: 105, esp: [['Cazón', 'Pescado'], ['Lisa', 'Pescado']], venta: 135 }, // a la venta, sin comprar
    { f: '2026-11-11 06:30', kilos: 20, cajas: 4, salida: 150, esp: [['Camarón', 'Marisco'], ['Jaiba', 'Marisco']], venta: 185 }, // a la venta, sin comprar
    { f: '2026-11-11 06:55', kilos: 42, cajas: 8, salida: 88, esp: [['Sierra', 'Pescado']] } // registrado, sin publicar
];

try {
    if (await Comprador.count({ where: { correo: `${COMPRADORES[0].usuario}@${DOMINIO}` } })) {
        console.log('Los datos históricos ya se cargaron antes; no se agrega nada.');
        await db.close();
        process.exit(0);
    }
    const ocupados = await Usuario.count({ where: { nombre_usuario: COMPRADORES.map((c) => c.usuario) } });
    if (ocupados) throw new Error('Ya existen usuarios comprador_hist*; no se puede cargar los datos históricos');

    // Tipos: se reutilizan si ya existen
    const tipos = {};
    for (const nombre of new Set(LOTES.flatMap((l) => l.esp.map(([, t]) => t)))) {
        const [tipo] = await Tipo.findOrCreate({ where: { nombre } });
        tipos[nombre] = tipo.id_tpo;
    }

    // Compradores con su cuenta (Comprador + Usuario en una transacción, como el registro público)
    const codigos = [];
    for (const c of COMPRADORES) {
        const codigo = await db.transaction(async (t) => {
            const comprador = await Comprador.create({
                nombre: c.nombre, apellido_paterno: c.apellido_paterno, apellido_materno: c.apellido_materno,
                direccion: c.direccion, correo: `${c.usuario}@${DOMINIO}`
            }, { transaction: t });
            await Usuario.create({ nombre_usuario: c.usuario, password: PASSWORD, rol: 'COMPRADOR', activo: true, codigo_cpr: comprador.codigo_cpr }, { transaction: t });
            return comprador.codigo_cpr;
        });
        codigos.push(codigo);
    }

    let compras = 0;
    for (const datos of LOTES) {
        const lote = await db.transaction(async (t) => {
            const nuevo = await Lote.create({
                kilos: datos.kilos, numero_cajas: datos.cajas, precio_kilo_salida: datos.salida,
                fecha: fecha(datos.f), estado: 'DISPONIBLE', publicado: false, precio_kilo_final: null
            }, { transaction: t });
            await Especie.bulkCreate(datos.esp.map(([nombre, tipo]) => ({ nombre, id_tpo: tipos[tipo], id_lte: nuevo.id_lte })), { transaction: t });
            return nuevo;
        });
        if (datos.venta) await publicarLote(lote.id_lte, datos.venta.toFixed(2));
        if (datos.compra) {
            const [indice, cuando] = datos.compra;
            await comprarLote(codigos[indice], lote.id_lte, { fecha: fecha(cuando) });
            compras++;
        }
        if (datos.fin === 'RETIRADO') await lote.reload().then((l) => l.update({ estado: 'RETIRADO', publicado: false }));
    }

    console.log(`Datos históricos creados: ${LOTES.length} lotes (${compras} vendidos, 2 a la venta, 1 sin publicar, 1 retirado), ` +
        `${compras} compras del 01/10/2026 al 06/11/2026 y ${COMPRADORES.length} compradores ` +
        `(${COMPRADORES.map((c) => c.usuario).join(', ')} / contraseña ${PASSWORD}).`);
    await db.close();
} catch (error) {
    console.error('Error al crear datos históricos:', error.message);
    process.exit(1);
}
