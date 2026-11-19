import { esFechaISO } from './formatos.js';

// Utilidades pequeñas y reutilizables
export const POR_PAGINA = 10;

// Lee ?pagina= y devuelve { pagina, limit, offset } (el cliente usa el mismo POR_PAGINA)
export const paginar = (query) => {
    const pagina = Math.max(1, parseInt(query.pagina, 10) || 1);
    return { pagina, limit: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA };
};

// "15" -> 15 ; cualquier otra cosa -> null
export const entero = (valor) => {
    const textoValor = String(valor ?? '').trim();
    if (!/^\d{1,9}$/.test(textoValor)) return null;
    const n = Number(textoValor);
    return n > 0 ? n : null;
};

export const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// Lee ?desde=&hasta= (fechas inclusive). Devuelve { desde, hasta, error }.
// Sin fechas no hay rango; con una sola se usa la misma para ambos extremos.
export const leerRango = (query) => {
    const hayDesde = query.desde !== undefined && query.desde !== '';
    const hayHasta = query.hasta !== undefined && query.hasta !== '';
    if (!hayDesde && !hayHasta) return { desde: '', hasta: '', error: null };
    if ((hayDesde && !esFechaISO(query.desde)) || (hayHasta && !esFechaISO(query.hasta))) {
        return { desde: '', hasta: '', error: 'Escribe fechas válidas para generar el reporte.' };
    }
    const desde = hayDesde ? query.desde : query.hasta;
    const hasta = hayHasta ? query.hasta : query.desde;
    if (desde > hasta) return { desde, hasta, error: 'La fecha inicial no puede ser posterior a la fecha final.' };
    return { desde, hasta, error: null };
};

