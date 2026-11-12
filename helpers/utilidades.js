// Utilidades pequeñas y reutilizables
export const POR_PAGINA = 10;

// Lee ?pagina= y devuelve { pagina, limit, offset }
export const paginar = (query) => {
    const pagina = Math.max(1, parseInt(query.pagina, 10) || 1);
    return { pagina, limit: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA };
};

// Datos para el partial de paginación
export const datosPaginacion = (total, pagina, query) => {
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries(query)) {
        if (clave !== 'pagina' && clave !== 'msg' && valor !== undefined && valor !== '') params.set(clave, valor);
    }
    const base = params.toString();
    const enlace = (p) => `?${base ? base + '&' : ''}pagina=${p}`;
    const desde = total ? (pagina - 1) * POR_PAGINA + 1 : 0;
    const hasta = Math.min(total, pagina * POR_PAGINA);
    return { total, pagina, paginas, enlace, desde, hasta };
};

// "15" -> 15 ; cualquier otra cosa -> null
export const entero = (valor) => {
    const textoValor = String(valor ?? '').trim();
    if (!/^\d{1,9}$/.test(textoValor)) return null;
    const n = Number(textoValor);
    return n > 0 ? n : null;
};

export const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');
