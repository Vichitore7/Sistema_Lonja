// Funciones puras de formato (se usan en controladores, vistas y PDF)
export const ZONA = 'America/Mexico_City';

const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const numero2 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatoMoneda = (valor) => moneda.format(Number(valor || 0));
// +$4,000.00 / -$150.00 (diferencia estimada entre total de oferta y valor de salida)
export const formatoDiferencia = (valor) => `${Number(valor) > 0 ? '+' : ''}${moneda.format(Number(valor || 0))}`;
export const formatoKg = (valor) => `${numero2.format(Number(valor || 0))} kg`;
export const formatoNumero = (valor) => numero2.format(Number(valor || 0));

// 1 -> "001"
export const folio = (id, largo = 3) => String(id ?? '').padStart(largo, '0');

const partesFecha = (fecha, opciones) =>
    new Intl.DateTimeFormat('es-MX', { timeZone: ZONA, ...opciones }).format(new Date(fecha));

// 10/11/2026
export const formatoFecha = (fecha) => fecha ? partesFecha(fecha, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
// 10/11/2026 14:35
export const formatoFechaHora = (fecha) => fecha ? partesFecha(fecha, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
// mar, 10 de noviembre de 2026
export const formatoFechaLarga = (fecha = new Date()) => {
    const texto = partesFecha(fecha, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// "YYYY-MM-DD" del día actual en México
export const hoyISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
// "YYYY-MM-DD" de una fecha en México
export const fechaISO = (fecha) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date(fecha));
// "2026-11-10" -> "10/11/2026" (sin conversión de zona)
export const isoATexto = (iso) => { const [a, m, d] = String(iso).split('-'); return `${d}/${m}/${a}`; };
export const esFechaISO = (texto) => /^\d{4}-\d{2}-\d{2}$/.test(texto || '') && !Number.isNaN(Date.parse(texto));

// Total en centavos para evitar errores de punto flotante: kilos × precio/kg
export const calcularTotal = (kilos, precioKilo) => {
    const kilosCent = Math.round(Number(kilos) * 100);
    const precioCent = Math.round(Number(precioKilo) * 100);
    return Math.round((kilosCent * precioCent) / 100) / 100;
};

export const nombreCompleto = (c) => c ? [c.nombre, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' ') : '';

export const ETIQUETA_ESTADO = { DISPONIBLE: 'Disponible', VENDIDO: 'Vendido', RETIRADO: 'Retirado' };
export const ICONO_ESTADO = { DISPONIBLE: 'circle-check', VENDIDO: 'receipt', RETIRADO: 'ban' };
