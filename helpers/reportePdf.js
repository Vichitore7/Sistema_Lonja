// Dibuja el PDF del reporte diario con PDFKit (colores del manual de identidad)
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

export const generarPdfDiario = ({ fecha, totales, compras }, salida) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, info: { Title: `Reporte diario ${fecha}`, Author: 'Lonja Veracruz' } });
    doc.pipe(salida);
    const izquierda = 40;
    const anchoUtil = doc.page.width - 80;

    // Encabezado
    doc.rect(0, 0, doc.page.width, 70).fill(C.navy);
    doc.rect(0, 70, doc.page.width, 4).fill(C.turquesa);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text('Lonja Veracruz', izquierda, 18);
    doc.font('Helvetica').fontSize(10).text('Sistema de gestión comercial', izquierda, 42);
    doc.fontSize(9).text(`Generado: ${formatoFechaHora(new Date())}`, izquierda, 28, { width: anchoUtil, align: 'right' });

    doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(16).text('Reporte diario de compras', izquierda, 92);
    doc.fillColor(C.secundario).font('Helvetica').fontSize(10).text(`Fecha consultada: ${isoATexto(fecha)}`, izquierda, 114);

    // Tarjetas de totales
    const tarjetas = [
        ['Número de compras', String(totales.compras)],
        ['Lotes vendidos', String(totales.lotes)],
        ['Kilos vendidos', formatoKg(totales.kilos)],
        ['Importe total', formatoMoneda(totales.importe)]
    ];
    const anchoTarjeta = (anchoUtil - 30) / 4;
    tarjetas.forEach(([etiqueta, valor], i) => {
        const x = izquierda + i * (anchoTarjeta + 10);
        doc.roundedRect(x, 136, anchoTarjeta, 52, 6).fillAndStroke(i === 3 ? C.agua : '#F3F8F9', C.borde);
        doc.fillColor(C.secundario).font('Helvetica').fontSize(9).text(etiqueta, x + 12, 145);
        doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(15).text(valor, x + 12, 161);
    });

    // Tabla
    let y = 208;
    const encabezado = () => {
        doc.rect(izquierda, y, anchoUtil, 22).fill(C.navy);
        let x = izquierda;
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
        for (const col of COLUMNAS) {
            doc.text(col.titulo, x + 6, y + 7, { width: col.ancho - 12, align: col.alinear || 'left' });
            x += col.ancho;
        }
        y += 22;
    };
    encabezado();

    if (compras.length === 0) {
        doc.fillColor(C.secundario).font('Helvetica').fontSize(11)
            .text('No se registraron compras en esta fecha. Los totales se muestran en cero.', izquierda, y + 16, { width: anchoUtil, align: 'center' });
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
        for (const col of COLUMNAS) {
            doc.text(col.valor(compra), x + 6, y + 6, { width: col.ancho - 12, align: col.alinear || 'left', lineBreak: false, ellipsis: true });
            x += col.ancho;
        }
        y += 20;
        doc.moveTo(izquierda, y).lineTo(izquierda + anchoUtil, y).lineWidth(0.5).strokeColor(C.borde).stroke();
    });

    doc.end();
};
