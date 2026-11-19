// Dibuja el PDF del reporte (un día o un rango de fechas) con PDFKit (colores del manual de identidad)
import PDFDocument from 'pdfkit';
import { formatoMoneda, formatoKg, formatoFechaHora, isoATexto, folio, nombreCompleto } from './formatos.js';

const C = { navy: '#0D3274', oscuro: '#092653', turquesa: '#2FA9A0', agua: '#E8F4F3', texto: '#20354A', secundario: '#607484', borde: '#DCE7EA' };

const COLUMNAS = [
    { titulo: 'Folio', ancho: 60, valor: (c) => folio(c.id_cmp) },
    { titulo: 'Comprador', ancho: 80, valor: (c) => folio(c.codigo_cpr) },
    { titulo: 'Nombre del comprador', ancho: 190, valor: (c) => nombreCompleto(c.comprador) },
    { titulo: 'Lote', ancho: 50, valor: (c) => folio(c.id_lte) },
    { titulo: 'Kilos', ancho: 80, alinear: 'right', valor: (c) => formatoKg(c.lote.kilos) },
    { titulo: 'Precio final/kg', ancho: 90, alinear: 'right', valor: (c) => formatoMoneda(c.precio_kilo_final) },
    { titulo: 'Importe', ancho: 100, alinear: 'right', valor: (c) => formatoMoneda(c.precio_total) },
    { titulo: 'Fecha y hora', ancho: 112, alinear: 'right', valor: (c) => formatoFechaHora(c.fecha) }
];

// Columnas del reporte personal del comprador: solo el precio TOTAL (nunca precio por kilo)
const COLUMNAS_COMPRADOR = [
    { titulo: 'Folio', ancho: 60, valor: (c) => folio(c.id_cmp) },
    { titulo: 'Lote', ancho: 50, valor: (c) => folio(c.id_lte) },
    { titulo: 'Especies', ancho: 250, valor: (c) => (c.lote.especies || []).map((e) => e.nombre).join(', ') },
    { titulo: 'Kilos', ancho: 80, alinear: 'right', valor: (c) => formatoKg(c.lote.kilos) },
    { titulo: 'Cajas', ancho: 50, alinear: 'right', valor: (c) => String(c.lote.numero_cajas) },
    { titulo: 'Total', ancho: 120, alinear: 'right', valor: (c) => formatoMoneda(c.precio_total) },
    { titulo: 'Fecha y hora', ancho: 152, alinear: 'right', valor: (c) => formatoFechaHora(c.fecha) }
];

const textoPeriodo = (desde, hasta) => {
    if (!desde) return 'Todo el historial de compras';
    return desde === hasta ? `Fecha: ${isoATexto(desde)} (día completo)` : `Del ${isoATexto(desde)} al ${isoATexto(hasta)} (fechas inclusive)`;
};

// Dibuja encabezado, tarjetas de totales y tabla. Lo usan el reporte del personal y el del comprador.
const dibujarReporte = (salida, { tituloDoc, titulo, lineas, tarjetas, columnas, compras, vacio }) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, info: { Title: tituloDoc, Author: 'Lonja Veracruz' } });
    doc.pipe(salida);
    const izquierda = 40;
    const anchoUtil = doc.page.width - 80;

    // Encabezado
    doc.rect(0, 0, doc.page.width, 70).fill(C.navy);
    doc.rect(0, 70, doc.page.width, 4).fill(C.turquesa);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text('Lonja Veracruz', izquierda, 18);
    doc.font('Helvetica').fontSize(10).text('Sistema de gestión comercial', izquierda, 42);
    doc.fontSize(9).text(`Generado: ${formatoFechaHora(new Date())}`, izquierda, 28, { width: anchoUtil, align: 'right' });

    doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(16).text(titulo, izquierda, 92);
    doc.fillColor(C.secundario).font('Helvetica').fontSize(10);
    lineas.forEach((linea, i) => doc.text(linea, izquierda, 114 + i * 14));
    const extra = (lineas.length - 1) * 14;

    // Tarjetas de totales
    const anchoTarjeta = (anchoUtil - (tarjetas.length - 1) * 10) / tarjetas.length;
    tarjetas.forEach(([etiqueta, valor], i) => {
        const x = izquierda + i * (anchoTarjeta + 10);
        doc.roundedRect(x, 136 + extra, anchoTarjeta, 52, 6).fillAndStroke(i === tarjetas.length - 1 ? C.agua : '#F3F8F9', C.borde);
        doc.fillColor(C.secundario).font('Helvetica').fontSize(9).text(etiqueta, x + 12, 145 + extra);
        doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(15).text(valor, x + 12, 161 + extra);
    });

    // Tabla
    let y = 208 + extra;
    const encabezado = () => {
        doc.rect(izquierda, y, anchoUtil, 22).fill(C.navy);
        let x = izquierda;
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
        for (const col of columnas) {
            doc.text(col.titulo, x + 6, y + 7, { width: col.ancho - 12, align: col.alinear || 'left' });
            x += col.ancho;
        }
        y += 22;
    };
    encabezado();

    if (compras.length === 0) {
        doc.fillColor(C.secundario).font('Helvetica').fontSize(11).text(vacio, izquierda, y + 16, { width: anchoUtil, align: 'center' });
    }

    compras.forEach((compra, i) => {
        if (y + 22 > doc.page.height - 50) {
            doc.addPage();
            y = 40;
            encabezado();
        }
        if (i % 2 === 1) doc.rect(izquierda, y, anchoUtil, 20).fill('#F3F8F9');
        let x = izquierda;
        doc.fillColor(C.texto).font('Helvetica').fontSize(9);
        for (const col of columnas) {
            doc.text(col.valor(compra), x + 6, y + 6, { width: col.ancho - 12, align: col.alinear || 'left', lineBreak: false, ellipsis: true });
            x += col.ancho;
        }
        y += 20;
        doc.moveTo(izquierda, y).lineTo(izquierda + anchoUtil, y).lineWidth(0.5).strokeColor(C.borde).stroke();
    });

    doc.end();
};

// Reporte del personal (todas las compras del periodo)
export const generarPdfReporte = ({ desde, hasta, totales, compras }, salida) => {
    const unDia = desde === hasta;
    dibujarReporte(salida, {
        tituloDoc: unDia ? `Reporte diario ${desde}` : `Reporte ${desde} al ${hasta}`,
        titulo: 'Reporte de compras por fechas',
        lineas: [textoPeriodo(desde, hasta)],
        tarjetas: [
            ['Número de compras', String(totales.compras)],
            ['Lotes vendidos', String(totales.lotes)],
            ['Kilos vendidos', formatoKg(totales.kilos)],
            ['Ingresos', formatoMoneda(totales.importe)]
        ],
        columnas: COLUMNAS,
        compras,
        vacio: `No se registraron compras ${unDia ? 'en esta fecha' : 'en este periodo'}. Los totales se muestran en cero.`
    });
};

// Reporte personal del comprador (solo sus compras; desde/hasta vacíos = todo el historial)
export const generarPdfComprador = ({ desde, hasta, totales, compras }, salida, comprador = null) => {
    dibujarReporte(salida, {
        tituloDoc: desde ? `Mis compras ${desde} al ${hasta}` : 'Mis compras',
        titulo: 'Reporte de mis compras',
        lineas: [textoPeriodo(desde, hasta), ...(comprador ? [`Comprador ${folio(comprador.codigo_cpr)}: ${nombreCompleto(comprador)}`] : [])],
        tarjetas: [
            ['Lotes comprados', String(totales.compras)],
            ['Kilos comprados', formatoKg(totales.kilos)],
            ['Total gastado', formatoMoneda(totales.importe)]
        ],
        columnas: COLUMNAS_COMPRADOR,
        compras,
        vacio: desde ? 'No hiciste compras en este periodo. Los totales se muestran en cero.' : 'Todavía no has comprado ningún lote.'
    });
};
